import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAuthConfig } from "@/lib/config/env";
import { ApiError } from "@/lib/api/errors";
import type { UserRole } from "@/lib/constants";

const authConfig = getAuthConfig();

/**
 * Better Auth server instance with email/password authentication.
 * The `role` field is exposed as a read-only additional field: sign-ups default
 * to MEMBER and only an administrator can promote a user.
 */
export const auth = betterAuth({
  secret: authConfig.secret,
  baseURL: authConfig.url,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    disableSignUp: false,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        input: false,
        defaultValue: "MEMBER",
      },
    },
  },
  advanced: {
    cookiePrefix: "resourcehub",
    defaultCookieAttributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  },
});

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: UserRole;
};

export async function getSession(requestHeaders?: Headers) {
  return auth.api.getSession({
    headers: requestHeaders ?? (await headers()),
  });
}

/**
 * Returns the signed-in user with a fresh role from the database.
 * Falls back to `null` when there is no session or the account is gone.
 */
export async function getCurrentUser(
  requestHeaders?: Headers,
): Promise<CurrentUser | null> {
  const session = await getSession(requestHeaders);

  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, image: true, role: true },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role as UserRole,
  };
}

/** Route/action guard: throws 401 when unauthenticated. */
export async function requireUser(
  requestHeaders?: Headers,
): Promise<CurrentUser> {
  const user = await getCurrentUser(requestHeaders);

  if (!user) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "You must be signed in to do this.",
    );
  }

  return user;
}

/** Route/action guard: throws 403 when the caller is not an administrator. */
export async function requireAdmin(
  requestHeaders?: Headers,
): Promise<CurrentUser> {
  const user = await requireUser(requestHeaders);

  if (user.role !== "ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "Administrator access is required.");
  }

  return user;
}

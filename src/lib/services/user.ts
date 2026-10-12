import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { LIST_LIMITS } from "@/lib/constants";
import { badRequest, notFound, ApiError } from "@/lib/api/errors";
import type { ListUsersQuery } from "@/lib/validations";
import type { PagedResult } from "@/lib/types";

export type { CurrentUser } from "@/lib/auth";

const userSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type UserRecord = Prisma.UserGetPayload<{ select: typeof userSelect }>;

export async function listUsers(
  params: ListUsersQuery,
): Promise<PagedResult<UserRecord>> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(
    LIST_LIMITS.maxPageSize,
    Math.max(1, Math.floor(params.pageSize ?? LIST_LIMITS.defaultPageSize)),
  );

  const where: Prisma.UserWhereInput = {};

  if (params.role) where.role = params.role;

  if (params.search?.trim()) {
    const query = params.search.trim();
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: userSelect,
    }),
  ]);

  return {
    data: rows,
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  };
}

export async function updateUserRole(id: string, role: "ADMIN" | "MEMBER") {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!user) throw notFound("User not found.");

  return prisma.user.update({
    where: { id },
    data: { role },
    select: userSelect,
  });
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });
  if (!user) throw notFound("User not found.");
  return user;
}

export function assertRole(
  value: unknown,
): asserts value is "ADMIN" | "MEMBER" {
  if (value !== "ADMIN" && value !== "MEMBER") {
    throw badRequest("Invalid role.", "VALIDATION");
  }
}

export async function isAdmin(id: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });

  return user?.role === "ADMIN";
}

/** Guards an actor against demoting the last administrator. */
export async function assertNotLastAdmin(
  actorId: string,
  targetId: string,
  nextRole: "ADMIN" | "MEMBER",
) {
  if (targetId === actorId && nextRole === "MEMBER") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new ApiError(
        409,
        "LAST_ADMIN",
        "You cannot demote the last administrator.",
      );
    }
  }
}

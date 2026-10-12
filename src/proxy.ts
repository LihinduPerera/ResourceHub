import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const AUTH_PATHS = ["/sign-in", "/sign-up"];

/**
 * Next.js Proxy (the Next.js 16 successor to Middleware).
 *
 * Optimistic auth guard: redirects unauthenticated visitors away from
 * protected pages and sends signed-in users away from the auth pages.
 * Full authorization always happens again on the server, close to the data.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never touch API routes or static assets.
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: "resourcehub",
  });

  if (AUTH_PATHS.includes(pathname)) {
    if (sessionCookie) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    if (pathname !== "/") {
      signInUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

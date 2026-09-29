import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

/**
 * Coarse, cookie-presence-only route guard.
 *
 * Authoritative authentication and role checks live in the `/employee` and
 * `/admin` layouts and are re-verified inside every Server Action, because a
 * proxy matcher can silently skip Server Function calls. This layer exists only
 * to avoid flashing protected content and to keep logged-in users off /login.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (pathname === "/login") {
    if (hasSessionCookie) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const isProtectedArea = pathname.startsWith("/employee") || pathname.startsWith("/admin");
  if (isProtectedArea && !hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    if (search) loginUrl.search = search;
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

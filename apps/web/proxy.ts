import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@agentflow/types";

/**
 * Optimistic gate: no session cookie at all → straight to /login, remembering where the user
 * was headed. A cookie being *present* proves nothing; the dashboard layout verifies it.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE_NAME)) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agents/:path*",
    "/workflows/:path*",
    "/runs/:path*",
    "/tools/:path*",
    "/knowledge/:path*",
    "/integrations/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/help/:path*",
  ],
};

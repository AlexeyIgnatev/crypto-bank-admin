import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/_next",
  "/favicon.ico",
  "/aml-test-rules.json",
  "/api/auth",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasAccess = Boolean(req.cookies.get("accessToken")?.value);
  const hasRefresh = Boolean(req.cookies.get("refreshToken")?.value);
  if (!hasAccess && !hasRefresh) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";

    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

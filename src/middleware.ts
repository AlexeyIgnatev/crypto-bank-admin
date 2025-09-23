import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/_next",
  "/favicon.ico",
  "/api/login",
  "/api/logout",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public assets and the login/logout endpoints
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isAuthed = req.cookies.get("admin_auth")?.value === "1";
  if (!isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // Preserve the original destination for optional use later
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

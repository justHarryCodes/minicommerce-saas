import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") ?? "";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "awarizonmall.com";

  // ── Subdomain detection ──────────────────────────────────────────
  const isSubdomain =
    hostname.endsWith(`.${rootDomain}`) &&
    !hostname.startsWith("www.") &&
    !hostname.startsWith("localhost");

  if (isSubdomain) {
    const subdomain = hostname.replace(`.${rootDomain}`, "");
    const url = req.nextUrl.clone();
    url.pathname = `/store/${subdomain}${req.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  // ── Main domain routes ───────────────────────────────────────────
  const { pathname } = req.nextUrl;

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard")) {
    const session = req.cookies.get("session");
    if (!session?.value) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Let landing page handle its own logic
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Redirect /onboarding if no session
  if (pathname === "/onboarding") {
    const session = req.cookies.get("session");
    if (!session?.value) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};

import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") ?? "";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "awarizon.shop";

  // ── Subdomain detection ──────────────────────────────────────────
  const isSubdomain =
    hostname.endsWith(`.${rootDomain}`) &&
    !hostname.startsWith("www.") &&
    !hostname.startsWith("localhost");

  if (isSubdomain) {
    const subdomain = hostname.replace(`.${rootDomain}`, "");
    const { pathname } = req.nextUrl;

    // Guard: client-side Next.js navigation (RSC fetches) already contains the
    // store prefix because internal links use /store/{slug}/... paths.
    // Without this check the middleware would double-rewrite and produce
    // /store/{slug}/store/{slug}/... → 404.
    if (pathname.startsWith(`/store/${subdomain}`)) {
      const res = NextResponse.next();
      res.headers.set("x-store-slug", subdomain);
      return res;
    }

    const url = req.nextUrl.clone();
    url.pathname = `/store/${subdomain}${pathname}`;
    const res = NextResponse.rewrite(url);
    res.headers.set("x-store-slug", subdomain);
    return res;
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

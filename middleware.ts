import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // x-forwarded-host is the original hostname Vercel's edge preserves on
  // wildcard domains — host can be normalised to the primary domain.
  const hostname =
    (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "")
      .split(":")[0]  // strip port if present (e.g. localhost:3000)
      .toLowerCase();
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "awarizon.shop").toLowerCase();

  // ── Subdomain detection ──────────────────────────────────────────
  const isSubdomain =
    hostname.endsWith(`.${rootDomain}`) &&
    !hostname.startsWith("www.") &&
    !hostname.startsWith("localhost");

  if (isSubdomain) {
    const subdomain = hostname.slice(0, hostname.length - rootDomain.length - 1);
    const { pathname } = req.nextUrl;

    // Enrich request headers so server components can detect store context
    const reqHeaders = new Headers(req.headers);
    reqHeaders.set("x-store-slug", subdomain);
    reqHeaders.set("x-is-subdomain", "1");

    // API routes live at the root — never rewrite them, just forward headers.
    if (pathname.startsWith("/api/")) {
      return NextResponse.next({ request: { headers: reqHeaders } });
    }

    // Guard: path already has the store prefix (client RSC fetch after Link click).
    // Skip rewrite — serve the internal path directly, just forward the headers.
    if (pathname.startsWith(`/store/${subdomain}`)) {
      return NextResponse.next({ request: { headers: reqHeaders } });
    }

    // Rewrite: deeluxify.awarizon.shop/products/abc → /store/deeluxify/products/abc
    const url = req.nextUrl.clone();
    url.pathname = `/store/${subdomain}${pathname}`;
    return NextResponse.rewrite(url, { request: { headers: reqHeaders } });
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

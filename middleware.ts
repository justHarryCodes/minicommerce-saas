import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Cloudflare Worker fast path ──────────────────────────────────
  // If the CF Worker already parsed the subdomain and injected headers,
  // trust them directly (verified by shared secret).
  const workerSecret = req.headers.get("x-worker-secret");
  const workerSlug   = req.headers.get("x-store-slug");
  const expectedSecret = process.env.WORKER_SECRET;

  if (workerSlug && expectedSecret && workerSecret === expectedSecret) {
    const reqHeaders = new Headers(req.headers);
    reqHeaders.set("x-is-subdomain", "1");

    if (pathname.startsWith("/api/")) {
      return NextResponse.next({ request: { headers: reqHeaders } });
    }
    if (pathname.startsWith(`/store/${workerSlug}`)) {
      return NextResponse.next({ request: { headers: reqHeaders } });
    }

    const url = req.nextUrl.clone();
    url.pathname = `/store/${workerSlug}${pathname}`;
    return NextResponse.rewrite(url, { request: { headers: reqHeaders } });
  }

  // ── Hostname-based subdomain detection (Vercel wildcard / Coolify) ──
  // x-forwarded-host preserves the original subdomain on Vercel wildcard domains.
  const hostname =
    (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "")
      .split(":")[0]
      .toLowerCase();
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "awarizon.shop").toLowerCase();

  const isSubdomain =
    hostname.endsWith(`.${rootDomain}`) &&
    !hostname.startsWith("www.") &&
    !hostname.startsWith("localhost");

  if (isSubdomain) {
    const subdomain = hostname.slice(0, hostname.length - rootDomain.length - 1);

    const reqHeaders = new Headers(req.headers);
    reqHeaders.set("x-store-slug", subdomain);
    reqHeaders.set("x-is-subdomain", "1");

    // API routes live at the root — never rewrite them, just forward headers.
    if (pathname.startsWith("/api/")) {
      return NextResponse.next({ request: { headers: reqHeaders } });
    }

    // Guard: path already has the store prefix (client RSC fetch after Link click).
    if (pathname.startsWith(`/store/${subdomain}`)) {
      return NextResponse.next({ request: { headers: reqHeaders } });
    }

    // Rewrite: blessingstore.awarizon.shop/products/abc → /store/blessingstore/products/abc
    const url = req.nextUrl.clone();
    url.pathname = `/store/${subdomain}${pathname}`;
    return NextResponse.rewrite(url, { request: { headers: reqHeaders } });
  }

  // ── Main domain routes ───────────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    const session = req.cookies.get("session");
    if (!session?.value) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === "/") return NextResponse.next();

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

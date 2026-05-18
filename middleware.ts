import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "awarizon.shop")
  .toLowerCase()
  .replace(/^www\./, "");

// ── Helpers ──────────────────────────────────────────────────────────────────

function getHostname(req: NextRequest) {
  const raw = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  return raw.split(",")[0].trim().split(":")[0].toLowerCase();
}

function getStoreSlug(hostname: string): string | null {
  if (
    !hostname.endsWith(`.${ROOT_DOMAIN}`) ||
    hostname.startsWith("www.") ||
    hostname.startsWith("localhost")
  ) return null;
  return hostname.slice(0, -(ROOT_DOMAIN.length + 1)); // strip ".rootDomain"
}

function isAuthenticated(req: NextRequest) {
  return !!req.cookies.get("session")?.value;
}

function redirectToLogin(req: NextRequest, pathname: string) {
  const url = new URL("/auth/login", req.url);
  url.searchParams.set("redirect", pathname);
  return NextResponse.redirect(url);
}

// ── Middleware ────────────────────────────────────────────────────────────────

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = getHostname(req);
  const slug = getStoreSlug(hostname);

  // ── Storefront (subdomain) requests ──────────────────────────────────────
  // deeluxify.awarizon.shop/** → internally served as /store/deeluxify/**
  // Same view admins see at www.awarizon.shop/store/deeluxify
  if (slug) {
    const headers = new Headers(req.headers);
    headers.set("x-store-slug", slug);
    headers.set("x-is-subdomain", "1");

    // API calls: forward headers, no rewrite
    if (pathname.startsWith("/api/")) {
      return NextResponse.next({ request: { headers } });
    }

    // Already rewritten (RSC fetch after a Link click): pass through
    if (pathname.startsWith(`/store/${slug}/`) || pathname === `/store/${slug}`) {
      return NextResponse.next({ request: { headers } });
    }

    // Rewrite subdomain → /store/[slug] (same route admins use)
    const url = req.nextUrl.clone();
    if (process.env.NODE_ENV === "production") url.hostname = `www.${ROOT_DOMAIN}`;
    url.pathname = `/store/${slug}${pathname}`;
    return NextResponse.rewrite(url, { request: { headers } });
  }

  // ── Main domain: protected routes ─────────────────────────────────────────
  const isProtected =
    pathname.startsWith("/dashboard") || pathname === "/onboarding";

  if (isProtected && !isAuthenticated(req)) {
    return redirectToLogin(req, pathname);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
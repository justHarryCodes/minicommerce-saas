import { NextRequest, NextResponse } from "next/server";

// Use ROOT_DOMAIN (no NEXT_PUBLIC_) for server/edge runtime — available at
// runtime, not baked in at build time like NEXT_PUBLIC_ vars.
const ROOT_DOMAIN = (
  process.env.ROOT_DOMAIN ??
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ??
  "dukanigeria.com"
).toLowerCase().replace(/^www\./, "");

// ── Helpers ──────────────────────────────────────────────────────────────────

function getHostname(req: NextRequest): string {
  const raw = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  return raw.split(",")[0].trim().split(":")[0].toLowerCase();
}

function getStoreSlug(hostname: string): string | null {
  if (
    !hostname.endsWith(`.${ROOT_DOMAIN}`) ||
    hostname.startsWith("www.") ||
    hostname.startsWith("localhost")
  ) return null;
  return hostname.slice(0, -(ROOT_DOMAIN.length + 1));
}

function isAuthenticated(req: NextRequest): boolean {
  return !!req.cookies.get("session")?.value;
}

function redirectToLogin(req: NextRequest, pathname: string) {
  const url = new URL("/auth/login", req.url);
  url.searchParams.set("redirect", pathname);
  return NextResponse.redirect(url);
}

// Middleware runs on every single request (matcher below excludes only
// static assets), so this logging — which includes request headers and
// hostnames — must never ship to production logs unconditionally.
function devLog(message: string): void {
  if (process.env.NODE_ENV === "development") console.log(message);
}

// ── Middleware ────────────────────────────────────────────────────────────────
//
// This file MUST live at src/middleware.ts, not at the project root — this
// project uses the src/ directory convention (src/app/...), and Next.js
// only looks for middleware at src/middleware.ts in that case. A duplicate
// middleware.ts previously sat at the project root and was silently
// ignored entirely: every edit made to it had zero effect in production,
// which is why subdomain routing stayed broken through several rounds of
// fixes there. That stray file has been deleted.

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = getHostname(req);
  const slug = getStoreSlug(hostname);

  devLog([
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `[MW] REQUEST          : ${req.method} ${pathname}`,
    `[MW] x-forwarded-host : ${req.headers.get("x-forwarded-host") ?? "MISSING"}`,
    `[MW] host             : ${req.headers.get("host") ?? "MISSING"}`,
    `[MW] resolved hostname: ${hostname}`,
    `[MW] ROOT_DOMAIN      : ${ROOT_DOMAIN}`,
    `[MW] slug detected    : ${slug ?? "NONE"}`,
    `[MW] NODE_ENV         : ${process.env.NODE_ENV}`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ].join("\n"));

  // ── Storefront (subdomain) requests ──────────────────────────────────────
  // In production this is normally already handled upstream by the
  // Cloudflare Worker (cloudflare-worker/subdomain-proxy.js), which
  // translates <slug>.ROOT_DOMAIN/... to /store/<slug>/... before the
  // request ever reaches this app. This stays as a second line of defense
  // for any request that reaches the app directly (local dev, the Worker
  // being bypassed, DNS pointed straight here, etc).
  if (slug) {
    const headers = new Headers(req.headers);
    headers.set("x-store-slug", slug);
    headers.set("x-is-subdomain", "1");
    headers.set("x-pathname", pathname);

    if (pathname.startsWith("/api/")) {
      return NextResponse.next({ request: { headers } });
    }

    if (pathname.startsWith(`/store/${slug}/`) || pathname === `/store/${slug}`) {
      return NextResponse.next({ request: { headers } });
    }

    // NextResponse.rewrite() (an invisible, same-request internal
    // re-route) does not survive this deployment's reverse-proxy chain —
    // confirmed live, the rewritten pathname never took effect on any
    // path. NextResponse.redirect() (a real HTTP 3xx) does work reliably,
    // so subdomain routing here uses a real redirect. The request that
    // follows lands on /store/<slug>/..., which matches the "already
    // rewritten" guard above and passes straight through.
    const url = req.nextUrl.clone();
    url.pathname = `/store/${slug}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // ── Main domain: protected routes ─────────────────────────────────────────
  const isProtected =
    pathname.startsWith("/dashboard") || pathname === "/onboarding";

  if (isProtected && !isAuthenticated(req)) {
    return redirectToLogin(req, pathname);
  }

  // Expose pathname to server components via headers() — dashboard/layout.tsx
  // and others read this.
  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};

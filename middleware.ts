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
  return hostname.slice(0, -(ROOT_DOMAIN.length + 1));
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

  const xForwardedHost = req.headers.get("x-forwarded-host") ?? "MISSING";
  const hostHeader     = req.headers.get("host") ?? "MISSING";
  const rawHost        = xForwardedHost !== "MISSING" ? xForwardedHost : hostHeader;
  const hostname       = getHostname(req);
  const slug           = getStoreSlug(hostname);

  // ── Step-by-step diagnostic log ──────────────────────────────────────────
  console.log([
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `[MW] REQUEST: ${req.method} ${pathname}`,
    `[MW] x-forwarded-host : ${xForwardedHost}`,
    `[MW] host             : ${hostHeader}`,
    `[MW] resolved hostname: ${hostname}`,
    `[MW] ROOT_DOMAIN      : ${ROOT_DOMAIN}`,
    `[MW] endsWith check   : ${hostname.endsWith(`.${ROOT_DOMAIN}`)}`,
    `[MW] starts www?      : ${hostname.startsWith("www.")}`,
    `[MW] starts localhost?: ${hostname.startsWith("localhost")}`,
    `[MW] slug detected    : ${slug ?? "NONE — will hit main domain logic"}`,
    `[MW] NODE_ENV         : ${process.env.NODE_ENV}`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ].join("\n"));

  // ── Storefront (subdomain) requests ──────────────────────────────────────
  if (slug) {
    const headers = new Headers(req.headers);
    headers.set("x-store-slug", slug);
    headers.set("x-is-subdomain", "1");

    // API calls: forward headers, no rewrite
    if (pathname.startsWith("/api/")) {
      console.log(`[MW] → API passthrough for slug="${slug}" path="${pathname}"`);
      return NextResponse.next({ request: { headers } });
    }

    // Already rewritten (RSC fetch after a Link click): pass through
    if (pathname.startsWith(`/store/${slug}/`) || pathname === `/store/${slug}`) {
      console.log(`[MW] → Already rewritten, passthrough slug="${slug}" path="${pathname}"`);
      return NextResponse.next({ request: { headers } });
    }

    // Rewrite subdomain → /store/[slug]
    const url = req.nextUrl.clone();
    const targetHostname = process.env.NODE_ENV === "production"
      ? `www.${ROOT_DOMAIN}`
      : hostname;
    url.hostname = targetHostname;
    url.pathname = `/store/${slug}${pathname === "/" ? "" : pathname}`;

    console.log([
      `[MW] → REWRITING subdomain request`,
      `[MW]   slug        : ${slug}`,
      `[MW]   from path   : ${pathname}`,
      `[MW]   to path     : ${url.pathname}`,
      `[MW]   to hostname : ${url.hostname}`,
      `[MW]   full url    : ${url.toString()}`,
    ].join("\n"));

    return NextResponse.rewrite(url, { request: { headers } });
  }

  // ── Main domain: protected routes ─────────────────────────────────────────
  const isProtected =
    pathname.startsWith("/dashboard") || pathname === "/onboarding";

  if (isProtected && !isAuthenticated(req)) {
    console.log(`[MW] → Redirecting to login from "${pathname}"`);
    return redirectToLogin(req, pathname);
  }

  console.log(`[MW] → Main domain passthrough hostname="${hostname}" path="${pathname}"`);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
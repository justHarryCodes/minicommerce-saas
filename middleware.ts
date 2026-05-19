import { NextRequest, NextResponse } from "next/server";

// Use ROOT_DOMAIN (no NEXT_PUBLIC_) for server/edge runtime — available at
// runtime, not baked in at build time like NEXT_PUBLIC_ vars.
const ROOT_DOMAIN = (
  process.env.ROOT_DOMAIN ??
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ??
  "awarizon.shop"
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

// ── Middleware ────────────────────────────────────────────────────────────────

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = getHostname(req);
  const slug = getStoreSlug(hostname);

  // ── Boot log — confirms ROOT_DOMAIN resolved correctly ───────────────────
  console.log([
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `[MW] REQUEST          : ${req.method} ${pathname}`,
    `[MW] x-forwarded-host : ${req.headers.get("x-forwarded-host") ?? "MISSING"}`,
    `[MW] host             : ${req.headers.get("host") ?? "MISSING"}`,
    `[MW] resolved hostname: ${hostname}`,
    `[MW] ROOT_DOMAIN      : ${ROOT_DOMAIN}`,
    `[MW] ROOT_DOMAIN env  : ${process.env.ROOT_DOMAIN ?? "NOT SET"} / NEXT_PUBLIC: ${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "NOT SET"}`,
    `[MW] endsWith check   : ${hostname.endsWith(`.${ROOT_DOMAIN}`)}`,
    `[MW] starts www?      : ${hostname.startsWith("www.")}`,
    `[MW] starts localhost?: ${hostname.startsWith("localhost")}`,
    `[MW] slug detected    : ${slug ?? "NONE"}`,
    `[MW] NODE_ENV         : ${process.env.NODE_ENV}`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ].join("\n"));

  // ── Storefront (subdomain) requests ──────────────────────────────────────
  if (slug) {
    const headers = new Headers(req.headers);
    headers.set("x-store-slug", slug);
    headers.set("x-is-subdomain", "1");

    if (pathname.startsWith("/api/")) {
      console.log(`[MW] → API passthrough slug="${slug}" path="${pathname}"`);
      return NextResponse.next({ request: { headers } });
    }

    if (pathname.startsWith(`/store/${slug}/`) || pathname === `/store/${slug}`) {
      console.log(`[MW] → Already rewritten, passthrough slug="${slug}" path="${pathname}"`);
      return NextResponse.next({ request: { headers } });
    }

    const url = req.nextUrl.clone();
    if (process.env.NODE_ENV === "production") url.hostname = `www.${ROOT_DOMAIN}`;
    url.pathname = `/store/${slug}${pathname === "/" ? "" : pathname}`;

    console.log([
      `[MW] → REWRITING`,
      `[MW]   slug     : ${slug}`,
      `[MW]   from     : ${pathname}`,
      `[MW]   to       : ${url.pathname}`,
      `[MW]   hostname : ${url.hostname}`,
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
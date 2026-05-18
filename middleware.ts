import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Normalise — always bare domain, never www-prefixed
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "awarizon.shop")
    .toLowerCase()
    .replace(/^www\./, "");

  // ── Subdomain detection ──────────────────────────────────────────
  // x-forwarded-host may contain multiple comma-separated values from
  // intermediate proxies — take only the first entry.
  const rawHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";

  const hostname = rawHost.split(",")[0].trim().split(":")[0].toLowerCase();

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

    // Guard: path already has the store prefix (client RSC fetch after Link
    // click). Use a slash boundary to avoid prefix-collision bugs where
    // subdomain "foo" would incorrectly match "/store/foobar/…".
    if (
      pathname.startsWith(`/store/${subdomain}/`) ||
      pathname === `/store/${subdomain}`
    ) {
      return NextResponse.next({ request: { headers: reqHeaders } });
    }

    // Rewrite to www.<rootDomain> so Vercel treats it as a true internal
    // rewrite. Using the bare rootDomain risks hitting an external
    // apex→www redirect which breaks the rewrite chain.
    const url = req.nextUrl.clone();
    if (process.env.NODE_ENV === "production") {
      url.hostname = `www.${rootDomain}`;
    }
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
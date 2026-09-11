/**
 * Cloudflare Worker — subdomain proxy for dukanigeria.com
 *
 * Deployed to a Worker route: *.dukanigeria.com/*
 * Forwards each vendor-subdomain request to the main Hostinger origin,
 * translating the clean subdomain path directly to /store/<slug>/... itself.
 *
 * That translation is done HERE, in the Worker, rather than left to the
 * Next.js app's own middleware.ts (which also has subdomain-detection
 * logic) — confirmed live that middleware's rewrite/redirect does not
 * reliably fire behind this deployment's reverse-proxy chain, so every
 * path except the homepage (which has its own unrelated page-level
 * fallback) was silently 404ing. Doing the translation in the Worker
 * fixes every path uniformly, and — as a proxy rather than a redirect —
 * keeps the visitor's URL bar clean (no visible /store/<slug> jump).
 *
 * Set these Worker secrets in the Cloudflare dashboard if you want the
 * shared-secret hardening (unused by the app today, safe to leave unset):
 *   WORKER_SECRET  — any random string, must match WORKER_SECRET in your .env
 *   VERCEL_HOST    — override target origin hostname; defaults to ROOT_DOMAIN
 */

const ROOT_DOMAIN = "dukanigeria.com";

// Paths that must reach the origin completely unprefixed: API routes
// (which already take the vendor slug as an explicit URL segment, not via
// the hostname) and Next.js's own internal static/image asset paths.
function shouldSkipPrefix(pathname) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/public/")
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();

    const isSubdomain =
      hostname.endsWith(`.${ROOT_DOMAIN}`) &&
      !hostname.startsWith("www.");

    if (!isSubdomain) {
      return fetch(request);
    }

    const subdomain = hostname.slice(0, hostname.length - ROOT_DOMAIN.length - 1);

    // Forward to the Hostinger origin
    const targetUrl = new URL(request.url);
    targetUrl.hostname = env.VERCEL_HOST ?? ROOT_DOMAIN;

    if (!shouldSkipPrefix(targetUrl.pathname) && !targetUrl.pathname.startsWith(`/store/${subdomain}`)) {
      targetUrl.pathname = `/store/${subdomain}${targetUrl.pathname === "/" ? "" : targetUrl.pathname}`;
    }

    const newHeaders = new Headers(request.headers);
    newHeaders.set("x-store-slug", subdomain);
    newHeaders.set("x-is-subdomain", "1");
    newHeaders.set("x-forwarded-host", hostname);
    newHeaders.set("x-worker-secret", env.WORKER_SECRET ?? "");
    // Keep the original host so the origin's own domain-based logic (if
    // any) still sees a hostname it recognizes.
    newHeaders.set("host", env.VERCEL_HOST ?? ROOT_DOMAIN);

    return fetch(new Request(targetUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: "manual",
    }));
  },
};

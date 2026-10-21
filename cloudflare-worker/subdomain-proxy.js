/**
 * Cloudflare Worker — storefront proxy for dukanigeria.com
 *
 * Handles two kinds of storefront hostnames:
 *   1. Vendor subdomains            <slug>.dukanigeria.com
 *   2. Merchant custom domains      shop.theirbrand.com   (Cloudflare for SaaS
 *      custom hostnames — see CUSTOM_DOMAINS.md for the zone setup)
 *
 * Deployed to Worker routes:  *.dukanigeria.com/*  and  * /*  (the catch-all
 * route is what receives custom-hostname traffic on a SaaS zone).
 *
 * Forwards each storefront request to the main Hostinger origin, translating
 * the clean path to /store/<slug>/... itself.
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
 * Worker secrets (Cloudflare dashboard):
 *   WORKER_SECRET  — must match WORKER_SECRET in the app's .env; sent on every
 *                    proxied request and required by /api/domains/resolve
 *   VERCEL_HOST    — override target origin hostname; defaults to ROOT_DOMAIN
 */

const ROOT_DOMAIN = "dukanigeria.com";
const RESOLVE_TTL = 300; // seconds a hostname → store mapping is cached
const MISS_TTL = 60; // seconds an unknown hostname is cached as unknown

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

function isPlatformHost(hostname) {
  return hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`;
}

/** Custom hostname → store slug, via the app, cached at the edge. */
async function resolveCustomHost(hostname, env, ctx) {
  const origin = env.VERCEL_HOST ?? ROOT_DOMAIN;
  const cacheKey = new Request(`https://${ROOT_DOMAIN}/__domain-cache/${hostname}`);
  const cache = caches.default;

  const hit = await cache.match(cacheKey);
  if (hit) return (await hit.json()).slug ?? null;

  let slug = null;
  try {
    const res = await fetch(`https://${origin}/api/domains/resolve?host=${encodeURIComponent(hostname)}`, {
      headers: { "x-worker-secret": env.WORKER_SECRET ?? "", host: origin },
    });
    if (res.ok) slug = (await res.json()).slug ?? null;
    else if (res.status !== 404) return null; // origin trouble — don't cache a false miss
  } catch {
    return null;
  }

  ctx.waitUntil(
    cache.put(
      cacheKey,
      new Response(JSON.stringify({ slug }), {
        headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${slug ? RESOLVE_TTL : MISS_TTL}` },
      })
    )
  );
  return slug;
}

function notConnected(hostname) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Store not found</title>
<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fafafa;color:#18181b">
<div style="text-align:center;padding:24px"><h1 style="font-size:22px;margin:0 0 8px">This store isn't set up yet</h1>
<p style="color:#71717a;margin:0">${hostname.replace(/[<>&"]/g, "")} isn't connected to a Duka store (or is still being verified).</p>
<p style="margin-top:20px"><a href="https://${ROOT_DOMAIN}" style="color:#18181b;font-weight:600">Go to Duka →</a></p></div></body>`,
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();

    if (isPlatformHost(hostname)) {
      return fetch(request);
    }

    let slug;
    let isCustomDomain = false;
    if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
      slug = hostname.slice(0, hostname.length - ROOT_DOMAIN.length - 1);
    } else {
      slug = await resolveCustomHost(hostname, env, ctx);
      if (!slug) return notConnected(hostname);
      isCustomDomain = true;
    }

    // Forward to the Hostinger origin
    const targetUrl = new URL(request.url);
    targetUrl.hostname = env.VERCEL_HOST ?? ROOT_DOMAIN;

    if (!shouldSkipPrefix(targetUrl.pathname) && !targetUrl.pathname.startsWith(`/store/${slug}`)) {
      targetUrl.pathname = `/store/${slug}${targetUrl.pathname === "/" ? "" : targetUrl.pathname}`;
    }

    const newHeaders = new Headers(request.headers);
    newHeaders.set("x-store-slug", slug);
    // Same clean, prefix-less links for subdomains and custom domains
    newHeaders.set("x-is-subdomain", "1");
    if (isCustomDomain) newHeaders.set("x-custom-domain", hostname);
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

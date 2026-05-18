/**
 * Cloudflare Worker — subdomain proxy for awarizon.shop
 *
 * Deploy this to a Worker route: *.awarizon.shop/*
 * It injects x-store-slug + x-is-subdomain headers and forwards
 * the request to the main Vercel deployment.
 *
 * Set these Worker secrets in the Cloudflare dashboard:
 *   WORKER_SECRET  — any random string, must match WORKER_SECRET in your .env
 *   VERCEL_HOST    — your Vercel deployment URL, e.g. awarizon.shop
 */

const ROOT_DOMAIN = "awarizon.shop";

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

    // Forward to the Vercel deployment on the root domain
    const targetUrl = new URL(request.url);
    targetUrl.hostname = env.VERCEL_HOST ?? ROOT_DOMAIN;

    const newHeaders = new Headers(request.headers);
    newHeaders.set("x-store-slug", subdomain);
    newHeaders.set("x-is-subdomain", "1");
    newHeaders.set("x-forwarded-host", hostname);
    newHeaders.set("x-worker-secret", env.WORKER_SECRET ?? "");
    // Keep the original host so Vercel routes it correctly
    newHeaders.set("host", env.VERCEL_HOST ?? ROOT_DOMAIN);

    return fetch(new Request(targetUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: "manual",
    }));
  },
};

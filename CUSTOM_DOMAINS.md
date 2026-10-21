# Custom domains — one-time platform setup

Merchants on Pro can connect their own domain (e.g. `shop.theirbrand.com`) from
**Settings → Custom domain**. This uses **Cloudflare for SaaS (custom hostnames)**
on the `dukanigeria.com` zone: Cloudflare verifies each domain and issues its SSL
certificate automatically; the Worker in `cloudflare-worker/subdomain-proxy.js`
maps the domain to the right store.

Until the steps below are done, the Settings section simply shows "coming soon".

## How a request flows

```
shop.theirbrand.com  (merchant's CNAME → stores.dukanigeria.com)
  ↓ Cloudflare for SaaS terminates SSL for the custom hostname
  ↓ Worker (catch-all route) asks the app: GET /api/domains/resolve?host=shop.theirbrand.com
  ↓ app answers { slug: "theirbrand" } (cached at the edge for 5 min)
  ↓ Worker proxies to the origin as /store/theirbrand/... (same as subdomains)
```

## 1. Fallback origin

1. In the `dukanigeria.com` zone add a DNS record for the CNAME target merchants
   will point at, **proxied** (orange cloud):

   | Type | Name     | Content                     | Proxy   |
   |------|----------|-----------------------------|---------|
   | A    | `stores` | *your Hostinger server IP*  | Proxied |

2. **SSL/TLS → Custom Hostnames → Enable Cloudflare for SaaS**, then set
   **Fallback Origin** to `stores.dukanigeria.com` and wait for it to show *Active*.

## 2. Worker route

Add a second route to the existing Worker so custom-hostname traffic reaches it:

| Route | Worker |
|-------|--------|
| `*.dukanigeria.com/*` (existing) | subdomain-proxy |
| `*/*` (new — catch-all for custom hostnames) | subdomain-proxy |

Re-deploy `cloudflare-worker/subdomain-proxy.js` (it now handles custom hostnames
and passes `dukanigeria.com` / `www.` straight through).

Set the Worker secret **`WORKER_SECRET`** to a long random string.

## 3. App environment

```dotenv
CLOUDFLARE_API_TOKEN=   # API token with Zone → SSL and Certificates → Edit on dukanigeria.com
CLOUDFLARE_ZONE_ID=     # Zone ID (Overview page, right column)
CUSTOM_DOMAIN_TARGET=stores.dukanigeria.com
WORKER_SECRET=          # same value as the Worker secret
```

## Pricing & limits

Cloudflare for SaaS includes 100 custom hostnames on the Free/Pro plans, then
charges per hostname per month — check the current price in the Cloudflare
dashboard before rolling out widely. Custom domains are Pro-only in the app.

## What merchants do

1. Settings → Custom domain → enter `shop.theirbrand.com` → **Connect domain**.
2. At their DNS host, add **CNAME `shop` → `stores.dukanigeria.com`**.
3. Click **Check status** — usually live within minutes (sometimes a few hours).

Bare domains (`theirbrand.com`) need a DNS host with CNAME flattening / ALIAS
support (Cloudflare, DNSimple, …); otherwise connect `www.theirbrand.com`.

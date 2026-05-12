# ShopForge — Subdomain Setup Guide

This guide walks you through setting up subdomain-based storefronts so each merchant
gets their own URL like `deluxify.shopforge.com` instead of `shopforge.com/store/deluxify`.

---

## How It Works

When a customer visits `deluxify.shopforge.com`, the middleware detects the subdomain,
extracts `deluxify`, and internally rewrites the request to `/store/deluxify` — all
transparently. The URL in the browser stays as `deluxify.shopforge.com`.

```
deluxify.shopforge.com
  ↓ middleware detects subdomain "deluxify"
  ↓ rewrites to /store/deluxify internally
  ↓ storefront loads normally
  ↓ URL stays deluxify.shopforge.com ✓
```

No database changes are needed. The merchant's `slug` is used as the subdomain.

---

## Step 1 — Environment Variable

Add this to your `.env.local` (or production env vars):

```dotenv
NEXT_PUBLIC_ROOT_DOMAIN=shopforge.com
```

For local development, leave this as-is — the middleware skips subdomain detection
on `localhost` automatically.

---

## Step 2 — DNS Configuration

You need a **wildcard DNS record** so that any subdomain points to your server.

### If hosting on Vercel

1. Go to your Vercel project → **Settings** → **Domains**
2. Add `shopforge.com` (your root domain)
3. Add `*.shopforge.com` (wildcard for all subdomains)
4. Vercel will give you nameservers or CNAME records to add

### If hosting on a VPS / custom server

Log into your DNS provider (Cloudflare, Namecheap, GoDaddy, etc.) and add:

| Type  | Name | Value              | TTL  |
|-------|------|--------------------|------|
| A     | @    | your.server.ip     | Auto |
| A     | *    | your.server.ip     | Auto |
| CNAME | www  | shopforge.com      | Auto |

The `*` wildcard A record catches all subdomains — `deluxify.shopforge.com`,
`amaka.shopforge.com`, `store123.shopforge.com`, etc.

### If using Cloudflare (recommended)

Cloudflare is the best option — free SSL, DDoS protection, and fast DNS propagation.

1. Add your domain to Cloudflare (free plan works)
2. Add these records:

| Type | Name | Content        | Proxy    |
|------|------|----------------|----------|
| A    | @    | your.server.ip | Proxied  |
| A    | *    | your.server.ip | Proxied  |

> ⚠️ Make sure the wildcard record is also **Proxied** (orange cloud), not DNS-only.

---

## Step 3 — SSL Certificate

### Vercel
Wildcard SSL is handled automatically by Vercel for `*.shopforge.com`. Nothing to do.

### VPS with Nginx + Certbot

Run this to get a wildcard SSL certificate:

```bash
sudo certbot certonly \
  --manual \
  --preferred-challenges dns \
  -d shopforge.com \
  -d "*.shopforge.com"
```

Certbot will ask you to add a TXT DNS record to verify domain ownership.
Add it in your DNS provider, wait 60 seconds, then continue.

Your Nginx config should look like:

```nginx
server {
    listen 443 ssl;
    server_name *.shopforge.com shopforge.com;

    ssl_certificate     /etc/letsencrypt/live/shopforge.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shopforge.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name *.shopforge.com shopforge.com;
    return 301 https://$host$request_uri;
}
```

> Critical: `proxy_set_header Host $host;` — this passes the subdomain to Next.js
> so the middleware can read it correctly.

---

## Step 4 — Verify Middleware

Make sure your `middleware.ts` has the subdomain detection at the top:

```ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") ?? "";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "shopforge.com";

  const isSubdomain =
    hostname.endsWith(`.${rootDomain}`) &&
    !hostname.startsWith("www.") &&
    !hostname.startsWith("localhost");

  if (isSubdomain) {
    const subdomain = hostname.replace(`.${rootDomain}`, "");
    const url = req.nextUrl.clone();
    url.pathname = `/store/${subdomain}${req.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  // ... rest of your middleware
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)" ],
};
```

---

## Step 5 — Test It

### Local testing (optional)

Edit your Windows `hosts` file at `C:\Windows\System32\drivers\etc\hosts`:

```
127.0.0.1   teststore.localhost
```

Then visit `http://teststore.localhost:3000` — the middleware won't activate
(because it checks for your root domain), but you can test by temporarily
hardcoding a slug in the middleware for debugging.

### Production testing

1. Create a store with slug `teststore` in your app
2. Visit `https://teststore.shopforge.com`
3. You should see the storefront

---

## Will I Ever Hit a Subdomain Limit?

**Short answer: No — there is no practical limit.**

Here's a breakdown by provider:

### DNS — Unlimited
DNS wildcard records (`*.shopforge.com`) cover ALL subdomains automatically.
You don't register each subdomain individually. One DNS record = infinite subdomains.

### SSL — Unlimited with wildcard cert
A wildcard SSL certificate (`*.shopforge.com`) covers ALL subdomains under one domain.
- Vercel: handles this for you automatically, no limit
- Certbot: one wildcard cert covers everything

### Vercel — No subdomain limit
Vercel's wildcard domain feature covers unlimited subdomains. You add `*.shopforge.com`
once and every subdomain is routed automatically. No per-subdomain setup needed.

### Your App — Limited only by your database
Each subdomain maps to a `slug` in your `stores` table. The only limit is:
- Your database capacity (PostgreSQL can hold millions of rows easily)
- Your server/hosting plan (more traffic = more compute needed)

### Practical limits to be aware of

| Concern              | Limit          | Notes                                      |
|----------------------|----------------|--------------------------------------------|
| DNS wildcard         | Unlimited      | One record covers all                      |
| SSL (wildcard cert)  | Unlimited      | One cert covers all `*.shopforge.com`      |
| Vercel subdomains    | Unlimited      | Wildcard covers all                        |
| Database stores      | Millions       | PostgreSQL handles this easily             |
| Free Vercel plan     | 100 GB traffic | Upgrade if you grow                        |
| Certbot renewal      | Every 90 days  | Auto-renew with cron, covers all subs      |

### The only real limit
If you ever let merchants use **custom domains** (e.g. `shop.amaka.com` instead of
`amaka.shopforge.com`), each custom domain would need its own SSL certificate and
DNS setup. That's a more complex feature but platforms like Vercel support it via
their API.

---

## Troubleshooting

**Subdomain shows 404**
- Check DNS has propagated: `nslookup teststore.shopforge.com`
- Make sure the wildcard A record exists and is not DNS-only on Cloudflare

**Subdomain shows wrong page**
- Check `NEXT_PUBLIC_ROOT_DOMAIN` matches your actual domain exactly
- Check the store slug in your database matches the subdomain

**SSL error on subdomain**
- On Vercel: make sure `*.shopforge.com` is added as a domain in project settings
- On VPS: make sure your Nginx `server_name` includes `*.shopforge.com`

**Works on desktop, not mobile**
- DNS propagation can take up to 24 hours — wait and retry

**Localhost subdomain testing**
- Subdomains don't work on `localhost` by default
- Use a service like [localtunnel](https://theboroer.github.io/localtunnel-www/)
  or [ngrok](https://ngrok.com) to expose your local server with a real domain for testing

---

## Summary Checklist

- [ ] `NEXT_PUBLIC_ROOT_DOMAIN=shopforge.com` in env vars
- [ ] Wildcard A record `* → your.server.ip` in DNS
- [ ] Domain added to Vercel (or Nginx configured on VPS)
- [ ] Wildcard SSL certificate active
- [ ] Middleware subdomain detection in place
- [ ] Test: create a store, visit `slug.shopforge.com`
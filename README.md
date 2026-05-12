# ShopForge 🛒

Multi-tenant storefront SaaS — merchants create a branded online store in minutes. Each store gets its own public URL (`/store/[slug]`), product catalogue, category tree, order management, and payment processing via Paystack or manual bank transfer.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, RSC) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Auth | Firebase Authentication + session cookies |
| Database | PostgreSQL (via `pg`) |
| Cache | Redis (via `ioredis`) |
| Payments | Paystack + bank transfer |
| Images | Cloudinary (unsigned upload preset) |
| State | Zustand (cart, persisted per store) |

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Firebase project (Authentication enabled)
- Cloudinary account (free tier fine)
- Paystack account (test keys work)

### 2. Install

```bash
git clone <repo>
cd storefront-saas
npm install
cp .env.example .env.local
# Fill in all values in .env.local
```

### 3. Database

```bash
psql -U postgres -c "CREATE DATABASE shopforge;"
psql -U postgres -d shopforge -f schema.sql
```

### 4. Firebase setup

1. Create a Firebase project → enable **Email/Password** auth
2. Generate a **service account key** (Project Settings → Service Accounts → Generate new private key)
3. Paste the values into `.env.local` (`FIREBASE_ADMIN_*`)
4. Copy the web SDK config into the `NEXT_PUBLIC_FIREBASE_*` vars

### 5. Cloudinary

1. Create an **unsigned upload preset** named `shopforge` (or change `CLOUDINARY_UPLOAD_PRESET`)
2. Set `CLOUDINARY_CLOUD_NAME`

### 6. Run

```bash
npm run dev
```

---

## URL Structure

| Path | Description |
|---|---|
| `/` | Landing page |
| `/auth/signup` | Merchant registration |
| `/auth/login` | Merchant login |
| `/onboarding` | Store creation wizard (3 steps) |
| `/dashboard` | Merchant dashboard — overview |
| `/dashboard/products` | Product management |
| `/dashboard/categories` | Category management |
| `/dashboard/orders` | Order management |
| `/dashboard/settings` | Store settings + theme |
| `/store/[slug]` | Public storefront |
| `/store/[slug]/products/[productSlug]` | Product detail page |
| `/store/[slug]/checkout` | Checkout page |

---

## API Routes

### Auth
- `POST /api/auth/session` — create session cookie from Firebase ID token
- `POST /api/auth/logout` — clear session cookie

### Stores (merchant)
- `POST /api/stores` — create store
- `GET /api/stores` — get own store
- `PATCH /api/stores/[storeId]` — update store settings
- `GET /api/stores/slug-check?slug=` — check slug availability

### Products (merchant)
- `GET /api/products` — list own products
- `POST /api/products` — create product
- `PATCH /api/products/[productId]` — update product
- `DELETE /api/products/[productId]` — delete product

### Categories (merchant)
- `GET /api/categories` — list categories with subs
- `POST /api/categories` — create category or subcategory
- `PATCH /api/categories/[categoryId]` — rename category
- `DELETE /api/categories/[categoryId]` — delete category

### Orders (merchant)
- `GET /api/orders` — list orders (with items)
- `GET /api/orders/[orderId]` — single order
- `PATCH /api/merchant/orders/[orderId]` — update order/payment status

### Storefront (public)
- `GET /api/storefront/[slug]` — store + products + categories (cached)
- `POST /api/storefront/[slug]/orders` — place order

### Payments
- `POST /api/paystack/initialize` — start Paystack transaction
- `GET /api/paystack/callback` — Paystack redirect after payment
- `POST /api/paystack/webhook` — Paystack webhook (HMAC verified)

### Uploads
- `POST /api/upload` — upload image to Cloudinary (auth required)

---

## Architecture Notes

- **Multi-tenancy:** All DB queries scoped by `store_id`. Stores identified by slug in URL.
- **Auth:** Firebase client auth → ID token → `POST /api/auth/session` creates a 14-day session cookie → server components verify via Firebase Admin `verifySessionCookie`.
- **Caching:** Redis `getOrSet` pattern for store meta (5m), products (2m), categories (10m). Cache busted on mutation.
- **Categories:** Self-referencing `categories` table with `parent_id`. Max 2 levels (category + subcategory).
- **Cart:** Zustand `persist` middleware, stored in `localStorage` per `storeId`. No server-side cart.
- **Payments:**
  - **Paystack:** Initialize → redirect to Paystack → callback → verify → mark paid
  - **Bank transfer:** Order placed, status `pending` → merchant manually confirms → mark `paid`
- **Images:** Cloudinary unsigned upload preset. `POST /api/upload` forwards to Cloudinary and returns `secure_url`.
- **Theme:** Each store has `storefront_accent_color` (hex). Derived light/dark variants injected as CSS vars (`--sf-accent`, `--sf-accent-light`, `--sf-accent-dark`) on `.storefront` wrapper.

---

## Deploying

### Vercel (recommended)

```bash
npm i -g vercel
vercel
# Add all env vars in Vercel dashboard
```

### Database

Use [Neon](https://neon.tech) (serverless Postgres) or [Supabase](https://supabase.com) for zero-config managed Postgres.

### Redis

Use [Upstash](https://upstash.com) for serverless Redis (free tier available). Set `REDIS_URL` to the Upstash Redis URL.

### Paystack Webhook

In your Paystack dashboard, set the webhook URL to:
```
https://your-domain.com/api/paystack/webhook
```

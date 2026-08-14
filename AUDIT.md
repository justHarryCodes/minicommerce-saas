# ShopForge (storefront-saas) — Codebase Audit

Audited: 2026-08-14. Read-only pass over `shopforge-saas/storefront-saas`. Git history: 50 most recent commits, mostly single-word `update` messages (no PR/feature-branch discipline visible) plus five recent, descriptive commits about mobile nav, image optimization, and product discovery.

## 1. Product summary

ShopForge (internal/production name **Awarizon**, live at `awarizon.shop` and legacy `awarizonmall.com`) is a multi-tenant e-commerce SaaS for Nigerian merchants: sign up, get a branded storefront at `/store/[slug]` (or a wildcard subdomain, `slug.awarizon.shop`), list products, and take orders paid via Paystack or manual bank transfer. It is materially bigger than the README describes. The README documents a lean four-table CRUD app (stores/products/categories/orders); the actual codebase adds a full admin back office, an affiliate-marketer referral program with payouts, tiered paid plans (Free/Pro/Business) enforced via a setup-fee-then-subscription funnel, AI-assisted product descriptions and a storefront chat assistant (Groq + Gemini), a TikTok-style "Reels" shoppable video feed with a cross-store Discover page, coupons, product reviews, visitor analytics, a referral-credit system, NIN (Nigerian national ID) verification for KYC, and a companion mobile app (the sibling `duka-vendors` project) served by dedicated `/api/mobile/*` endpoints and Expo push notifications. The product is best described as "Shopify-for-Nigerian-SMEs with a built-in affiliate growth engine and social-commerce video feed," not the "storefront generator" the README markets. It is a working, deployed product (real bank account seeded in `platform_bank_accounts`, Sentry configured, live CSP headers) rather than a demo.

## 2. Stack and architecture

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, React 18, RSC + client components) |
| Language | TypeScript (strict), Node ≥20.9 |
| Styling | Tailwind CSS v3 (not v4 as README claims) + `tailwind-merge`, `framer-motion` |
| Auth | Firebase Authentication (client) → session cookie (server, via `firebase-admin`) |
| Database | PostgreSQL via raw `pg` (no ORM) — hand-written SQL everywhere |
| Cache | Redis via `ioredis`, `getOrSet` pattern |
| Payments | Paystack (card) + manual bank transfer |
| Images/video | Cloudinary (unsigned upload preset + server-side transforms) |
| AI | Groq (`llama-3.3-70b-versatile`, text) + Gemini (`gemini-2.0-flash`, vision) — both optional, feature-detected at runtime |
| Error tracking | Sentry (`@sentry/nextjs`), inactive until `SENTRY_DSN` set |
| State | Zustand (cart; per-store, `localStorage`-persisted) |
| Forms/validation | `react-hook-form` + `zod` on nearly every API route |
| Edge routing | Custom Next.js `middleware.ts` for subdomain routing, **plus** a standalone Cloudflare Worker (`cloudflare-worker/subdomain-proxy.js`) doing the same job |
| Deploy target | Vercel (per README/CI comments); migrations run as a `prebuild` step (`scripts/run-migrations.mjs && next build`) |

Single Next.js monolith, no monorepo/workspace packages, no separate backend service — API routes under `src/app/api/**` are the entire backend. Top-level layout:

```
storefront-saas/
├── src/app/            # App Router: pages + all API routes (see §4/§8)
│   ├── admin/          # Internal ops back office (vendors, plans, affiliates, transfers, settings)
│   ├── affiliate/      # Separate portal for affiliate marketers (own login/session)
│   ├── api/            # ~85 route handlers — the entire backend
│   ├── dashboard/       # Merchant-facing app (products, orders, billing, reels, coupons…)
│   ├── discover/        # Public cross-store social-commerce feed
│   ├── onboarding/      # 3-step store-creation wizard
│   ├── store/[slug]/    # Public storefront (product list, PDP, checkout, order tracking, reels)
│   └── auth/            # Merchant signup/login/forgot-password
├── src/components/      # dashboard/, storefront/, ui/ — no top-level design-system package
├── src/lib/             # db, redis, auth, admin-auth, affiliate-auth, plan, billing-fulfillment,
│                         # paystack, cloudinary, reels, push, rate-limit, recaptcha, ai/
├── migrations/           # 4 newer, hand-run SQL migrations (Postgres, idempotent `IF NOT EXISTS`)
├── scripts/              # 17 older migrations + the migration runner + 3 one-off inspection scripts
├── cloudflare-worker/    # Standalone Worker script for subdomain proxying (see §14)
├── tests/                # 2 Vitest files — billing fulfillment + Paystack webhook only
└── schema.sql            # Root "canonical" schema — itself stale, see §3
```

## 3. Data model

Schema is defined incrementally across `schema.sql` + 4 files in `migrations/` + 17 files in `scripts/*-migration.sql`, applied in a hard-coded order by `scripts/run-migrations.mjs` (tracked in a `schema_migrations` table). There is **no single authoritative schema file** — the real schema is the union of all of these, in the order the runner lists them.

| Table | Purpose | Key fields | Relationships |
|---|---|---|---|
| `stores` | Tenant root — one per merchant | `owner_id` (Firebase UID, unique), `slug`, `status`, `subscription_status`, `current_plan_id`, `nin_number`/`nin_verified`, `banner_images[]`, `featured_product_ids[]`, `storefront_*` theme cols, `referral_code`, `referred_by_store_id`, `referred_by_affiliate_id` | Owns categories/products/orders/reels/coupons/reviews; self-referential via `referred_by_store_id` |
| `categories` | 2-level category tree | `parent_id` self-FK, `UNIQUE(store_id, slug, parent_id)` + a partial unique index for top-level slugs | `stores`, self-join |
| `products` | Catalogue | `price`, `stock_quantity`, `images[]`, `is_featured`, `sort_order` | `stores`, `categories` (category + subcategory FKs) |
| `orders` / `order_items` | Checkout + line items | `payment_method`, `payment_status`, `order_status`, `coupon_code`, `discount_amount`, both `total` and `total_amount` (see below) | `stores`, `products` (nullable, `SET NULL` on delete) |
| `admin_users` | Internal staff | `role` (`super_admin`/`admin`), auto-seeded from `ADMIN_EMAILS` env on first login | — |
| `platform_settings` | Global feature-flag/config KV store (JSONB) | e.g. `require_setup_fee`, `require_plan_subscription`, `reels_monthly_limit` | Read by `admin-auth.ts` on every gated request |
| `subscription_payments` | Billing ledger | `type` (`setup_fee`/`monthly`/`plan`), `payment_status`, `plan_id` | `stores`, `plans` |
| `admin_audit_log` | Admin action trail | `action`, `target_type/id`, `details` JSONB | Free-text `target_id`, no FK |
| `plans` | Pricing tiers | `price_monthly`, `max_products`, `max_reels`; seeded Free(0)/Pro(5000)/Business(17000) | `stores.current_plan_id` |
| `store_visits` | Daily-deduped visitor analytics | `UNIQUE(store_id, visitor_id, visited_at)` | `stores` |
| `platform_bank_accounts` | Bank details shown for manual-transfer billing | Seeded with a real "Awarizon Ltd" account | — |
| `coupons` | Per-store discount codes | `discount_type` %/fixed, `max_uses`/`uses_count` | `stores` |
| `reviews` | Product reviews | `is_approved` (moderation flag) | `products`, `stores` |
| `referrals` | Store→store referral tracking | `status` signed_up/rewarded | `stores` × 2 |
| `affiliates` / `affiliate_referrals` / `affiliate_payouts` | Independent marketer program | earnings/payout balances, bank details, Firebase or password auth | `stores`, self |
| `reels` / `reel_products` / `reel_views` | Shoppable video | Cloudinary IDs, view/share counts, `is_featured` | `stores`, `products` (M:N via `reel_products`) |
| `vendor_push_tokens` | Expo push tokens for the mobile app | `UNIQUE(firebase_uid)` | `stores` |
| `vendor_notifications` | In-app/mobile notification feed | `type`, `data` JSONB, `is_read` | `stores` |
| `schema_migrations` | Migration tracking (auto-created by the runner) | — | — |

**Data-model oddities worth flagging:**
- `scripts/schema.sql` is a **stale, unused schema draft** — it models a `users` table with `stores.user_id`, which the real app never uses (the app uses `stores.owner_id` = Firebase UID directly, no `users` table exists). It is not referenced by `run-migrations.mjs`. Vestigial; risks confusing a new developer into thinking a `users` table exists.
- `orders.total` vs `orders.total_amount`: `total_amount` was added later as an "alias" column, backfilled once, but both columns are live in the type system (`src/types/index.ts`) and code reads from both — a denormalization that invites drift.
- `migrations/add_uncategorized_category.sql` is **not registered** in `scripts/run-migrations.mjs`'s `MIGRATIONS` list — it will never run via `npm run db:migrate` / the build step. Either dead code or a deploy gap (see §13).
- Three separate migrations (`payment-security-migration.sql`, `bank-accounts-dedup.sql`, `plans-dedup-migration.sql`, `orders-payment-method-fix.sql`) exist solely to repair CHECK constraints and duplicate rows caused by earlier migrations/app bugs — a live history of production incidents, not just schema evolution.
- `nin_verified` is set to `false` by the merchant-facing `PATCH /api/stores/nin` route on every submission (correctly, pending review) and only flipped to `true` by the admin `verify_nin` action — verification flow is real, not stubbed, but there's no notification back to the merchant when it's approved/rejected (no email/push found).

## 4. Feature inventory

### Merchant onboarding & storefront setup
| Feature | Where it lives | State | Notes |
|---|---|---|---|
| 3-step onboarding wizard | `src/app/onboarding/page.tsx` | Complete | Live slug-availability check, referral-code capture from `?ref=` |
| Store settings (theme, payment prefs, banners) | `src/app/dashboard/settings`, `SettingsClient.tsx` | Complete | Accent color → light/dark CSS var derivation via `chroma-js` |
| Storefront customization (banner slider, featured products, font, card style) | `src/app/dashboard/storefront`, `theme-presets.ts` | Complete | |
| Category/subcategory management | `dashboard/categories`, `CategoryManager.tsx`, `api/categories`, `api/subcategories` | Complete | Max 2 levels enforced by schema |
| Onboarding checklist / tutorial banner | `OnboardingChecklist.tsx`, `TutorialBanner.tsx` | Complete | |

### Catalogue & orders
| Feature | Where it lives | State | Notes |
|---|---|---|---|
| Product CRUD, image upload | `dashboard/products/*`, `api/products` | Complete | Cloudinary unsigned preset |
| Product AI description assist | `api/ai/product-description`, `src/lib/ai/groq.ts` | Complete, feature-flagged | Disabled unless `GROQ_API_KEY` set; `api/ai/status` gates the UI |
| Product photo → category suggestion | `api/ai/suggest-category`, `src/lib/ai/gemini.ts` | Complete, feature-flagged | Vision-only, needs `GEMINI_API_KEY` |
| Public storefront (PDP, catalogue) | `store/[slug]/**` | Complete | |
| Cart | `CartProvider.tsx`, Zustand `persist` | Complete | Client-only, no server cart |
| Checkout (Paystack + bank transfer) | `store/[slug]/checkout`, `api/storefront/[slug]/orders` | Complete | |
| Order management + status updates | `dashboard/orders`, `api/merchant/orders/[orderId]`, `OrderStatusManager.tsx` | Complete | |
| Order tracking (public, no login) | `store/[slug]/track` | Complete | |
| Coupons | `dashboard/coupons`, `api/stores/coupons`, `api/storefront/[slug]/coupons/validate` | Complete, **Pro-gated** | `requirePro()` guard |
| Product reviews (customer-submitted, merchant-moderated) | `dashboard/reviews`, `api/dashboard/reviews`, `api/storefront/[slug]/reviews` | Complete | `is_approved` moderation flag |
| Data export (JSON dump) | `api/dashboard/export` | Complete | Single unauthenticated-format JSON download, all store data |
| Search (storefront) | `api/storefront/[slug]/search`, `SearchOverlay.tsx` | Complete | ILIKE-based, no full-text index |

### Reels / social commerce
| Feature | Where it lives | State | Notes |
|---|---|---|---|
| Reel upload + product tagging | `dashboard/reels`, `api/reels`, `api/reels/upload-signature` | Complete, **plan-limited** | `max_reels` per plan |
| Public reel feed (per-store + cross-store Discover) | `store/[slug]/reels`, `discover/`, `api/discover/reels` | Complete | Fisher-Yates + round-robin interleave so no store dominates |
| Reel view/share tracking | `api/reels/[reelId]/view`, `reel_views` table | Complete | Session-id based, lightweight |
| Mobile discover feed | `api/mobile/discover` | Complete | Serves the `duka-vendors` app |

### Billing & growth
| Feature | Where it lives | State | Notes |
|---|---|---|---|
| Setup fee → subscription funnel | `api/billing/setup-fee`, `subscribe`, `verify`, `lib/billing-fulfillment.ts` | Complete but **being phased out** | `freemium-migration.sql` disabled `require_setup_fee` platform-wide in favor of instant Free-tier signup; old code paths remain live/reachable |
| Plan subscription (Free/Pro/Business) | `api/billing/subscribe-plan`, `lib/plan.ts` | Complete | `getEffectivePlan()` falls back to Free on expiry rather than hard-blocking |
| Bank-transfer billing (pay platform via bank) | `api/billing/transfer`, `admin/transfers` | Complete | Admin manually approves via `admin/transfers/TransfersClient.tsx` |
| Referral program (store→store) | `dashboard/referral`, `api/stores` referral fields, `lib/billing-fulfillment.ts` | Complete | 1 free month to referrer on referred store's setup-fee payment — **but setup fee is largely disabled now (see above), so this reward path may rarely fire** |
| Affiliate marketer program | `affiliate/**`, `api/affiliate/**`, `api/admin/affiliates` | Complete | Separate login (password or Google/Firebase), own payout request flow, admin approval |
| NIN (KYC) verification | `api/stores/nin`, admin `verify_nin`/`reject_nin` | Complete | Gated by `require_nin_verification` platform setting, default off |

### Admin back office
| Feature | Where it lives | State | Notes |
|---|---|---|---|
| Vendor management (suspend/restrict/confirm/NIN) | `admin/vendors`, `api/admin/vendors` | Complete | Every action writes to `admin_audit_log` |
| Plan management | `admin/plans`, `api/admin/plans` | Complete | |
| Platform settings / feature flags | `admin/settings`, `api/admin/settings` | Complete | |
| Bank account management (platform's own) | `api/admin/bank-accounts` | Complete | |
| Manual transfer approval | `admin/transfers` | Complete | |
| Affiliate admin (list, detail, payouts) | `admin/affiliates`, `api/admin/affiliates/**` | Complete | |
| Admin mobile nav/drawer | `AdminMobileNav.tsx` | Complete | Recent commit (Aug 2026 wave) |

### Platform/infra-facing
| Feature | Where it lives | State | Notes |
|---|---|---|---|
| Subdomain routing (per-store custom subdomain) | `middleware.ts` + `cloudflare-worker/subdomain-proxy.js` | **Duplicated / Partial** | Two independent implementations of the same logic; see §14 |
| Mobile push notifications | `lib/push.ts`, `api/mobile/push-token`, `api/mobile/notifications` | Complete | Expo push API, fire-and-forget (no delivery/retry tracking) |
| CSP violation reporting | `api/csp-report` | Complete | CSP itself is Report-Only, not enforced (see §14) |
| Debug endpoint | `api/debug/route.ts` | **Dead (intentionally)** | Hardcoded 404 with a comment: "Removed: was leaking internal routing headers" |
| Store visit analytics | `dashboard` stats, `api/dashboard/revenue`, `api/dashboard/stats`, `store_visits` | Complete | |
| Account deletion | `api/dashboard/delete-account` | Complete | `stores.deleted_at` soft-delete column added by its own migration |

## 5. User roles and permissions

Four distinct actor types, each with its own auth mechanism and no shared RBAC table:

1. **Merchant (store owner)** — Firebase-authenticated, one store per `owner_id` (schema enforces `UNIQUE`). All dashboard/API routes call `verifySession()` then `getUserStore(firebaseUid)`; every query is manually scoped with `WHERE store_id = $1`. There is no cross-store admin role at the merchant tier — one Firebase account = one store, by construction.
2. **Customer (storefront shopper)** — Anonymous; no account system at all. Identified only by a `visitor_id` in `localStorage` (visits) or `session_id` (reel views). Orders capture name/phone/email as plain form fields, not a customer identity.
3. **Admin (internal staff)** — Separate `admin_users` table, `super_admin`/`admin` roles, auto-provisioned from `ADMIN_EMAILS` env var on first matching login (`admin-auth.ts:44-75`). No role-based feature gating found beyond the two roles existing — every route checked only requires "is an active admin," not `role === 'super_admin'` for sensitive actions (plan pricing, settings). **Privilege distinction between `admin` and `super_admin` appears defined in the schema but not enforced in code** — worth confirming before treating `admin` as a lower-trust role.
4. **Affiliate (marketer)** — Fully separate `affiliates` table/session (`affiliate-auth.ts`), own login/signup/Google OAuth, scoped only to their own referrals/payouts.

**Multi-tenancy**: enforced entirely at the query layer (`store_id` filters), not via Postgres RLS. Consistent across the ~85 routes sampled — every dashboard/merchant route pattern is `verifySession → getUserStore → query scoped by store.id`. This is a manual-discipline model: correctness depends on every new route remembering the scoping join; there's no framework-level guard against a route forgetting `WHERE store_id = $1`.

## 6. Auth and accounts

- **Merchants**: Firebase client SDK (email/password) → ID token → `POST /api/auth/session` exchanges it for a 14-day HttpOnly session cookie (`firebase-admin` `createSessionCookie`). `verifySession()` also accepts a raw `Authorization: Bearer <idToken>` for the mobile app, so the same session helper serves both surfaces.
- **Password reset / email verification**: delegated to Firebase's own flows (`auth/forgot-password` page exists); no custom token/email code in this repo.
- **Signup**: `auth/signup` → creates Firebase user client-side, then store creation happens in onboarding, gated by reCAPTCHA v2 (`react-google-recaptcha`, `lib/recaptcha.ts`) and `platform_settings.allow_new_registrations`.
- **Admin**: no separate signup — piggybacks on the same Firebase auth, auto-promoted by matching email against `ADMIN_EMAILS`.
- **Affiliates**: independent — either `bcryptjs`-hashed password or Firebase UID (`affiliate-firebase-migration.sql` added `firebase_uid` and made `password_hash` nullable, i.e. Google sign-in was added after the fact).
- **Rate limiting**: `checkRateLimit()` (Redis fixed-window, fails open) applied selectively — confirmed on the AI assistant (10/hr) and referenced generally in `rate-limit.ts`; not verified on login/signup routes specifically (see Open Questions).

## 7. Billing and monetization

Provider: **Paystack** (cards) + **manual bank transfer**, both for merchant-to-customer checkout *and* merchant-to-platform subscription payment — the same two payment rails are reused for both directions, which is a nice reuse but also means Paystack webhook logic (`api/paystack/webhook`) must disambiguate order payments from subscription payments (verified via `tests/paystack-webhook.test.ts`).

- **Plans**: `Free` (₦0, 10 products, 0 reels), `Pro` (₦5,000/mo, 100 products, 10 reels), `Business` (₦17,000/mo, 1,000 products, 20 reels) — seeded in `plans` table, editable via `admin/plans`.
- **What's actually gated**: product count is enforced against `max_products` (needs confirming at the exact insert path — see Open Questions), Reels and Coupons are explicitly gated via `requirePro()` in their route handlers, the storefront AI assistant checks `effectivePlan.isPro`.
- **What's cosmetic-only**: none found to be gated in UI but not in the API — the audit found server-side `requirePro`/`requireSubscription` guards backing the client-side upgrade prompts (`UpgradePrompt.tsx`), which is the correct pattern.
- **Trial/freemium logic**: `freemium-migration.sql` is a real pivot recorded in-schema — the product moved from "setup fee required before any dashboard use" to "instant free tier, upsell to Pro." The **old setup-fee code paths (`billing/setup-fee`, `requireSubscription()` in `auth.ts`) are still present and callable**, creating two overlapping monetization models in the live codebase simultaneously (see §13).
- **Usage metering**: `ai_usage_log` table records every AI call (feature/provider/store) but nothing in the sampled code reads it back for billing or throttling beyond the flat rate limiter — metering exists but isn't yet monetized.
- **Webhooks**: `POST /api/paystack/webhook`, HMAC-verified (per README); has a dedicated test file, one of only two test files in the repo — signals this endpoint is treated as the highest-risk surface, appropriately.

## 8. API surface

Entirely internal — **no public/external developer API, no API keys for third parties, no versioning, no published docs** beyond the README's route table (which is materially incomplete — see below). All ~85 routes live under `src/app/api/**` and split into:

- **Merchant** (`/api/products`, `/api/categories`, `/api/orders`, `/api/stores/*`, `/api/dashboard/*`, `/api/reels/*`, `/api/billing/*`) — session-cookie or Bearer-token authenticated.
- **Public storefront** (`/api/storefront/[slug]/*`) — unauthenticated, rate-limited where cost-sensitive (AI assistant).
- **Admin** (`/api/admin/*`) — admin-session gated, all mutations audit-logged.
- **Affiliate** (`/api/affiliate/*`) — affiliate-session gated.
- **Mobile-specific** (`/api/mobile/discover`, `/api/mobile/notifications`, `/api/mobile/notifications/read-all`, `/api/mobile/push-token`) — exists specifically to serve the `duka-vendors` Expo app; same Bearer-token auth as the web dashboard.
- **Discover** (`/api/discover/products`, `/reels`, `/stores/[slug]`, `/vendors`) — public cross-store browsing.
- **Ops** (`/api/csp-report`, `/api/debug` [dead], `/api/subscription-status`).

The README's "API Routes" table lists ~18 endpoints; the actual count is closer to 85 — admin, affiliate, AI, reels, discover, mobile, and billing surfaces are entirely undocumented there.

## 9. Integrations and external services

| Service | Purpose | Config (names only) |
|---|---|---|
| Firebase Auth (+ Admin SDK) | All authentication | `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_ADMIN_*` |
| PostgreSQL | Primary datastore | `DATABASE_URL`, `DATABASE_SSL` |
| Redis | Cache + rate limiting | `REDIS_URL` |
| Paystack | Payments | `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` |
| Cloudinary | Image/video hosting + transforms | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_PRESET`, optional `CLOUDINARY_API_KEY/SECRET` |
| Groq | AI text generation (descriptions, chat assistant) | `GROQ_API_KEY`, `GROQ_MODEL` |
| Google Gemini | AI vision (category suggestion) | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| Google reCAPTCHA v2 | Signup bot protection | `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY` |
| Sentry | Error monitoring | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG/PROJECT/AUTH_TOKEN` (optional; app functions without it) |
| Tawk.to | Live chat widget (dashboard) | Embedded via `TawkChat.tsx`, allow-listed in CSP, no env var (site ID likely hardcoded in component — verify before treating as unconfigured) |
| Expo Push API | Mobile push notifications | No secret needed (public Expo push endpoint); tokens stored in `vendor_push_tokens` |
| Cloudflare Workers | Optional alternate subdomain router | `WORKER_SECRET`, `VERCEL_HOST` (Worker-side secrets, not in `.env.example`) |

## 10. Async work

No queue system (no BullMQ/SQS/etc.) — all "async" work is either fire-and-forget within a request or a Redis cache pattern:

- **Push notifications**: `notifyStoreNewOrder()` (`lib/push.ts`) fires on order creation — non-blocking, errors swallowed (`.catch(() => {})`), no retry/dead-letter handling if Expo's API is down.
- **Notification feed**: written to `vendor_notifications` synchronously alongside the push send.
- **Caching**: `lib/redis.ts` `getOrSet` pattern — store meta, products, categories, reels/discover (15 min TTL), cache invalidated explicitly on mutation (per README claim, spot-checked in `reels.ts`).
- **Cron/scheduled jobs**: **none found**. Plan expiry (`plans-dedup-migration.sql`'s one-time `UPDATE ... WHERE subscription_expires_at < NOW()`) is a migration-time backfill, not a recurring job — ongoing expiry appears to rely entirely on `getEffectivePlan()`'s runtime fallback-to-Free check rather than any scheduled sweep. No evidence of a cron that suspends stores whose subscription lapses, sends renewal reminders, or expires unclaimed affiliate payouts.
- **Webhooks consumed**: Paystack only (`/api/paystack/webhook`).
- **Emails**: **none found** in-app — no transactional email library (SendGrid/Resend/Postmark) in `package.json` dependencies. Password reset relies entirely on Firebase's own email flow; order confirmations, NIN approval/rejection, and payout status changes have no email notification path in this codebase.

## 11. Frontend state

- **Framework**: Next.js App Router, mix of Server Components (data fetching) and `"use client"` islands for interactivity.
- **Design system**: no named component library (no shadcn/Radix-as-system, no Storybook) — hand-rolled `src/components/ui/*` primitives (Button, Modal, Select, Input, Badge, Spinner, EmptyState) shared between dashboard and storefront.
- **Styling**: Tailwind CSS v3, dark mode via `next-themes`, per-store accent color injected as CSS custom properties (`--sf-accent*`) computed with `chroma-js`.
- **State management**: Zustand for cart (`CartProvider.tsx`, persisted) and a small dashboard-drawer store (`dashboard-drawer-store.ts`); everything else is server-fetched/React state — no global client store for dashboard data (each page fetches its own).
- **Animation**: `framer-motion` used for drawers/transitions (mobile nav, cart drawer).
- **Mobile responsiveness**: explicit and recent — `DashboardBottomNav.tsx`, `AdminMobileNav.tsx`, and mobile header/drawer components were added in the five most-recent commits, suggesting mobile web support was a late addition, not designed in from the start.
- **Accessibility**: no explicit a11y tooling (no `eslint-plugin-jsx-a11y` in devDependencies, no `axe` testing) — not verifiable as a strength or gap beyond "not actively checked."

## 12. Quality signals

Blunt assessment: **thin test coverage, no type-checked build gate, real production incident history visible in the migrations.**

- **Tests**: 2 Vitest files (`tests/billing-fulfillment.test.ts`, `tests/paystack-webhook.test.ts`) — the only two areas with any automated coverage are money-movement logic. Zero tests for products, orders, auth, admin, reels, affiliates, or any UI component. `vitest.config.mts` explicitly scopes coverage collection to just those two files, i.e. this is deliberate narrow coverage of the highest-risk logic, not an oversight — but it leaves the other ~99% of the app unverified by CI.
- **CI**: `.github/workflows/ci.yml` runs lint + typecheck + test on push/PR to `main`. **Does not run `next build`** — deliberately, per an inline comment, because the build script runs live DB migrations. This means a change can pass CI and still fail to build/deploy (caught only by Vercel's preview build after the fact), and no CI step ever exercises the migration runner itself.
- **Linting/types**: ESLint (`eslint-config-next`) + `tsc --noEmit` both run in CI — genuinely enforced, not just present.
- **Error monitoring**: Sentry wired into `next.config.ts` (client + server), inactive without a DSN — reasonable default-off posture for local dev.
- **Logging**: extensive `console.log` debug output left in production code paths — most notably `middleware.ts` logs a multi-line diagnostic block (headers, resolved hostname, env values) on **every single request**, and `src/lib/db.ts` logs every query with timing in development (correctly gated to `NODE_ENV === 'development'`, but the middleware logging is not gated at all).
- **Git hygiene**: 45 of the last 50 commits are bare `update` — no changelog, no conventional commits, impossible to reconstruct intent from history for most of the codebase's life. The five most recent commits (mobile nav, image optimization, discovery endpoints) are well-described, suggesting a recent shift toward better commit discipline.

## 13. Unfinished and abandoned work

- **Orphaned migration**: `migrations/add_uncategorized_category.sql` exists but is not listed in `scripts/run-migrations.mjs`'s `MIGRATIONS` array — it will not run on `npm run db:migrate` or `npm run build`. Either it was already applied manually and forgotten, or new stores are missing the "Uncategorized" fallback category it creates. Needs verification against the live DB.
- **Two overlapping monetization models live simultaneously**: the original setup-fee-then-subscription flow (`requireSubscription()`, `/api/billing/setup-fee`) and the newer freemium plan model (`requirePro()`, `/api/billing/subscribe-plan`) both have live, reachable code paths. `platform_settings.require_setup_fee` is now `false` by default, so the old flow is dormant but not removed — dead-weight surface area, not dead code.
- **Duplicate subdomain-routing implementations**: `middleware.ts` (Next.js, does its own hostname parsing) and `cloudflare-worker/subdomain-proxy.js` (Worker, sets `x-store-slug`/`x-worker-secret` headers) both implement subdomain→slug rewriting independently. The Worker's `x-worker-secret` header is never checked anywhere in the Next.js app (`grep` for `WORKER_SECRET`/`x-worker-secret` in `src/` returns nothing) — if the Worker is actually deployed in front of Vercel, it's providing zero verification value today; if it isn't deployed, it's dead code kept alongside the working middleware. `SubDomain.MD` documents only the middleware approach and doesn't mention the Worker at all, reinforcing that the Worker is likely an abandoned/parallel experiment.
- **`/api/debug`**: deliberately neutered (returns 404) with a comment explaining it used to leak internal routing headers — correctly killed, but the route file itself is left in the tree as a marker rather than deleted.
- **Root `schema.sql` vs `scripts/schema.sql`**: the latter is a stale draft (models a `users` table the app doesn't have) that should probably be deleted to avoid misleading future contributors.
- **CSP is Report-Only, not enforced**: `next.config.ts` ships `Content-Security-Policy-Report-Only` with an explicit code comment that this is intentional pending a monitoring period, and that dropping `'unsafe-inline'` is "a natural follow-up" — a documented, not-yet-done hardening step.
- **No CI build check**: acknowledged gap in the CI comment itself (migrations-on-build risk), not fixed with e.g. a build-only-no-migrate script.
- **NIN verification has no merchant-facing notification** on approval/rejection — the admin action exists, the schema exists, but nothing surfaces the outcome to the merchant besides them refreshing their dashboard.

## 14. Weaknesses and risk areas

Ranked by severity:

1. **No cron/scheduled sweep for subscription expiry.** `getEffectivePlan()` correctly falls back to Free at read-time, so a store never gets *more* than it's paid for — but nothing proactively flips `stores.status`/`subscription_status` or notifies a merchant whose Pro plan lapsed, beyond the one-time backfill in `plans-dedup-migration.sql`. At scale this likely means stale `subscribed` status rows and no renewal-reminder capability.
2. **Manual per-route tenant scoping, no defense in depth.** Multi-tenancy relies on every route author remembering to join through `getUserStore()`/`store_id`. Sampled routes are consistent, but there's no RLS, no ORM-level scoping, and no test that asserts cross-tenant isolation — a single missed `WHERE store_id = $1` in a future route is a full tenant data leak with nothing to catch it.
3. **Middleware request-logging on every request**, including full header dumps, unconditionally (not gated by `NODE_ENV`) — noisy at best, and depending on the hosting log pipeline's retention/access controls, a minor information-exposure surface (hostnames, forwarded-for chains) at worst.
4. **CSP not enforced** (`Report-Only`) plus `'unsafe-inline'` for script/style — acceptable as a deliberate, documented interim state, but it means the CSP currently provides no actual XSS mitigation, only visibility.
5. **Redundant, partially-dead subdomain routing** (middleware + unused Worker) is exactly the kind of surface that causes a confusing production incident later — someone debugging a subdomain issue has two divergent implementations to check, and the Worker's unchecked secret gives false confidence that it's providing request authentication.
6. **Fail-open rate limiting.** `rateLimit()` returns `true` (allow) on any Redis error — a reasonable choice to avoid outages blocking legit traffic, but it means a Redis outage silently disables all abuse protection (login attempts, AI assistant cost bounding) at exactly the moment infrastructure is already degraded.
7. **Thin automated test coverage** outside payments — correctness of products/orders/admin/reels/affiliates rests entirely on manual testing and TypeScript's static guarantees.
8. **Bare-SQL, no ORM/query builder.** Fine at current scale and gives full control, but every new feature is another hand-written parameterized query to get right; no schema-drift detection between `pg` calls and actual table shape besides `tsc` (which doesn't type-check raw SQL strings).
9. **Extending billing/plan logic touches a lot of surface.** A pricing change means touching `plans` table seed data, `lib/plan.ts`, `admin/plans/PlansClient.tsx`, `dashboard/billing/BillingClient.tsx`, `requirePro()` call sites in every gated route, and the Paystack webhook/`billing-fulfillment.ts` fulfillment switch — no single source of truth for "what does this plan unlock."

## 15. Extension points

Places a new feature can plug in cleanly, following the codebase's own established patterns:

- **New gated (Pro/plan-limited) feature**: follow the Reels/Coupons pattern exactly — add a `max_x` column to `plans`, call `requirePro(storeId)` (or add a new `require<Tier>` in `lib/plan.ts`) at the top of the mutation route, gate the UI with `UpgradePrompt.tsx`. This is the single most well-trodden path in the codebase.
- **New admin-mutable resource**: mirror `api/admin/vendors/[id]/route.ts` — Zod `discriminatedUnion` action schema, `verifyAdminSession()` guard, `logAdminAction()` call on every mutation. Gives audit-log coverage for free.
- **New cached read-heavy endpoint**: follow `lib/reels.ts` / `getTrendingReels()` — `getOrSet(cacheKey, fetcher, ttlSeconds)` from `lib/redis.ts` is the established pattern for anything cross-store or expensive.
- **New AI-assisted feature**: `src/lib/ai/index.ts`'s `isAiEnabled()`/`generateText()`/`logAiUsage()` triad already handles the "feature stays hidden until API key present" contract and usage logging — reuse rather than re-implement provider calls.
- **New mobile-facing endpoint**: the `/api/mobile/*` namespace + `verifySession()`'s existing dual cookie/Bearer support means new merchant-facing mobile features need no new auth plumbing — same pattern as `api/mobile/discover`.
- **New payment-adjacent logic**: `lib/billing-fulfillment.ts`'s `fulfillSubscriptionPayment()` already centralizes the idempotency + type-validation pattern ("does the stored payment type match what the caller expected") — new payment types should extend its `PaymentType` union rather than adding parallel fulfillment logic elsewhere.
- **New rate-limited public endpoint**: `checkRateLimit()` one-liner, already proven on the AI assistant route — trivial to apply to any new anonymous-facing route.

## 16. Open questions

- **Is the Cloudflare Worker (`cloudflare-worker/subdomain-proxy.js`) actually deployed?** If yes, `WORKER_SECRET` should be validated server-side (it currently isn't) or the header is meaningless. If no, it should probably be deleted or clearly marked experimental. Not determinable from the code alone.
- **Does `migrations/add_uncategorized_category.sql` need to be run against the live database?** It's absent from the migration runner's list — unclear whether this is an oversight or the migration was applied by hand once and the file kept for reference.
- **Product-count plan enforcement**: `plan.ts` defines `max_products` per plan, but the audit didn't trace the exact `POST /api/products` code path to confirm the limit is actually checked at creation time (only that `requirePro()` exists for *other* features). Recommend explicit verification before assuming product caps are enforced.
- **Are `awarizon.shop` and `awarizonmall.com` both live production domains, or is one legacy/deprecated?** Both appear in CSP/image/serverActions allow-lists; `next.config.ts` comments call the second "legacy" but neither `.env.example` nor README clarifies the relationship or migration plan.
- **Tawk.to site configuration**: the chat widget is allow-listed in CSP and rendered via `TawkChat.tsx`, but no env var configures it in `.env.example` — likely a hardcoded site ID inside the component; not confirmed.
- **Email notifications**: no transactional email provider found in dependencies. Assumption: order confirmations, payout status, and NIN verification outcomes are currently **not** emailed to anyone — worth confirming this isn't handled by an external tool (e.g. a Zapier/webhook integration) not visible in this repo.
- **Relationship to `duka-vendors`**: confirmed structurally (shared `awarizon.shop` API base, dedicated `/api/mobile/*` routes, Expo push token table) but this repo doesn't document that pairing anywhere (README doesn't mention a mobile app) — treated here as an inferred fact, not a stated one.
- **Admin `role` enforcement**: `admin_users.role` distinguishes `super_admin`/`admin`, but no sampled route branches on which role it is — whether this distinction is enforced elsewhere (not sampled) or is vestigial is unconfirmed.
- **Production hosting**: README says Vercel; no `vercel.json` or hosting-specific config found to confirm beyond the README and the CI comment referencing "Vercel PR-preview deployment."

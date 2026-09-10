# Duka Vendors (Expo app) — Codebase Audit

Audited: 2026-08-14. Read-only pass over `duka-vendors`. No README beyond a one-line `AGENTS.md` pointer to Expo's versioned docs; `CLAUDE.md` is empty of product description. Git history is short: 5 commits total (`Initial commit` → `feat: full Expo app with vendor dashboard, product & store discovery` → three UI-polish commits), and the working tree currently has **7 modified files + 1 untracked new component** (`components/discover/LatestReelsStrip.tsx`) uncommitted at time of audit — this is a project mid-session, not a clean snapshot.

## 1. Product summary

Duka Vendors is the companion mobile app (iOS/Android via Expo) for the **ShopForge/Awarizon** web SaaS audited separately at `shopforge-saas/storefront-saas/AUDIT.md`. It serves two distinct audiences in one binary, split by Expo Router route groups: `(app)` is a merchant back-office (orders, products, categories, reels, billing status, QR code, settings) for vendors who already have a store on the web platform, and `(discover)` is a public, unauthenticated social-commerce browsing surface (a TikTok-style vendor/product discovery feed) that anyone can open without an account. There is **no README or product doc in this repo** — everything below is inferred from `app.json`, the route tree, and `lib/api.ts`'s `API_BASE` pointing at `https://awarizon.shop`, which is the same production domain as the audited web app. This is a real, in-development app (bundle ID `com.awarizon.dukavendors`, EAS project configured, Firebase/Google Sign-In wired to live config) rather than a scaffold — but its 5-commit history and uncommitted working tree indicate it's early and actively churning, not yet a mature release.

## 2. Stack and architecture

| Layer | Technology |
|---|---|
| Framework | Expo SDK 56 (bare-adjacent, `expo-dev-client`), Expo Router (file-based, typed routes) |
| Language | TypeScript, React 19.2, React Native 0.85.3 |
| Auth | `@react-native-firebase/auth` (native Firebase, not the JS SDK) + Google Sign-In |
| Data fetching | `@tanstack/react-query` v5 — no other client-side data layer |
| State | Zustand (`store/auth.ts`, `store/drawer.ts`, `store/notifications.ts`) |
| Local persistence | `expo-sqlite` (discover feed cache), `@react-native-async-storage` (notification sound pref) |
| Push notifications | `expo-notifications` + Expo push token, registered against the web app's `/api/mobile/push-token` |
| Media | `expo-image`, `expo-image-picker`, `expo-video`, direct-to-Cloudinary upload for reels |
| Icons/UI | `lucide-react-native`, hand-rolled `StyleSheet.create` styling throughout (no NativeWind/Tailwind, no UI kit) |
| QR / sharing | `react-native-qrcode-svg`, `react-native-view-shot`, `expo-sharing` |
| Backend | **None in this repo** — 100% of data comes from the `shopforge-saas/storefront-saas` Next.js API at `awarizon.shop` |

Single Expo app, no monorepo tooling, no native backend code beyond Firebase config files (`google-services.json`). Directory map (top two levels):

```
duka-vendors/
├── app/                    # Expo Router file-based routes
│   ├── (auth)/             # login, signup, forgot-password — unauthenticated
│   ├── (app)/               # Authenticated vendor dashboard (tabs: home, orders, products,
│   │                         #   categories, reels, billing, qrcode, settings) + notifications
│   └── (discover)/          # Public browsing: discover feed, home, reels, store/[slug],
│                             #   products/[category], vendors/[category] — no auth required
├── components/              # AppDrawer, AppHeader, OrderCard, ProductCard, RevenueChart,
│                             #   Skeleton, StatsCard, SubHeader, discover/*, ui/* — flat, no atomic hierarchy
├── constants/theme.ts       # Single color/token source (Colors.*), referenced everywhere
├── lib/                     # api.ts (fetch wrapper), firebase.ts, discover-cache.ts (SQLite),
│                             #   notifications.ts, useInAppUpdate.ts
├── store/                   # 3 small Zustand stores (auth, drawer, notifications)
├── types/                   # index.ts (Store/Product/Order), discover.ts, reels.ts
├── assets/                  # icons, splash, logo, notification sound
└── App.tsx                  # Present alongside app/_layout.tsx — see §13 (Expo Router normally needs only the latter)
```

## 3. Data model

**No local database or schema of its own.** All persistent business data (stores, products, orders, categories, reels) lives in the web app's PostgreSQL database and is only ever read/written through its REST API — this app has no ORM, no local source of truth beyond caches. Two local-only stores exist:

| Store | Location | Purpose |
|---|---|---|
| SQLite `discover.db` | `lib/discover-cache.ts` | Offline-friendly cache of the public discover feed: `reels`, `vendors`, `meta` tables (id/data-JSON/position rows), 30-minute TTL. Pure client-side cache, not synced back. |
| AsyncStorage | `lib/notifications.ts` | One key (`notif_sound_enabled`) — notification sound on/off preference. |
| Zustand (in-memory, unpersisted) | `store/auth.ts`, `store/drawer.ts`, `store/notifications.ts` | Firebase user object, drawer open/close, unread notification count. Not persisted across app restarts (no `zustand/persist` middleware used here, unlike the web app's cart store). |

TypeScript domain types (`types/index.ts`) are a **hand-maintained, narrower subset** of the web app's `Store`/`Product`/`Order` shapes — e.g. `Store.plan` (name/maxProducts/maxReels/isPro) mirrors `lib/plan.ts`'s `EffectivePlan` on the web, and every screen re-implements its own `mapOrder()`/field-normalization function to cope with snake_case API responses (the web app's dual camelCase/snake_case ambiguity, documented in the sibling audit, leaks directly into this client). Notably `mapOrder()` is duplicated near-verbatim in both `app/(app)/(tabs)/index.tsx` and `app/(app)/(tabs)/orders/index.tsx`/`[id].tsx` rather than shared from one place.

## 4. Feature inventory

### Vendor dashboard (`(app)` — authenticated)
| Feature | Where it lives | State | Notes |
|---|---|---|---|
| Dashboard home (today/all-time stats, revenue chart, recent orders) | `(app)/(tabs)/index.tsx`, `RevenueChart.tsx`, `StatsCard.tsx` | Complete | Pull-to-refresh; explicit "No store found" empty state deep-linking to the web onboarding wizard |
| Order list + filter by status | `(app)/(tabs)/orders/index.tsx` | Complete | Client-side search box present (visual only — confirm server-side filtering isn't also needed, see Open Questions) |
| Order detail + status update | `(app)/(tabs)/orders/[id].tsx` | Complete | Confirmed against a real, matching web `PATCH /api/orders/[orderId]` route |
| Product list/CRUD | `(app)/(tabs)/products/index.tsx`, `[id].tsx`, `new.tsx` | Complete | Image upload via `XMLHttpRequest` direct to the web app's `/api/upload` |
| Category/subcategory management | `(app)/(tabs)/categories/index.tsx`, `[id].tsx`, `new.tsx` | Complete | Mirrors the 2-level web model |
| Reels — record/upload, list, manage | `(app)/(tabs)/reels/index.tsx`, `new.tsx` | Complete | Real Cloudinary signed direct-upload flow (`/api/reels/upload-signature`); upload "progress" bar jumps 0→80→100 rather than tracking real bytes sent (`fetch` has no progress events) — cosmetic, not broken |
| Billing status (view-only) | `(app)/(tabs)/billing.tsx` | Complete, **read-only by design** | All payment actions deep-link to the web dashboard (`Linking.openURL`) — no in-app Paystack flow, matching the explicit "Payments handled on the web" messaging in the UI itself |
| QR code generator for store link | `(app)/(tabs)/qrcode.tsx` | Complete | Local render + share, no server round-trip beyond fetching the store slug |
| Notifications feed | `(app)/notifications.tsx`, `/api/mobile/notifications`, `read-all` | Complete | Polled every 30s (no push-driven live refresh of the list itself, only the badge count via native push) |
| Push notification opt-in/token registration | `lib/notifications.ts`, `registerForPushNotifications()` | Complete | Registers against `vendor_push_tokens` on the web backend; requested proactively at app boot before login |
| Settings (profile, store link, sign out, notification sound) | `(app)/(tabs)/settings.tsx` | Complete | Store settings/help/terms/affiliate links all deep-link out to the web dashboard rather than being native screens |
| Drawer navigation | `components/AppDrawer.tsx`, `store/drawer.ts` | Complete | Custom-built slide-in drawer (Animated API), not a navigation-library drawer |
| In-app store creation / onboarding | — | **Not present** | No onboarding wizard in the app; a vendor without a store is told to "Set up my store" on the web. Mobile is dashboard-only for existing stores. |

### Discover (`(discover)` — public, unauthenticated)
| Feature | Where it lives | State | Notes |
|---|---|---|---|
| Cross-store product/vendor discovery feed | `(discover)/(tabs)/discover.tsx`, `home.tsx` | Complete | Category-grouped horizontal rails, backed by `/api/mobile/discover` |
| Reels feed (public) | `(discover)/(tabs)/reels.tsx`, `components/discover/ReelCard.tsx`, `LatestReelsStrip.tsx` | Complete, **actively being reworked** | `LatestReelsStrip.tsx` is a brand-new untracked file at time of audit; `home.tsx` and `reels.tsx` both show uncommitted local modifications |
| Store storefront view (in-app) | `(discover)/store/[slug].tsx` | Complete | Renders a store's public catalogue natively rather than opening a web view |
| Category product/vendor listing | `(discover)/products/[category].tsx`, `vendors/[category].tsx` | Complete | |
| "Sign in" tab | `(discover)/(tabs)/signin.tsx` | Complete (thin) | Pure redirect to `(auth)/login` — exists only to give the discover tab bar a sign-in entry point |
| Offline/stale-tolerant caching | `lib/discover-cache.ts` (SQLite) | Complete | 30-min TTL, separate staleness checks for reels vs. vendors |

### Auth
| Feature | Where it lives | State | Notes |
|---|---|---|---|
| Email/password signup | `(auth)/signup.tsx` | Complete | Sends Firebase email verification; does **not** block navigation on verification — user proceeds into `(app)` immediately after signup |
| Email/password login | `(auth)/login.tsx` | Complete | |
| Google Sign-In | `(auth)/login.tsx`, `app/_layout.tsx` (`GoogleSignin.configure`) | Complete | |
| Forgot password | `(auth)/forgot-password.tsx` | Present, not read in detail | Assume Firebase `sendPasswordResetEmail` given the pattern elsewhere — verify |
| In-app update check | `lib/useInAppUpdate.ts`, `sp-react-native-in-app-updates` | Complete | Android/Play-Store-oriented; standard library usage |

## 5. User roles and permissions

Only one role exists client-side: **vendor (store owner)**. There is no admin surface, no affiliate surface, and no customer-account surface in this app — those exist only on the web (per the sibling audit). Authorization is delegated entirely to the backend: this app sends a Firebase ID token as a `Bearer` header (`lib/api.ts`) and trusts whatever the API returns; it holds no role logic of its own beyond "logged in or not" (`(app)/_layout.tsx`'s `if (!currentUser) return <Redirect href="/(auth)/login" />`). Discover screens are intentionally reachable with zero authentication, by route-group design.

**Tenant scoping**: implicit — a vendor only ever sees their own store's data because the API resolves `store_id` from the Bearer token server-side (`getUserStore(firebaseUid)` on the web). Nothing in this app enforces or double-checks that; it's a full-trust client of the audited backend.

## 6. Auth and accounts

- **Session**: Firebase native SDK manages the session; `app/_layout.tsx` subscribes to `onAuthStateChanged` with a defensive 5-second timeout that force-resolves to logged-out if Firebase never responds (`onAuthStateChanged` warns `Firebase auth timeout — forcing null`) — a reasonable defensive pattern against a hung splash screen.
- **API auth**: `lib/api.ts` fetches a fresh ID token per request, auto-retries once on a 401 with a force-refreshed token — same dual cookie/Bearer contract the web backend documents supporting.
- **Password reset**: Firebase-delegated (`forgot-password.tsx` present; not fully read).
- **Email verification**: triggered on signup but **not enforced** — no gate checks `user.emailVerified` anywhere sampled, so an unverified email can fully use the vendor dashboard.
- **Onboarding/invite flow**: none — a new signup lands directly in `(app)`, and if no store exists yet, the dashboard shows a "no store" empty state pointing to the web onboarding wizard. There is no mobile-native path to create a store.
- **Logout**: signs out of both Google Sign-In cache and Firebase (`settings.tsx`), with a confirmation `Alert`.

## 7. Billing and monetization

**No payment code exists in this app**, by design — it is entirely a viewer/deep-link surface for the web app's billing:

- `billing.tsx` renders subscription status (`store.subscriptionStatus`, `store.plan`), a static two-row pricing table (setup fee ₦10,000, monthly ₦5,000 — **hardcoded in the component**, not fetched from `platform_settings`, so if the web admin changes these values via `admin/settings`, this screen will silently show stale numbers until the app is updated), and a "Manage Billing" button that opens `https://awarizon.shop/dashboard/billing` in the system browser.
- Plan-gating for Reels is surfaced (a "PRO" badge on the Reels settings row when `!store.plan.isPro`), consistent with the web's `requirePro()` gate — but the mobile app doesn't itself block the Reels screens if a Free-tier vendor navigates there directly (worth confirming server 403s are handled gracefully in the reels list/upload screens — not verified in this pass).
- No trial logic, no usage metering, no webhook handling — none of that is this app's responsibility.

## 8. API surface

This app is purely a client of the `shopforge-saas` backend; it exposes no API of its own. Endpoints it calls (all confirmed to exist server-side in the sibling audit):

- `GET /api/dashboard/store`, `/api/dashboard/stats`
- `GET/PATCH /api/orders`, `/api/orders/[orderId]`
- `GET/POST/PATCH/DELETE /api/products`, `/api/products/[productId]`
- `GET/POST/PATCH/DELETE /api/categories`, `/api/subcategories`
- `GET/POST /api/reels`, `/api/reels/upload-signature`
- `POST /api/upload`
- `GET /api/mobile/discover`, `/api/mobile/notifications`, `POST /api/mobile/notifications/read-all`, `POST /api/mobile/push-token`
- Auth: none of its own — relies on Firebase directly plus the web's session/Bearer contract

`API_BASE` defaults to `https://awarizon.shop` and is overridable via `EXPO_PUBLIC_API_URL` — no environment-switching UI, no staging indicator visible in the app itself.

## 9. Integrations and external services

| Service | Purpose | Config (names only) |
|---|---|---|
| Firebase Auth | Vendor authentication | `EXPO_PUBLIC_FIREBASE_*`, `google-services.json` (Android) |
| Google Sign-In | OAuth login | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `_ANDROID_CLIENT_ID`, `_IOS_CLIENT_ID` |
| Cloudinary | Direct video upload for reels | Signature fetched from the web backend; no Cloudinary secret held client-side (correct pattern) |
| Expo push service | Push notification delivery | No app-side secret; project ID from `eas.json`/`app.json` |
| `awarizon.shop` (the sibling web app) | The entire backend | `EXPO_PUBLIC_API_URL` |
| EAS (Expo Application Services) | Build/submit pipeline | `eas.json`, project ID `7a8d16c0-eebd-404a-9305-68e76bef16b4` |

## 10. Async work

No server-side async work originates from this repo (it's a client). Client-side "async" patterns worth noting:

- **Notification polling**: `(app)/_layout.tsx` polls `/api/mobile/notifications` every 30 seconds while a user is logged in, for the unread badge count — a fixed interval poll, not push-driven, so the badge can lag up to 30s behind an actual push notification's arrival.
- **Push notification handling**: tapping a push routes to `/(app)/orders` (both the live-response listener and the cold-start `getLastNotificationResponseAsync` check) — functional, but only handles `type === 'order'`; any other notification `type` the backend might send (the web schema's `vendor_notifications.type` is a free-text column, not constrained to `'order'`) has no routing behavior defined.
- **Discover cache refresh**: `isCacheStale()`/`isVendorCacheStale()` gate re-fetches at a 30-minute TTL — a manual cache-then-network pattern, not a background task (no `expo-background-fetch` or similar).

## 11. Frontend state

- **Navigation**: Expo Router, file-based, typed routes enabled (`experiments.typedRoutes`). Two independent tab navigators (`(app)/(tabs)` and `(discover)/(tabs)`) plus a custom Animated drawer layered on top of the `(app)` stack — the drawer is hand-built rather than using `@react-navigation/drawer`, which is more code to maintain but avoids a second navigation library.
- **Design system**: no shared design-system package — `constants/theme.ts` centralizes a `Colors` token object referenced everywhere, but component styling is per-file `StyleSheet.create` with no shared spacing/typography scale beyond ad hoc numeric literals (visible throughout, e.g. `settings.tsx`, `orders/[id].tsx` which inlines styles directly in JSX rather than using its `StyleSheet`).
- **Component reuse**: a real `components/ui/*` (Button, Input, Card, Badge, EmptyState) exists and is used in newer screens (signup, login, product form), but several screens (notably `orders/[id].tsx`) bypass it entirely with inline `View`/`Text` + literal style objects — inconsistent adoption of the shared primitives.
- **Loading states**: `components/Skeleton.tsx` provides `ProductCardSkeleton`/`SectionHeaderSkeleton` — a real skeleton-loading system, recently added per the latest commit ("add skeleton loader").
- **State management**: Zustand for auth/drawer/notification-count (unpersisted), React Query for all server data (30s `staleTime`, retry: 1) — no Redux, no Context-heavy prop drilling.
- **Responsive/mobile**: this is a native mobile app; "responsiveness" here means tablet support (`ios.supportsTablet: true` in `app.json`) — not independently verified against actual tablet layouts.
- **Accessibility**: no accessibility props (`accessibilityLabel`, etc.) observed in the sampled screens; not a focus area currently.

## 12. Quality signals

Blunt assessment: **no automated testing, no CI, and a working tree with uncommitted changes at audit time** — this is pre-production/actively-developed code with none of the safety nets the sibling web repo has (which itself only has 2 test files, but at least has CI + a test framework wired up).

- **Tests**: none — no test framework in `package.json` `devDependencies`, no `__tests__`/`.test.` files anywhere in the tree.
- **CI**: none — no `.github/workflows` in this repo.
- **Linting/types**: TypeScript is present (`tsconfig.json`, `expo-env.d.ts`) but there's no visible `npm run lint`/`typecheck` script in `package.json`'s `scripts` block, and no ESLint config found — type safety exists at the editor level only, not enforced anywhere automated.
- **Logging**: heavy `console.log`/`console.warn` left in shipped code paths — `store/auth.ts` logs every auth state change, `app/_layout.tsx` logs the full auth subscription lifecycle, `lib/notifications.ts` logs the raw Expo push token to the console. None of this is gated behind `__DEV__` or an environment check, so it ships to production builds as-is.
- **Error monitoring**: no Sentry or equivalent crash/error reporting library in dependencies — unlike the web app, this app has no visibility into production crashes beyond app-store crash reports (if configured there, which is outside this repo).
- **Git hygiene**: 5 commits total; the most recent three are reasonably descriptive, but the whole app's initial build is one giant `feat: full Expo app...` commit — no incremental history to trace individual feature decisions. Working tree is currently dirty (7 modified, 1 untracked file) mid-session.

## 13. Unfinished and abandoned work

- **Both `App.tsx` and `app/_layout.tsx` exist at the repo root.** Expo Router (declared as `"main": "expo-router/entry"` in `package.json`) uses `app/_layout.tsx` as its root layout and does not need a top-level `App.tsx` at all — its presence suggests either a leftover from an earlier non-Router bootstrap or an unused/dead file. Worth confirming it isn't accidentally still wired in as the entry point somewhere in native config.
- **Uncommitted, in-progress Discover/Reels rework**: `LatestReelsStrip.tsx` is new and untracked; `home.tsx`, `reels.tsx` (discover), `billing.tsx`, `products/index.tsx`, `reels/index.tsx` (vendor), `settings.tsx`, and `AppDrawer.tsx` all show local modifications not yet committed. This audit reflects the working tree as found, but the discover/reels surfaces specifically are mid-edit.
- **Hardcoded billing figures** in `billing.tsx` (₦10,000 setup fee, ₦5,000/mo) duplicate values that live in the web app's `platform_settings` table and are admin-editable there — any pricing change made via `admin/settings` on the web won't propagate to this screen without an app update and store release.
- **Email verification is requested but not enforced** — `sendEmailVerification()` is called on signup, but no screen or guard checks `user.emailVerified`, so the verification step currently has no functional effect on app access.
- **No in-app store-creation/onboarding path** — every "no store yet" state defers to a `Linking.openURL` out to the web app. This may be intentional (keep onboarding on the higher-conversion web flow) but is worth confirming rather than assuming, since it's a meaningful gap versus the web app's polished 3-step wizard.
- **Client-side search box on Orders** (`orders/index.tsx` imports `Search`/`X` icons and appears to build search UI) — not fully traced in this pass; verify it actually filters (client-side over the fetched page, or a no-op) rather than assuming full-text order search exists.
- **No lint/typecheck scripts** — unlike the sibling web repo's enforced `npm run lint`/`typecheck` in CI, this repo has no equivalent automated gate at all, so `tsc` errors could currently exist undetected.

## 14. Weaknesses and risk areas

Ranked by severity:

1. **No CI, no tests, no lint gate.** For an app shipping to app stores (irreversible releases, slow rollback), this is the single biggest quality risk — a regression currently ships whenever someone runs `eas build` with no automated check in between. The web sibling at least has lint+typecheck+narrow tests in CI; this app has nothing.
2. **Full-trust client with no defense against a compromised/rooted device beyond Firebase's own token security.** Not unusual for a mobile app, but worth noting there's no certificate pinning, no jailbreak/root detection, and store-scoping is entirely server-enforced — consistent with, and only as strong as, the web backend's manual `WHERE store_id = $1` discipline flagged in the sibling audit.
3. **Duplicated, hand-rolled field-mapping logic** (`mapOrder()` appearing near-identically in at least two files) means a backend field rename requires updating multiple call sites in this app with no shared adapter layer and no test to catch a missed one.
4. **Hardcoded pricing in `billing.tsx`** can drift silently from the actual, admin-configurable web pricing — a low-frequency but real correctness risk for a screen literally called "Billing."
5. **Console logging of push tokens and auth-state transitions ships to production** — mostly a hygiene/log-noise issue rather than a secrets leak (Expo push tokens aren't secret credentials), but still unnecessary production log volume with no `__DEV__` gate.
6. **`App.tsx` + `app/_layout.tsx` coexistence** is a small but real "which file actually runs" ambiguity that should be resolved (delete one) before it causes a confusing platform-specific bug.
7. **No crash/error monitoring** — unlike the web app's Sentry setup, there's no visibility into production JS crashes from real vendor devices; issues would only surface via manual bug reports or app-store reviews.

## 15. Extension points

- **New authenticated vendor screen**: drop a file into `app/(app)/(tabs)/`, follow the `billing.tsx`/`settings.tsx` pattern — `useQuery(['store'], () => api.get<Store>('/api/dashboard/store'))` is the established way to get store context, and `SubHeader`/`AppHeader` give consistent chrome for free.
- **New public discovery surface**: follow `(discover)/products/[category].tsx` or `store/[slug].tsx` — same `API_BASE` fetch pattern, and `lib/discover-cache.ts`'s SQLite cache is a ready-made template (copy its `getCached*/setCached*/isCacheStale` triad) for any new cacheable public feed.
- **New push-notification-triggered flow**: the two listeners in `(app)/_layout.tsx` (`addNotificationResponseReceivedListener` + `getLastNotificationResponseAsync`) are the only place notification-tap routing is decided — extending the `data.type` switch there is the correct single point of change (currently only handles `'order'`).
- **New API call**: `lib/api.ts`'s `api.get/post/patch/delete` already handles Bearer-token attachment, 401-retry-with-refresh, and JSON error unwrapping — every new backend call should go through it rather than raw `fetch` (a few screens, e.g. `products/new.tsx`'s image upload, already had to hand-roll `XMLHttpRequest` specifically because `lib/api.ts` doesn't support `FormData`/upload progress — a natural extension point would be adding multipart support there instead of re-implementing it per screen).
- **Design tokens**: `constants/theme.ts`'s `Colors` object is the one genuinely centralized piece of shared design state — new screens should pull from it rather than hardcoding hex values (most do; a few inline hexes like `'#EF4444'` for badges appear directly in component files instead).

## 16. Open questions

- **Is `App.tsx` actually used, or dead?** Needs a direct check of native entry-point config (not attempted in this read-only pass) to confirm `app/_layout.tsx` is the sole active root.
- **Does the Orders search box actually filter results, client- or server-side?** Not traced past its import list in this pass.
- **Is Reels access actually blocked server-side for Free-tier vendors who navigate to it directly on mobile**, or does the screen only fail ungracefully? The `requirePro()` gate exists on the web API; this app's handling of the resulting 403 wasn't verified.
- **Relationship/versioning between this app and the web app's release cycle**: since pricing and feature flags (`platform_settings`) are hardcoded or fetched inconsistently here, it's unclear whether there's a process for keeping the mobile app in sync with web-side config changes, or whether that's a known, accepted gap.
- **Is there a `.env.example` or documented env-var list for new contributors?** None was found — `EXPO_PUBLIC_*` variable names were recovered only by reading `.env` directly; a new developer has no documented reference beside the source code itself.
- **Production distribution status**: `eas.json` and bundle identifiers are configured, but nothing in this repo confirms whether the app is currently live on the App Store / Play Store, in internal testing, or unreleased.
- **Discover (`(discover)`) vs. the web's own `/discover` page**: the sibling web app has its own Discover feature (`src/app/discover`); this audit didn't verify whether the mobile Discover feed and web Discover page are kept feature-equivalent or diverge independently.

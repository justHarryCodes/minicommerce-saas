import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────
// A store on the Free plan can't use paid features through any door —
// dashboard API, storefront, checkout or background jobs — and stores
// can't reach into each other's data.
// ─────────────────────────────────────────────────────────────────────────

process.env.NEXT_PUBLIC_APP_URL = "https://dukanigeria.com";
vi.mock("@/lib/plan", async () => (await import("./helpers/plan-mock")).planMock.module());
vi.mock("@/lib/db", () => ({
  query: vi.fn().mockResolvedValue([]),
  queryOne: vi.fn(),
  queryMany: vi.fn().mockResolvedValue([]),
  withTransaction: vi.fn(),
  toCamel: (r: Record<string, unknown>) => r,
}));
vi.mock("@/lib/auth", () => ({ verifySession: vi.fn(), getUserStore: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((to: string) => { throw new Error(`REDIRECT:${to}`); }) }));
vi.mock("@/lib/store-cache", () => ({ invalidateStore: vi.fn(), invalidateStoreSoon: vi.fn(), storeCached: vi.fn((_s: string, _k: string, fn: () => unknown) => fn()) }));
vi.mock("@/lib/redis", () => ({
  cacheDel: vi.fn(), cacheGet: vi.fn().mockResolvedValue(null), cacheSet: vi.fn(), cacheDelPattern: vi.fn(),
  getOrSet: vi.fn(async (_k: string, fn: () => unknown) => fn()),
  cacheKey: { storeMeta: (s: string) => `store:${s}`, storeProducts: (s: string) => `products:${s}`, storeCategories: (s: string) => `categories:${s}`, productDetail: (a: string, b: string) => `product:${a}:${b}` },
  CacheKey: { store: (s: string) => `store:${s}`, products: (s: string) => `products:${s}`, categories: (s: string) => `categories:${s}`, product: (a: string, b: string) => `product:${a}:${b}` },
  TTL: { STORE_META: 1, PRODUCT_LIST: 1, CATEGORY_LIST: 1, PRODUCT_DETAIL: 1 },
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/push", () => ({ notifyStoreNewOrder: vi.fn().mockResolvedValue(undefined), notifyStoreEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/webpush", () => ({ sendWebPushToSubject: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/notify/providers", () => ({
  smsConfigured: () => true,
  emailConfigured: () => true,
  sendSms: vi.fn().mockResolvedValue({ ok: true }),
  sendEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

import { planMock } from "./helpers/plan-mock";
import { query, queryOne, withTransaction } from "@/lib/db";
import { verifySession, getUserStore } from "@/lib/auth";
import { getStoreAccess } from "@/lib/access";
import { checkCoupon } from "@/lib/coupons";
import { checkGiftCard } from "@/lib/gift-cards";
import { loyaltyFor } from "@/lib/loyalty";
import { notifyCustomer } from "@/lib/notify/order-messages";
import { sendDueCartReminders } from "@/lib/notify/cart-reminders";
import { sendSms } from "@/lib/notify/providers";
import { slugForHostname } from "@/lib/domains";
import { trustedStoreForward } from "@/lib/store-forward";
import { newOrderNumber } from "@/lib/order-number";
import { foreignCategory, ownProductIds } from "@/lib/tenant";

const mockedQuery = vi.mocked(query);
const mockedQueryOne = vi.mocked(queryOne);
const mockedWithTransaction = vi.mocked(withTransaction);
const mockedVerify = vi.mocked(verifySession);
const mockedGetUserStore = vi.mocked(getUserStore);

const STORE_ID = "11111111-1111-1111-1111-111111111111";
const PRODUCT_ID = "22222222-2222-2222-2222-222222222222";
const owner = { firebaseUid: "uid-owner", email: "owner@example.com" };
const store = { id: STORE_ID, name: "Bukka", slug: "bukka", is_active: true } as never;
const json = (body: unknown) => ({ json: async () => body, nextUrl: new URL("https://x/") }) as unknown as NextRequest;
const asOwner = () => {
  mockedVerify.mockResolvedValueOnce(owner);
  mockedGetUserStore.mockResolvedValue(store);
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedQuery.mockResolvedValue([]);
  mockedGetUserStore.mockReset();
  planMock.set([]); // every test here starts on the Free plan
});

/* ───────────────────── Dashboard APIs refuse ───────────────────── */

describe("Free plan: dashboard APIs answer 403 plan_required", () => {
  const cases: [string, () => Promise<Response>][] = [
    ["team invite", async () => (await import("@/app/api/dashboard/team/route")).POST(json({ email: "a@b.com", role: "staff" }))],
    ["gift card issue", async () => (await import("@/app/api/dashboard/gift-cards/route")).POST(json({ kind: "gift_card", amount: 5000 }))],
    ["loyalty settings", async () => (await import("@/app/api/dashboard/loyalty/route")).PATCH(json({ everyN: 5, percent: 10 }))],
    ["sales channels", async () => (await import("@/app/api/dashboard/channels/route")).PATCH(json({ feedsEnabled: true }))],
    ["premium theme", async () => (await import("@/app/api/stores/theme/route")).PUT(json({ themeId: "grill-house" }))],
    ["blog post", async () => (await import("@/app/api/dashboard/pages/route")).POST(json({ kind: "post" }))],
    ["bookable product", async () => {
      mockedQuery.mockResolvedValueOnce([{ count: "0" }]); // under the product limit
      return (await import("@/app/api/products/route")).POST(json({ name: "Haircut", price: 5000, isBookable: true, images: [] }));
    }],
  ];
  for (const [name, call] of cases) {
    it(name, async () => {
      asOwner();
      const res = await call();
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ code: "plan_required" });
      expect(mockedWithTransaction).not.toHaveBeenCalled();
    });
  }

  it("POS sale", async () => {
    const { POST } = await import("@/app/api/dashboard/pos/route");
    asOwner();
    const res = await POST(json({ items: [{ productId: PRODUCT_ID, quantity: 1 }], paymentMethod: "cash" }));
    expect(res.status).toBe(403);
    expect(mockedWithTransaction).not.toHaveBeenCalled();
  });

  it("free themes and blank pages still work", async () => {
    asOwner();
    const theme = await (await import("@/app/api/stores/theme/route")).PUT(json({ themeId: "classic" }));
    expect(theme.status).toBe(200);
    asOwner();
    mockedQueryOne.mockResolvedValueOnce({ n: 0 }).mockResolvedValueOnce({ id: "p1" });
    const page = await (await import("@/app/api/dashboard/pages/route")).POST(json({ kind: "page", template: "about" }));
    expect(page.status).toBe(201);
  });
});

/* ───────────────────── Storefront & checkout ───────────────────── */

describe("Free plan: storefront and checkout", () => {
  it("coupons are refused without even looking one up", async () => {
    const r = await checkCoupon(STORE_ID, "SAVE10", 10_000);
    expect(r.valid).toBe(false);
    expect(mockedQueryOne).not.toHaveBeenCalled();
  });

  it("gift cards can't be redeemed", async () => {
    const r = await checkGiftCard(STORE_ID, "GIFT-ABCD-2345-EFGH");
    expect(r.ok).toBe(false);
    expect(mockedQueryOne).not.toHaveBeenCalled();
  });

  it("no loyalty reward is applied", async () => {
    expect(await loyaltyFor({ id: STORE_ID, loyalty_every_n: 2, loyalty_percent: 10 }, "08012345678")).toBeNull();
  });

  it("the booking slot picker is closed", async () => {
    const { GET } = await import("@/app/api/storefront/[slug]/slots/route");
    mockedQueryOne.mockResolvedValueOnce({ id: STORE_ID });
    const req = { nextUrl: new URL(`https://x/?productId=${PRODUCT_ID}&date=2026-10-22`) } as unknown as NextRequest;
    const res = await GET(req, { params: Promise.resolve({ slug: "bukka" }) });
    expect(res.status).toBe(403);
  });

  it("back-in-stock sign-ups are refused", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/stock-alerts/route");
    mockedQueryOne.mockResolvedValueOnce({ id: PRODUCT_ID, store_id: STORE_ID });
    const res = await POST(json({ productId: PRODUCT_ID, phone: "08012345678" }), { params: Promise.resolve({ slug: "bukka" }) });
    expect(res.status).toBe(403);
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  it("product feeds 404", async () => {
    const { GET } = await import("@/app/api/feeds/[slug]/[file]/route");
    mockedQueryOne.mockResolvedValueOnce({ id: STORE_ID, name: "Bukka", slug: "bukka", feeds_enabled: true, custom_domain: null });
    const res = await GET(json({}), { params: Promise.resolve({ slug: "bukka", file: "google.xml" }) });
    expect(res.status).toBe(404);
  });

  it("a custom domain stops resolving", async () => {
    mockedQueryOne.mockResolvedValueOnce({ slug: "bukka", id: STORE_ID });
    expect(await slugForHostname("shop.bukka.com")).toBeNull();
    planMock.set(["custom_domain"]);
    mockedQueryOne.mockResolvedValueOnce({ slug: "bukka", id: STORE_ID });
    expect(await slugForHostname("shop.bukka.com")).toBe("bukka");
  });

  it("services can't be ordered", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne
      .mockResolvedValueOnce({ id: STORE_ID, is_active: true, payment_preference: "both", delivery_zones: [], pickup_enabled: true, pod_enabled: false, pod_deposit_percent: 0 })
      .mockResolvedValueOnce({ id: PRODUCT_ID, name: "Haircut", price: 5000, stock_quantity: 999, has_sizes: false, is_bookable: true, duration_minutes: 30 });
    const res = await POST(
      json({
        storeId: STORE_ID, customerName: "Ada", customerPhone: "08012345678", deliveryMethod: "appointment", paymentMethod: "transfer",
        items: [{ productId: PRODUCT_ID, quantity: 1, booking: { startsAt: "2026-10-22T10:00:00.000Z" } }],
      }),
      { params: Promise.resolve({ slug: "bukka" }) }
    );
    expect(res.status).toBe(400);
    expect(mockedWithTransaction).not.toHaveBeenCalled();
  });
});

/* ───────────────────── Background jobs ───────────────────── */

describe("Free plan: background jobs send nothing", () => {
  it("no customer SMS/email for orders", async () => {
    mockedQueryOne.mockResolvedValueOnce({ order_number: "ORD-1", access_token: "t", notifications: true, store_id: STORE_ID, customer_phone: "08012345678" });
    await notifyCustomer("order-1", "placed");
    expect(sendSms).not.toHaveBeenCalled();
  });

  it("abandoned carts aren't reminded — and stay unclaimed for after an upgrade", async () => {
    mockedQuery
      .mockResolvedValueOnce([]) // close out recovered sessions
      .mockResolvedValueOnce([{ id: "cs1", token: "t", customer_name: "Ada", customer_phone: "2348012345678", subtotal: 5000, store_name: "Bukka", store_slug: "bukka", store_id: STORE_ID }]);
    const r = await sendDueCartReminders();
    expect(r).toMatchObject({ sent: 0, skipped: 1 });
    expect(sendSms).not.toHaveBeenCalled();
    expect(mockedQuery.mock.calls.some(([sql]) => String(sql).includes("SET reminder_sent_at"))).toBe(false);
  });
});

/* ───────────────────── Team ───────────────────── */

describe("team logins follow the owner's plan", () => {
  it("a member gets no access while the plan lacks team accounts", async () => {
    mockedGetUserStore.mockResolvedValueOnce(null);
    mockedQueryOne.mockResolvedValueOnce({ id: STORE_ID, __member_id: "m1", __member_role: "manager" });
    expect(await getStoreAccess({ firebaseUid: "uid-staff" })).toBeNull();
  });

  it("…and gets it back when the plan includes them", async () => {
    planMock.set(["team"]);
    mockedGetUserStore.mockResolvedValueOnce(null);
    mockedQueryOne.mockResolvedValueOnce({ id: STORE_ID, __member_id: "m1", __member_role: "manager" });
    expect(await getStoreAccess({ firebaseUid: "uid-staff" })).toMatchObject({ role: "manager" });
  });
});

/* ───────────────────── Store isolation ───────────────────── */

describe("stores never get mixed up", () => {
  const headers = (h: Record<string, string>) => (n: string) => h[n] ?? null;

  it("only believes a 'this is store X' header from the Worker, for the same store as the URL", () => {
    // From the Worker, matching path
    expect(trustedStoreForward("/store/bukka/products/x", headers({ "x-store-slug": "bukka", "x-worker-secret": "s3cret" }), "s3cret")).toBe(true);
    // Forged: no / wrong secret
    expect(trustedStoreForward("/store/bukka", headers({ "x-store-slug": "bukka" }), "s3cret")).toBe(false);
    expect(trustedStoreForward("/store/bukka", headers({ "x-store-slug": "bukka", "x-worker-secret": "nope" }), "s3cret")).toBe(false);
    // Header names a different store than the URL — never trusted, secret or not
    expect(trustedStoreForward("/store/bukka", headers({ "x-store-slug": "rival", "x-worker-secret": "s3cret" }), "s3cret")).toBe(false);
    expect(trustedStoreForward("/store/bukka", headers({ "x-store-slug": "rival" }), undefined)).toBe(false);
    expect(trustedStoreForward("/store/%E0%A4%A", headers({ "x-store-slug": "x" }), undefined)).toBe(false);
    // No header, nothing to trust
    expect(trustedStoreForward("/store/bukka", headers({}), undefined)).toBe(false);
  });

  it("order numbers don't collide between stores in the same millisecond", () => {
    const now = Date.now;
    Date.now = () => 1_800_000_000_000;
    try {
      const nums = new Set(Array.from({ length: 500 }, () => newOrderNumber()));
      expect(nums.size).toBe(500);
      expect([...nums][0]).toMatch(/^ORD-[0-9A-Z]+-[A-HJ-NP-Z2-9]{6}$/);
      expect(newOrderNumber("POS")).toMatch(/^POS-/);
    } finally {
      Date.now = now;
    }
  });

  it("a product can't be filed under another store's category", async () => {
    mockedQueryOne.mockResolvedValueOnce(null);
    expect(await foreignCategory(STORE_ID, "33333333-3333-3333-3333-333333333333", null)).toBe("Category not found");
    expect(mockedQueryOne.mock.calls[0][1]).toEqual(["33333333-3333-3333-3333-333333333333", STORE_ID]);
    mockedQueryOne.mockResolvedValueOnce({ "?column?": 1 }).mockResolvedValueOnce(null);
    expect(await foreignCategory(STORE_ID, "c1", "sub-of-someone-else")).toBe("Subcategory not found");
    expect(await foreignCategory(STORE_ID, null, null)).toBeNull();
  });

  it("only a store's own products can be featured or tagged in reels", async () => {
    mockedQuery.mockResolvedValueOnce([{ id: "mine-1" }, { id: "mine-2" }]);
    expect(await ownProductIds(STORE_ID, ["mine-2", "theirs", "mine-1", "mine-2"])).toEqual(["mine-2", "mine-1"]);
    expect(mockedQuery.mock.calls[0][1]).toEqual([STORE_ID, ["mine-2", "theirs", "mine-1", "mine-2"]]);
    expect(await ownProductIds(STORE_ID, [])).toEqual([]);
  });

  it("featuring a product saves only this store's ids", async () => {
    const { PUT } = await import("@/app/api/stores/featured/route");
    asOwner();
    mockedQuery.mockResolvedValueOnce([{ id: PRODUCT_ID }]).mockResolvedValue([]);
    const res = await PUT(json({ product_ids: [PRODUCT_ID, "44444444-4444-4444-4444-444444444444"] }));
    expect(res.status).toBe(200);
    const update = mockedQuery.mock.calls.find(([sql]) => String(sql).includes("featured_product_ids"))!;
    expect(update[1]).toEqual([[PRODUCT_ID], STORE_ID]);
  });
});

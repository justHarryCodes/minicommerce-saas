import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────
// Tier 4: team roles & invitations, store pages (safe rich text), gift
// cards / store credit, loyalty rewards, catalog feeds and the POS till.
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
vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
}));
vi.mock("@/lib/push", () => ({ notifyStoreNewOrder: vi.fn().mockResolvedValue(undefined), notifyStoreEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/webpush", () => ({ sendWebPushToSubject: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/notify/order-messages", () => ({ notifyCustomer: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/notify/providers", () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: false, error: "not configured" }),
  sendSms: vi.fn().mockResolvedValue({ ok: false, error: "not configured" }),
}));
vi.mock("@/lib/inventory", () => ({
  alertLowStock: vi.fn().mockResolvedValue(undefined),
  crossedLowStock: () => false,
  effectiveThreshold: () => 3,
  recordMovements: vi.fn().mockResolvedValue(undefined),
}));

import { query, queryOne, withTransaction } from "@/lib/db";
import { verifySession, getUserStore } from "@/lib/auth";
import { allowedPath, can, permissionForPath } from "@/lib/access-shared";
import { getPageStore, getStoreAccess, getStoreFor } from "@/lib/access";
import { acceptInvite, inviteExpired } from "@/lib/team";
import { parseInline, parseRichText, plainText, safeHref } from "@/lib/rich-text";
import { formatGiftCode, giftCardCovers, normaliseGiftCode } from "@/lib/gift-cards-shared";
import { generateGiftCode, giftCardUsable } from "@/lib/gift-cards";
import { loyaltyDiscount, loyaltySettingsOf, loyaltyStatus } from "@/lib/loyalty-shared";
import { computeTotals } from "@/lib/order-pricing";
import { csvFeed, rssFeed, toFeedItem, xmlEscape } from "@/lib/feeds";
import { cashChange, quickCashAmounts } from "@/lib/pos-shared";

const mockedQuery = vi.mocked(query);
const mockedQueryOne = vi.mocked(queryOne);
const mockedWithTransaction = vi.mocked(withTransaction);
const mockedVerify = vi.mocked(verifySession);
const mockedGetUserStore = vi.mocked(getUserStore);

beforeEach(() => {
  vi.clearAllMocks();
  mockedQuery.mockResolvedValue([]);
});

const STORE_ID = "11111111-1111-1111-1111-111111111111";
const PRODUCT_ID = "22222222-2222-2222-2222-222222222222";
const store = { id: STORE_ID, name: "Bukka", slug: "bukka", is_active: true } as never;
const staffUser = { firebaseUid: "uid-staff", email: "ada@example.com" };

/* ───────────────────────────── Roles ───────────────────────────── */

describe("role permissions", () => {
  it("keeps settings, billing, team and payouts owner-only", () => {
    for (const path of ["/dashboard/settings", "/dashboard/billing", "/dashboard/team", "/dashboard/themes", "/dashboard/channels", "/dashboard/coupons", "/dashboard/storefront"]) {
      expect(allowedPath("owner", path)).toBe(true);
      expect(allowedPath("manager", path)).toBe(false);
      expect(allowedPath("staff", path)).toBe(false);
    }
  });

  it("lets managers run the catalogue and staff run the counter", () => {
    expect(allowedPath("manager", "/dashboard/products/abc/edit")).toBe(true);
    expect(allowedPath("manager", "/dashboard")).toBe(true);
    expect(allowedPath("staff", "/dashboard")).toBe(false);
    expect(allowedPath("staff", "/dashboard/orders")).toBe(true);
    expect(allowedPath("staff", "/dashboard/pos")).toBe(true);
    expect(allowedPath("staff", "/dashboard/inventory")).toBe(true);
    expect(allowedPath("staff", "/dashboard/products")).toBe(false);
    expect(allowedPath("staff", "/dashboard/customers")).toBe(false);
    expect(can("staff", "products")).toBe(false);
  });

  it("doesn't let a look-alike path borrow a permission", () => {
    expect(permissionForPath("/dashboard/ordersettings")).toBe("owner");
    expect(permissionForPath("/dashboard/unknown")).toBe("owner");
  });
});

describe("getStoreAccess", () => {
  it("prefers the store the user owns", async () => {
    mockedGetUserStore.mockResolvedValueOnce(store);
    const a = await getStoreAccess(staffUser);
    expect(a).toMatchObject({ role: "owner", memberId: null });
    expect(mockedQueryOne).not.toHaveBeenCalled();
  });

  it("falls back to an active membership with its role", async () => {
    mockedGetUserStore.mockResolvedValueOnce(null);
    mockedQueryOne.mockResolvedValueOnce({ id: STORE_ID, name: "Bukka", __member_id: "m1", __member_role: "staff" });
    const a = await getStoreAccess(staffUser);
    expect(a).toMatchObject({ role: "staff", memberId: "m1", store: { id: STORE_ID } });
    expect(a!.store).not.toHaveProperty("__member_role");
    const [sql, params] = mockedQueryOne.mock.calls[0];
    expect(sql).toMatch(/m\.status = 'active'/);
    expect(params).toEqual(["uid-staff"]);
  });

  it("returns no store when the role lacks the permission", async () => {
    mockedGetUserStore.mockResolvedValueOnce(null);
    mockedQueryOne.mockResolvedValueOnce({ id: STORE_ID, __member_id: "m1", __member_role: "staff" });
    expect(await getStoreFor(staffUser, "customers")).toBeNull();
  });

  it("redirects a page visit the role can't make", async () => {
    mockedGetUserStore.mockResolvedValueOnce(null);
    mockedQueryOne.mockResolvedValueOnce({ id: STORE_ID, __member_id: "m1", __member_role: "staff" });
    await expect(getPageStore(staffUser, "analytics")).rejects.toThrow("REDIRECT:/dashboard/orders");
  });
});

/* ──────────────────────────── Invitations ──────────────────────────── */

const invite = (over: Record<string, unknown> = {}) => ({
  id: "m1",
  email: "Ada@Example.com",
  role: "manager",
  store_id: STORE_ID,
  store_name: "Bukka",
  store_logo: null,
  invited_at: new Date().toISOString(),
  ...over,
});

describe("team invitations", () => {
  it("expires after 14 days", () => {
    const now = new Date("2026-10-21T12:00:00Z");
    expect(inviteExpired("2026-10-10T12:00:00Z", now)).toBe(false);
    expect(inviteExpired("2026-10-06T12:00:00Z", now)).toBe(true);
  });

  it("only accepts for the invited email (case-insensitive)", async () => {
    mockedQueryOne.mockResolvedValueOnce(invite());
    const r = await acceptInvite("tok-1234567890", { firebaseUid: "u2", email: "someone@else.com" });
    expect(r).toMatchObject({ ok: false, status: 403 });
    expect(mockedQueryOne).toHaveBeenCalledTimes(1); // nothing written
  });

  it("refuses an account that already owns a store", async () => {
    mockedQueryOne.mockResolvedValueOnce(invite()).mockResolvedValueOnce({ "?column?": 1 });
    const r = await acceptInvite("tok-1234567890", { firebaseUid: "u2", email: "ada@example.com" });
    expect(r).toMatchObject({ ok: false, status: 409 });
  });

  it("activates the membership and burns the token", async () => {
    mockedQueryOne.mockResolvedValueOnce(invite()).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "m1" });
    const r = await acceptInvite("tok-1234567890", { firebaseUid: "u2", email: "ada@example.com" });
    expect(r).toEqual({ ok: true, storeName: "Bukka" });
    const [sql, params] = mockedQueryOne.mock.calls[2];
    expect(sql).toMatch(/invite_token = NULL/);
    expect(params).toEqual(["m1", "u2", "tok-1234567890"]);
  });

  it("rejects an expired invite", async () => {
    mockedQueryOne.mockResolvedValueOnce(invite({ invited_at: "2020-01-01T00:00:00Z" }));
    const r = await acceptInvite("tok-1234567890", { firebaseUid: "u2", email: "ada@example.com" });
    expect(r).toMatchObject({ ok: false, status: 410 });
  });
});

describe("team API", () => {
  it("is owner-only", async () => {
    const { POST } = await import("@/app/api/dashboard/team/route");
    mockedVerify.mockResolvedValueOnce(staffUser);
    mockedGetUserStore.mockResolvedValueOnce(null);
    const res = await POST({ json: async () => ({ email: "x@y.com", role: "staff" }) } as unknown as NextRequest);
    expect(res.status).toBe(403);
  });
});

/* ──────────────────────────── Rich text ──────────────────────────── */

describe("store page rich text", () => {
  it("parses headings, lists, quotes and paragraphs", () => {
    const blocks = parseRichText("# Story\n\nWe sell **great** shoes.\nSince 2019.\n\n- one\n- two\n\n1. first\n\n> quote\n\n---");
    expect(blocks.map((b) => b.t)).toEqual(["h", "p", "ul", "ol", "quote", "hr"]);
    expect(blocks[1]).toMatchObject({ t: "p", c: [[{ t: "text", v: "We sell " }, { t: "bold" }, { t: "text", v: " shoes." }], [{ t: "text", v: "Since 2019." }]] });
  });

  it("drops unsafe links but keeps their text", () => {
    expect(parseInline("[click](javascript:alert(1))")).toEqual([{ t: "text", v: "click" }]);
    expect(parseInline("[x](//evil.com)")).toEqual([{ t: "text", v: "x" }]);
    expect(parseInline("[Shop](https://a.com)")).toEqual([{ t: "link", href: "https://a.com", c: [{ t: "text", v: "Shop" }] }]);
    expect(safeHref("/pages/faq")).toBe("/pages/faq");
    expect(safeHref("data:text/html,x")).toBeNull();
  });

  it("never treats raw HTML as markup", () => {
    expect(parseInline("<script>alert(1)</script>")).toEqual([{ t: "text", v: "<script>alert(1)</script>" }]);
  });

  it("leaves a lone asterisk alone and builds plain-text excerpts", () => {
    expect(parseInline("5 * 3 = 15")).toEqual([{ t: "text", v: "5 * 3 = 15" }]);
    expect(plainText("## Hello\n\nThis is **bold** and [a link](https://x.y).", 200)).toBe("Hello This is bold and a link.");
    expect(plainText("word ".repeat(100), 20).length).toBeLessThanOrEqual(20);
  });
});

/* ──────────────────────── Gift cards & loyalty ──────────────────────── */

describe("gift cards", () => {
  it("generates readable codes without ambiguous characters", () => {
    for (let i = 0; i < 50; i++) {
      const c = generateGiftCode();
      expect(c).toMatch(/^GIFT-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    }
  });

  it("accepts the code however it's typed", () => {
    expect(formatGiftCode(normaliseGiftCode("gift abcd-2345 efgh"))).toBe("GIFT-ABCD-2345-EFGH");
    expect(formatGiftCode("abcd2345efgh")).toBe("GIFT-ABCD-2345-EFGH");
  });

  it("checks disabled, expired and empty cards", () => {
    const now = new Date("2026-10-21T10:00:00Z");
    expect(giftCardUsable({ is_active: true, balance: 500, expires_at: "2026-10-21" }, now)).toBeNull(); // last valid day
    expect(giftCardUsable({ is_active: true, balance: 500, expires_at: "2026-10-20" }, now)).toMatch(/expired/);
    expect(giftCardUsable({ is_active: false, balance: 500, expires_at: null }, now)).toMatch(/disabled/);
    expect(giftCardUsable({ is_active: true, balance: 0, expires_at: null }, now)).toMatch(/no balance/);
  });

  it("only spends what the order needs", () => {
    expect(giftCardCovers(10_000, 4_500)).toBe(4_500);
    expect(giftCardCovers(3_000, 4_500)).toBe(3_000);
    expect(computeTotals({ subtotal: 8_000, discount: 1_000, deliveryFee: 1_500, payOnDelivery: false, depositPercent: 0, giftCardBalance: 5_000 })).toEqual({
      subtotal: 8_000, discount: 1_000, deliveryFee: 1_500, giftCard: 5_000, total: 3_500, deposit: 0,
    });
    expect(computeTotals({ subtotal: 2_000, discount: 0, deliveryFee: 0, payOnDelivery: true, depositPercent: 50, giftCardBalance: 9_000 })).toMatchObject({
      giftCard: 2_000, total: 0, deposit: 0,
    });
  });
});

describe("loyalty", () => {
  it("rewards exactly every Nth order", () => {
    // every 5th: previous 0..3 → not yet; 4 → this is the 5th
    expect([0, 1, 2, 3, 4, 5, 9].map((n) => loyaltyStatus(n, 5))).toEqual([
      { eligible: false, remaining: 4 },
      { eligible: false, remaining: 3 },
      { eligible: false, remaining: 2 },
      { eligible: false, remaining: 1 },
      { eligible: true, remaining: 0 },
      { eligible: false, remaining: 4 },
      { eligible: true, remaining: 0 },
    ]);
  });

  it("reads settings defensively and rounds the reward", () => {
    expect(loyaltySettingsOf({ loyalty_every_n: null })).toBeNull();
    expect(loyaltySettingsOf({ loyalty_every_n: 1, loyalty_percent: 10 })).toBeNull();
    expect(loyaltySettingsOf({ loyalty_every_n: 5, loyalty_percent: 15 })).toEqual({ everyN: 5, percent: 15 });
    expect(loyaltyDiscount(12_345, 10)).toBe(1_235);
    expect(loyaltyDiscount(-5, 10)).toBe(0);
  });
});

/* ──────────────────── Order API: loyalty + gift card ──────────────────── */

const storeRow = (over: Record<string, unknown> = {}) => ({
  id: STORE_ID,
  is_active: true,
  payment_preference: "both",
  delivery_zones: [],
  free_delivery_threshold: null,
  pickup_enabled: true,
  pickup_address: null,
  pod_enabled: false,
  pod_deposit_percent: 0,
  loyalty_every_n: null,
  loyalty_percent: 10,
  ...over,
});
const product = { id: PRODUCT_ID, name: "Burger", price: 5_000, stock_quantity: 10, has_sizes: false, image_url: null, images: [] };
const orderBody = (over: Record<string, unknown> = {}) => ({
  storeId: STORE_ID,
  customerName: "Ada",
  customerPhone: "08012345678",
  deliveryMethod: "pickup",
  paymentMethod: "transfer",
  items: [{ productId: PRODUCT_ID, quantity: 2 }],
  ...over,
});
const ctx = { params: Promise.resolve({ slug: "bukka" }) };

function fakeClient(giftBalanceAfter: number | null = null) {
  const client = {
    query: vi.fn(async (sql: string, _params?: unknown[]) => {
      if (sql.includes("INSERT INTO orders")) return { rows: [{ id: "order-1", order_number: "ORD-1", access_token: "tok" }] };
      if (sql.includes("UPDATE gift_cards")) return { rows: giftBalanceAfter == null ? [] : [{ balance: String(giftBalanceAfter) }] };
      if (sql.includes("UPDATE products")) return { rows: [{ stock_quantity: 8 }] };
      return { rows: [] };
    }),
  };
  mockedWithTransaction.mockImplementation(async (fn) => fn(client as never));
  return client;
}
const insertParams = (client: ReturnType<typeof fakeClient>) =>
  (client.query.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO orders")) as unknown as [string, unknown[]])[1];

describe("POST /api/storefront/[slug]/orders — Tier 4", () => {
  it("applies the loyalty reward on the Nth paid order", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne
      .mockResolvedValueOnce(storeRow({ loyalty_every_n: 3, loyalty_percent: 10 }))
      .mockResolvedValueOnce(product)
      .mockResolvedValueOnce({ n: 2 }); // two earlier orders → this is the 3rd
    const client = fakeClient();
    const res = await POST({ json: async () => orderBody() } as unknown as NextRequest, ctx);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.totals).toMatchObject({ subtotal: 10_000, discount: 1_000, total: 9_000 });
    expect(body.loyaltyApplied).toEqual({ amount: 1_000, percent: 10 });
    const p = insertParams(client);
    expect(p[21]).toBe(1_000); // loyalty_discount
  });

  it("redeems a gift card inside the transaction and marks a fully covered order paid", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne
      .mockResolvedValueOnce(storeRow())
      .mockResolvedValueOnce(product)
      .mockResolvedValueOnce({ id: "card-1", code: "GIFT-ABCD-2345-EFGH", is_active: true, balance: 25_000, expires_at: null });
    const client = fakeClient(15_000);
    const res = await POST({ json: async () => orderBody({ giftCardCode: "abcd2345efgh" }) } as unknown as NextRequest, ctx);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.totals).toMatchObject({ giftCard: 10_000, total: 0 });
    expect(body.paysOnlineNow).toBe(false);
    const p = insertParams(client);
    expect(p[15]).toBe("gift_card"); // payment_method
    expect(p[19]).toBe("GIFT-ABCD-2345-EFGH");
    expect(p[22]).toBe("paid");
    const redeem = client.query.mock.calls.find(([sql]) => String(sql).includes("UPDATE gift_cards"))!;
    expect(redeem[1]).toEqual(["card-1", 10_000]);
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes("gift_card_ledger"))).toBe(true);
  });

  it("fails with 409 when the card was spent in the meantime", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne
      .mockResolvedValueOnce(storeRow())
      .mockResolvedValueOnce(product)
      .mockResolvedValueOnce({ id: "card-1", code: "GIFT-ABCD-2345-EFGH", is_active: true, balance: 25_000, expires_at: null });
    fakeClient(null);
    const res = await POST({ json: async () => orderBody({ giftCardCode: "GIFT-ABCD-2345-EFGH" }) } as unknown as NextRequest, ctx);
    expect(res.status).toBe(409);
  });
});

/* ──────────────────────────── Feeds ──────────────────────────── */

describe("catalog feeds", () => {
  const feedStore = { name: "Bukka & Co", url: "https://bukka.dukanigeria.com" };
  const base = { id: "p1", slug: "jollof", name: "Jollof <XL>", description: "Smoky\n party   jollof", price: 4500, stock_quantity: 3, image_url: "https://res.cloudinary.com/a.jpg", images: ["https://res.cloudinary.com/a.jpg", "https://res.cloudinary.com/b.jpg"] };

  it("maps a product to a catalog item, with sale pricing", () => {
    const item = toFeedItem({ ...base, compare_price: 6000 }, feedStore, "2026-10-21")!;
    expect(item).toMatchObject({
      link: "https://bukka.dukanigeria.com/products/jollof",
      availability: "in_stock",
      price: "6000.00 NGN",
      salePrice: "4500.00 NGN",
      brand: "Bukka & Co",
      description: "Smoky party jollof",
      additionalImages: ["https://res.cloudinary.com/b.jpg"],
    });
  });

  it("marks sold-out-today items out of stock and skips products without a photo", () => {
    expect(toFeedItem({ ...base, sold_out_until: "2026-10-21" }, feedStore, "2026-10-21")!.availability).toBe("out_of_stock");
    expect(toFeedItem({ ...base, stock_quantity: 0 }, feedStore, "2026-10-21")!.availability).toBe("out_of_stock");
    expect(toFeedItem({ ...base, image_url: null, images: [] }, feedStore, "2026-10-21")).toBeNull();
  });

  it("escapes XML and neutralises CSV formulas", () => {
    const item = toFeedItem(base, feedStore, "2026-10-21")!;
    const xml = rssFeed(feedStore, [item]);
    expect(xml).toContain("<g:title>Jollof &lt;XL&gt;</g:title>");
    expect(xml).toContain("<title>Bukka &amp; Co</title>");
    expect(xml).toContain("<g:identifier_exists>no</g:identifier_exists>");
    expect(xmlEscape("a\u0001b")).toBe("ab");
    const csv = csvFeed([{ ...item, title: "=HYPERLINK(\"x\")" }]);
    expect(csv.split("\n")[1]).toContain(`"'=HYPERLINK(""x"")"`);
  });
});

/* ──────────────────────────── POS ──────────────────────────── */

describe("POS till", () => {
  it("works out change and quick cash buttons", () => {
    expect(cashChange(10_000, 7_450)).toBe(2_550);
    expect(cashChange(5_000, 7_450)).toBe(-2_450);
    expect(cashChange(0, 7_450)).toBeNull();
    expect(quickCashAmounts(7_450)).toEqual([7_450, 7_500, 8_000, 10_000]);
    expect(quickCashAmounts(0)).toEqual([]);
  });

  it("won't let staff give discounts", async () => {
    const { POST } = await import("@/app/api/dashboard/pos/route");
    mockedVerify.mockResolvedValueOnce(staffUser);
    mockedGetUserStore.mockResolvedValueOnce(null);
    mockedQueryOne.mockResolvedValueOnce({ id: STORE_ID, __member_id: "m1", __member_role: "staff" });
    const res = await POST({
      json: async () => ({ items: [{ productId: PRODUCT_ID, quantity: 1 }], paymentMethod: "cash", discount: 500 }),
    } as unknown as NextRequest);
    expect(res.status).toBe(403);
    expect(mockedWithTransaction).not.toHaveBeenCalled();
  });

  it("rings up a paid, delivered in-store sale and takes the stock", async () => {
    const { POST } = await import("@/app/api/dashboard/pos/route");
    mockedVerify.mockResolvedValueOnce(staffUser);
    mockedGetUserStore.mockResolvedValueOnce(null);
    mockedQueryOne
      .mockResolvedValueOnce({ id: STORE_ID, slug: "bukka", __member_id: "m1", __member_role: "staff" })
      .mockResolvedValueOnce({ ...product, low_stock_threshold: null, is_bookable: false });
    const client = fakeClient();
    const res = await POST({
      json: async () => ({ items: [{ productId: PRODUCT_ID, quantity: 2 }], paymentMethod: "cash" }),
    } as unknown as NextRequest);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.totals).toMatchObject({ subtotal: 10_000, total: 10_000 });
    expect(body.receiptUrl).toMatch(/\/receipt\/ORD-1\?t=tok$/);
    const [sql, p] = client.query.mock.calls.find(([s]) => String(s).includes("INSERT INTO orders")) as unknown as [string, unknown[]];
    expect(sql).toMatch(/'paid','delivered'/);
    expect(sql).toMatch(/'pos'/);
    expect(p[2]).toBe("Walk-in customer");
    expect(p[8]).toBe("cash");
    expect(p[12]).toBe("uid-staff"); // created_by
    const stock = client.query.mock.calls.find(([s]) => String(s).includes("UPDATE products SET stock_quantity"))!;
    expect(stock[1]).toEqual([2, PRODUCT_ID, false, STORE_ID]);
  });
});

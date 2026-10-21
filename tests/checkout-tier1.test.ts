import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────
// Tier 1 checkout: delivery zones/fees, pay on delivery, coupon re-checks,
// customer messages and abandoned-cart reminders — and above all that the
// order API prices everything from the database, never from the client.
// ─────────────────────────────────────────────────────────────────────────

process.env.NEXT_PUBLIC_APP_URL = "https://dukanigeria.com";

vi.mock("@/lib/plan", async () => (await import("./helpers/plan-mock")).planMock.module());
vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn(), withTransaction: vi.fn() }));
vi.mock("@/lib/push", () => ({ notifyStoreNewOrder: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/webpush", () => ({ sendWebPushToSubject: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn().mockResolvedValue(null) }));

import { queryOne, withTransaction } from "@/lib/db";
import { depositFor, parseZones, quoteDelivery, zoneIdFor, type DeliverySettings } from "@/lib/delivery";
import { computeTotals } from "@/lib/order-pricing";
import { evaluateCoupon } from "@/lib/coupons";
import { toNgInternational, whatsappLink } from "@/lib/phone";
import { buildOrderMessage, eventsForChange, type OrderMessageData } from "@/lib/notify/order-messages";
import { buildCartReminder } from "@/lib/notify/cart-reminders";

const mockedQueryOne = vi.mocked(queryOne);
const mockedWithTransaction = vi.mocked(withTransaction);

beforeEach(() => vi.clearAllMocks());

/* ───────────────────────────── Delivery ───────────────────────────── */

const settings = (over: Partial<DeliverySettings> = {}): DeliverySettings => ({
  zones: [
    { id: "island", name: "Lagos Island", fee: 2500 },
    { id: "mainland", name: "Lagos Mainland", fee: 3000 },
  ],
  freeDeliveryThreshold: null,
  pickupEnabled: false,
  pickupAddress: null,
  ...over,
});

describe("delivery", () => {
  it("parses zones, dropping malformed entries and duplicate ids", () => {
    const zones = parseZones([
      { id: "a", name: "Area A", fee: "1500" },
      { id: "a", name: "Dup", fee: 1 },
      { id: "", name: "No id", fee: 1 },
      { id: "b", name: "Neg", fee: -5 },
      "junk",
      { id: "c", name: "Area C", fee: 999.6 },
    ]);
    expect(zones).toEqual([
      { id: "a", name: "Area A", fee: 1500 },
      { id: "c", name: "Area C", fee: 1000 },
    ]);
    expect(parseZones("nope")).toEqual([]);
  });

  it("charges the chosen zone's fee", () => {
    expect(quoteDelivery(settings(), { method: "delivery", zoneId: "mainland" }, 10_000)).toMatchObject({ ok: true, fee: 3000, zoneName: "Lagos Mainland" });
  });

  it("requires a zone when the store has zones", () => {
    expect(quoteDelivery(settings(), { method: "delivery", zoneId: null }, 10_000)).toMatchObject({ ok: false });
    expect(quoteDelivery(settings(), { method: "delivery", zoneId: "mars" }, 10_000)).toMatchObject({ ok: false });
  });

  it("makes delivery free at the threshold (measured after discount)", () => {
    const s = settings({ freeDeliveryThreshold: 20_000 });
    expect(quoteDelivery(s, { method: "delivery", zoneId: "island" }, 19_999)).toMatchObject({ fee: 2500, freeApplied: false });
    expect(quoteDelivery(s, { method: "delivery", zoneId: "island" }, 20_000)).toMatchObject({ fee: 0, freeApplied: true });
  });

  it("keeps the old 'to be arranged' flow when no zones are set", () => {
    expect(quoteDelivery(settings({ zones: [] }), { method: "delivery" }, 5000)).toMatchObject({ ok: true, fee: 0, zoneName: null });
  });

  it("only allows pickup when enabled", () => {
    expect(quoteDelivery(settings(), { method: "pickup" }, 5000)).toMatchObject({ ok: false });
    expect(quoteDelivery(settings({ pickupEnabled: true }), { method: "pickup" }, 5000)).toMatchObject({ ok: true, fee: 0, method: "pickup" });
  });

  it("rounds deposits up and makes unique zone ids", () => {
    expect(depositFor(10_001, 30)).toBe(3001);
    expect(depositFor(10_000, 0)).toBe(0);
    expect(zoneIdFor("Lekki / Ajah", [{ id: "lekki-ajah", name: "x", fee: 0 }])).toBe("lekki-ajah-2");
  });
});

describe("computeTotals", () => {
  it("adds delivery after the discount and computes the POD deposit", () => {
    expect(computeTotals({ subtotal: 20_000, discount: 2_000, deliveryFee: 2_500, payOnDelivery: true, depositPercent: 20 })).toEqual({
      subtotal: 20_000, discount: 2_000, deliveryFee: 2_500, giftCard: 0, total: 20_500, deposit: 4_100,
    });
  });
  it("never lets the discount exceed the subtotal", () => {
    expect(computeTotals({ subtotal: 1_000, discount: 5_000, deliveryFee: 500, payOnDelivery: false, depositPercent: 50 })).toMatchObject({
      discount: 1_000, total: 500, deposit: 0,
    });
  });
});

describe("evaluateCoupon", () => {
  const base = { id: "c1", discount_type: "percentage", discount_value: 10, min_order_amount: 5_000, max_uses: null, uses_count: 0, expires_at: null };
  it("applies percentage and fixed discounts", () => {
    expect(evaluateCoupon(base, 20_000)).toMatchObject({ valid: true, discount: 2_000 });
    expect(evaluateCoupon({ ...base, discount_type: "fixed", discount_value: 50_000 }, 20_000)).toMatchObject({ valid: true, discount: 20_000 });
  });
  it("rejects expired, used-up, below-minimum and missing coupons", () => {
    expect(evaluateCoupon({ ...base, expires_at: "2000-01-01" }, 20_000).valid).toBe(false);
    expect(evaluateCoupon({ ...base, max_uses: 3, uses_count: 3 }, 20_000).valid).toBe(false);
    expect(evaluateCoupon(base, 4_999).valid).toBe(false);
    expect(evaluateCoupon(null, 20_000).valid).toBe(false);
  });
});

describe("phone", () => {
  it("normalises Nigerian numbers", () => {
    for (const n of ["08012345678", "8012345678", "+234 801 234 5678", "2348012345678", "234 0801 234 5678"]) {
      expect(toNgInternational(n)).toBe("2348012345678");
    }
    expect(toNgInternational("12345")).toBeNull();
    expect(whatsappLink("08012345678", "hi there")).toBe("https://wa.me/2348012345678?text=hi%20there");
  });
});

/* ───────────────────────────── Messages ───────────────────────────── */

const msg = (over: Partial<OrderMessageData> = {}): OrderMessageData => ({
  storeName: "Bukka & Co.",
  storeSlug: "bukka",
  orderNumber: "ORD-ABC",
  accessToken: "a".repeat(32),
  customerName: "Ada Obi",
  total: 20_500,
  depositAmount: 0,
  paymentMethod: "bank_transfer",
  paymentStatus: "pending",
  deliveryMethod: "delivery",
  pickupAddress: null,
  deliveryTimeFrame: "1–2 business days",
  ...over,
});

describe("order messages", () => {
  it("confirmation includes amount, payment instruction and receipt link", () => {
    const { text } = buildOrderMessage("placed", msg());
    expect(text).toContain("Thanks Ada!");
    expect(text).toContain("₦20,500");
    expect(text).toContain("bank transfer");
    expect(text).toContain("https://dukanigeria.com/store/bukka/receipt/ORD-ABC?t=" + "a".repeat(32));
  });

  it("pay on delivery spells out deposit and balance", () => {
    const { text } = buildOrderMessage("placed", msg({ paymentMethod: "pay_on_delivery", depositAmount: 4_100 }));
    expect(text).toContain("₦4,100 deposit now");
    expect(text).toContain("₦16,400 on delivery");
    const dep = buildOrderMessage("deposit_paid", msg({ paymentMethod: "pay_on_delivery", depositAmount: 4_100, paymentStatus: "deposit_paid" }));
    expect(dep.text).toContain("Balance ₦16,400");
  });

  it("shipped says 'ready for pickup' for pickup orders and asks for the balance", () => {
    const { text } = buildOrderMessage("shipped", msg({ deliveryMethod: "pickup", pickupAddress: "12 Admiralty Way", paymentMethod: "pay_on_delivery" }));
    expect(text).toContain("ready for pickup at 12 Admiralty Way");
    expect(text).toContain("Amount due: ₦20,500");
  });

  it("keeps messages within two SMS segments", () => {
    for (const e of ["placed", "deposit_paid", "payment_confirmed", "confirmed", "shipped", "delivered", "cancelled"] as const) {
      expect(buildOrderMessage(e, msg({ paymentMethod: "pay_on_delivery", depositAmount: 4_100 })).text.length).toBeLessThanOrEqual(306);
    }
  });

  it("maps merchant status changes to messages without doubling up", () => {
    const pending = { order_status: "pending", payment_status: "pending_confirmation" };
    expect(eventsForChange(pending, { order_status: "confirmed", payment_status: "paid" })).toEqual(["payment_confirmed"]);
    expect(eventsForChange(pending, { order_status: "shipped", payment_status: "pending_confirmation" })).toEqual(["shipped"]);
    expect(eventsForChange(pending, { order_status: "processing", payment_status: "pending_confirmation" })).toEqual([]);
    expect(eventsForChange({ order_status: "shipped", payment_status: "paid" }, { order_status: "shipped", payment_status: "paid" })).toEqual([]);
  });

  it("builds the abandoned-cart reminder", () => {
    expect(buildCartReminder({ storeName: "Bukka & Co.", customerName: "Ada Obi", subtotal: 12_000, link: "https://x/y" })).toBe(
      "Bukka & Co.: Hi Ada, you left items worth ₦12,000 in your cart. They're still available — complete your order here: https://x/y"
    );
  });
});

/* ─────────────────────── Order API: server-side pricing ─────────────────────── */

const STORE_ID = "11111111-1111-1111-1111-111111111111";
const PRODUCT_ID = "22222222-2222-2222-2222-222222222222";

const storeRow = (over: Record<string, unknown> = {}) => ({
  id: STORE_ID,
  is_active: true,
  payment_preference: "both",
  delivery_zones: [{ id: "island", name: "Lagos Island", fee: 2500 }],
  free_delivery_threshold: null,
  pickup_enabled: true,
  pickup_address: "12 Admiralty Way",
  pod_enabled: true,
  pod_deposit_percent: 20,
  ...over,
});
const product = { id: PRODUCT_ID, name: "Burger", price: 5_000, stock_quantity: 10, has_sizes: false, image_url: null, images: [] };

function req(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}
const ctx = { params: Promise.resolve({ slug: "bukka" }) };

const order = {
  storeId: STORE_ID,
  customerName: "Ada",
  customerPhone: "08012345678",
  deliveryAddress: "1 Test Street",
};

function captureInsert() {
  const client = { query: vi.fn() };
  client.query.mockResolvedValueOnce({ rows: [{ id: "order-1", order_number: "ORD-1", access_token: "tok" }] });
  client.query.mockResolvedValue({ rows: [] });
  mockedWithTransaction.mockImplementation(async (fn) => fn(client as never));
  return () => {
    const insert = client.query.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO orders"));
    const [, p] = insert as [string, unknown[]];
    // column order in the route: … delivery_method(10) zone(11) fee(12) subtotal(13) total(14) deposit(15) method(16) coupon(17) discount(18)
    return { method: p[9], zone: p[10], fee: p[11], subtotal: p[12], total: p[13], deposit: p[14], payment: p[15], discount: p[17] };
  };
}

describe("POST /api/storefront/[slug]/orders — pricing", () => {
  it("ignores client-sent prices and totals", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne.mockResolvedValueOnce(storeRow()).mockResolvedValueOnce(product);
    const inserted = captureInsert();

    const res = await POST(
      req({
        ...order,
        paymentMethod: "transfer",
        deliveryZoneId: "island",
        totalAmount: 1,
        discountAmount: 99_999,
        items: [{ productId: PRODUCT_ID, quantity: 2, unitPrice: 1 }],
      }),
      ctx
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.totals).toEqual({ subtotal: 10_000, discount: 0, deliveryFee: 2_500, giftCard: 0, total: 12_500, deposit: 0 });
    expect(inserted()).toMatchObject({ subtotal: 10_000, fee: 2_500, total: 12_500, discount: 0, zone: "Lagos Island", payment: "bank_transfer" });
  });

  it("takes a deposit for pay-on-delivery and asks for online payment", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne.mockResolvedValueOnce(storeRow()).mockResolvedValueOnce(product);
    const inserted = captureInsert();

    const res = await POST(
      req({ ...order, paymentMethod: "pay_on_delivery", deliveryZoneId: "island", items: [{ productId: PRODUCT_ID, quantity: 1 }] }),
      ctx
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.paysOnlineNow).toBe(true);
    expect(inserted()).toMatchObject({ total: 7_500, deposit: 1_500, payment: "pay_on_delivery" });
  });

  it("charges nothing for delivery on pickup orders and needs no address", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne.mockResolvedValueOnce(storeRow()).mockResolvedValueOnce(product);
    const inserted = captureInsert();

    const res = await POST(
      req({ ...order, deliveryAddress: "", deliveryMethod: "pickup", paymentMethod: "paystack", items: [{ productId: PRODUCT_ID, quantity: 1 }] }),
      ctx
    );
    expect(res.status).toBe(201);
    expect(inserted()).toMatchObject({ method: "pickup", fee: 0, total: 5_000 });
  });

  it("rejects a payment method the store hasn't enabled", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne.mockResolvedValueOnce(storeRow({ pod_enabled: false }));
    const res = await POST(req({ ...order, paymentMethod: "pay_on_delivery", items: [{ productId: PRODUCT_ID, quantity: 1 }] }), ctx);
    expect(res.status).toBe(400);
    expect(mockedWithTransaction).not.toHaveBeenCalled();
  });

  it("rejects delivery without a chosen zone when the store has zones", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne.mockResolvedValueOnce(storeRow()).mockResolvedValueOnce(product);
    const res = await POST(req({ ...order, paymentMethod: "transfer", items: [{ productId: PRODUCT_ID, quantity: 1 }] }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/delivery area/i);
  });
});

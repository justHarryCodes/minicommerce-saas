import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────
// Tier 2: product variants, inventory history + low-stock alerts, customer
// segments, traffic sources, analytics deltas and custom-domain validation.
// ─────────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn(), queryMany: vi.fn(), withTransaction: vi.fn() }));
vi.mock("@/lib/push", () => ({ notifyStoreNewOrder: vi.fn().mockResolvedValue(undefined), notifyStoreEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/webpush", () => ({ sendWebPushToSubject: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/notify/order-messages", () => ({ notifyCustomer: vi.fn().mockResolvedValue(undefined) }));

import { queryOne, withTransaction } from "@/lib/db";
import { notifyStoreEvent } from "@/lib/push";
import { combinations, normalizeVariants, optionNamesOf, optionsOf, variantLabel } from "@/lib/variants";
import { crossedLowStock, effectiveThreshold, lowStockMessage, restockCancelledOrder } from "@/lib/inventory";
import { classifySource } from "@/lib/traffic-source";
import { segmentsOf, toCsv, topSpendCutoff } from "@/lib/customers-shared";
import { isApex, isLive, normalizeHostname } from "@/lib/cloudflare";
import { pctChange } from "@/lib/analytics";

const mockedQueryOne = vi.mocked(queryOne);
const mockedWithTransaction = vi.mocked(withTransaction);

beforeEach(() => vi.clearAllMocks());

/* ───────────────────────────── Variants ───────────────────────────── */

describe("variants", () => {
  it("builds every combination in option order", () => {
    expect(combinations([{ name: "Size", values: ["S", "M"] }, { name: "Colour", values: ["Red", "Blue"] }])).toEqual([
      { Size: "S", Colour: "Red" }, { Size: "S", Colour: "Blue" }, { Size: "M", Colour: "Red" }, { Size: "M", Colour: "Blue" },
    ]);
    expect(combinations([{ name: "Size", values: [] }])).toEqual([]);
  });

  it("derives labels from options and keeps per-variant price/sku", () => {
    const r = normalizeVariants(["Size", "Colour"], [
      { label: "", stockQuantity: 3, options: { Size: "M", Colour: "Red" }, price: 9000, sku: "TS-M-R" },
      { label: "", stockQuantity: 1, options: { Size: "m", Colour: "red" } }, // duplicate (case-insensitive) → dropped
    ]);
    expect(r).toEqual({ ok: true, variants: [{ label: "M / Red", stockQuantity: 3, options: { Size: "M", Colour: "Red" }, price: 9000, imageUrl: null, sku: "TS-M-R" }] });
  });

  it("rejects a variant missing an option value", () => {
    expect(normalizeVariants(["Size", "Colour"], [{ label: "", stockQuantity: 1, options: { Size: "M" } }])).toEqual({ ok: false, error: "Every variant needs a Colour" });
  });

  it("keeps legacy size-only payloads working (mobile app)", () => {
    const r = normalizeVariants([], [{ label: " XL ", stockQuantity: 2, options: {} }, { label: "", stockQuantity: 0, options: {} }]);
    expect(r).toMatchObject({ ok: true, variants: [{ label: "XL", options: {} }] });
  });

  it("reads legacy rows as a single Size option", () => {
    expect(optionNamesOf([])).toEqual(["Size"]);
    expect(optionsOf([], { label: "42" })).toEqual({ Size: "42" });
    expect(optionsOf(["Size", "Colour"], { label: "M / Red", options: { Size: "M", Colour: "Red" } })).toEqual({ Size: "M", Colour: "Red" });
    expect(variantLabel(["Colour", "Size"], { Size: "L", Colour: "Black" })).toBe("Black / L");
  });
});

/* ───────────────────────────── Inventory ───────────────────────────── */

describe("inventory", () => {
  it("alerts only on the crossing, not every sale below the line", () => {
    expect(crossedLowStock(5, 3, 3)).toBe(true);
    expect(crossedLowStock(3, 2, 3)).toBe(false);
    expect(crossedLowStock(10, 6, 3)).toBe(false);
  });

  it("uses the product threshold, else the store's, else 3", () => {
    expect(effectiveThreshold(5, 2)).toBe(5);
    expect(effectiveThreshold(null, 2)).toBe(2);
    expect(effectiveThreshold(undefined, undefined)).toBe(3);
  });

  it("writes readable alerts", () => {
    expect(lowStockMessage([{ name: "Shirt", label: "M / Red", stock: 0 }])).toEqual({ title: "Sold out", body: "Shirt (M / Red): sold out" });
    expect(lowStockMessage([1, 2, 3, 4].map((i) => ({ name: `P${i}`, label: null, stock: i }))).body).toBe("P1: 1 left · P2: 2 left · P3: 3 left · +1 more");
  });

  it("restocks a cancelled order once and logs it", async () => {
    const client = { query: vi.fn() };
    client.query
      .mockResolvedValueOnce({ rows: [{ id: "o1" }] }) // claim (stock_restored_at was NULL)
      .mockResolvedValueOnce({ rows: [] }) // cancel any bookings on the order
      .mockResolvedValueOnce({ rows: [{ product_id: "p1", product_name: "Shirt", size: "M", quantity: 2 }] })
      .mockResolvedValueOnce({ rows: [{ stock_quantity: 3 }] }) // UPDATE product_sizes (was 1 → 3)
      .mockResolvedValueOnce({ rows: [{ stock_quantity: 7 }] }) // UPDATE products
      .mockResolvedValueOnce({ rows: [] }); // INSERT inventory_movements
    mockedWithTransaction.mockImplementation(async (fn) => fn(client as never));

    expect(await restockCancelledOrder("o1", "s1")).toBe(1);
    const sizeUpdate = client.query.mock.calls.find(([sql]) => String(sql).includes("UPDATE product_sizes"));
    expect(sizeUpdate?.[1]).toEqual([2, "p1", "M"]);
    const log = client.query.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO inventory_movements"));
    expect(log?.[1]).toEqual(["s1", "p1", "Shirt", "M", 2, 7, "order_cancelled", "o1"]);

    // Second cancel: the claim finds nothing → no stock touched
    const again = { query: vi.fn().mockResolvedValueOnce({ rows: [] }) };
    mockedWithTransaction.mockImplementation(async (fn) => fn(again as never));
    expect(await restockCancelledOrder("o1", "s1")).toBe(0);
    expect(again.query).toHaveBeenCalledTimes(1);
  });
});

/* ───────────────────── Order API: variant price + inventory ───────────────────── */

const STORE_ID = "11111111-1111-1111-1111-111111111111";
const PRODUCT_ID = "22222222-2222-2222-2222-222222222222";
const storeRow = {
  id: STORE_ID, is_active: true, payment_preference: "both", delivery_zones: [], free_delivery_threshold: null,
  pickup_enabled: false, pickup_address: null, pod_enabled: false, pod_deposit_percent: 0, low_stock_threshold: 3,
};
const req = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest;
const ctx = { params: Promise.resolve({ slug: "shop" }) };
const order = { storeId: STORE_ID, customerName: "Ada", customerPhone: "08012345678", deliveryAddress: "1 St", paymentMethod: "transfer" };

describe("POST orders — variants & inventory", () => {
  it("charges the variant's own price, logs the sale and alerts when it crosses the threshold", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne
      .mockResolvedValueOnce(storeRow)
      .mockResolvedValueOnce({ id: PRODUCT_ID, name: "Shirt", price: 5000, stock_quantity: 10, has_sizes: true, image_url: null, images: [], low_stock_threshold: null })
      .mockResolvedValueOnce({ stock_quantity: 4, price: 6500, image_url: "https://img/xl.jpg" }); // XL costs more

    const client = { query: vi.fn() };
    client.query
      .mockResolvedValueOnce({ rows: [{ id: "order-1", order_number: "ORD-1", access_token: "t" }] }) // INSERT orders
      .mockResolvedValueOnce({ rows: [] }) // INSERT order_items
      .mockResolvedValueOnce({ rows: [{ id: "size", stock_quantity: 2 }] }) // UPDATE product_sizes → 2 left (4 → 2 crosses 3)
      .mockResolvedValueOnce({ rows: [{ stock_quantity: 8 }] }) // UPDATE products
      .mockResolvedValue({ rows: [] });
    mockedWithTransaction.mockImplementation(async (fn) => fn(client as never));

    const res = await POST(req({ ...order, items: [{ productId: PRODUCT_ID, quantity: 2, size: "XL", unitPrice: 1 }] }), ctx);
    expect(res.status).toBe(201);
    expect((await res.json()).totals.subtotal).toBe(13_000);

    const item = client.query.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO order_items"));
    expect(item?.[1]).toEqual(["order-1", PRODUCT_ID, "Shirt", "https://img/xl.jpg", "XL", 6500, 2, 13_000]);

    const log = client.query.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO inventory_movements"));
    expect(log?.[1]).toEqual([STORE_ID, PRODUCT_ID, "Shirt", "XL", -2, 2, "order", "order-1"]);

    await vi.waitFor(() => expect(notifyStoreEvent).toHaveBeenCalledWith(STORE_ID, expect.objectContaining({ type: "low_stock", body: "Shirt (XL): 2 left" })));
  });

  it("doesn't alert when stock stays above the threshold", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne
      .mockResolvedValueOnce(storeRow)
      .mockResolvedValueOnce({ id: PRODUCT_ID, name: "Mug", price: 3000, stock_quantity: 20, has_sizes: false, image_url: null, images: [], low_stock_threshold: null });
    const client = { query: vi.fn() };
    client.query
      .mockResolvedValueOnce({ rows: [{ id: "order-2", order_number: "ORD-2", access_token: "t" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ stock_quantity: 19 }] })
      .mockResolvedValue({ rows: [] });
    mockedWithTransaction.mockImplementation(async (fn) => fn(client as never));

    const res = await POST(req({ ...order, items: [{ productId: PRODUCT_ID, quantity: 1 }] }), ctx);
    expect(res.status).toBe(201);
    expect(notifyStoreEvent).not.toHaveBeenCalled();
  });
});

/* ───────────────────────────── Customers ───────────────────────────── */

describe("customer segments", () => {
  const now = new Date("2026-10-21T12:00:00Z").getTime();
  const day = 86_400_000;
  it("tags repeat, top, new and lapsed buyers", () => {
    const iso = (d: number) => new Date(now - d * day).toISOString();
    expect(segmentsOf({ orders: 3, total_spent: 90_000, first_order_at: iso(200), last_order_at: iso(90) }, 50_000, now)).toEqual(["all", "repeat", "top", "lapsed"]);
    expect(segmentsOf({ orders: 1, total_spent: 5_000, first_order_at: iso(3), last_order_at: iso(3) }, 50_000, now)).toEqual(["all", "new"]);
  });
  it("takes the top 10% (at least one customer) as top spenders", () => {
    expect(topSpendCutoff([100, 900, 300, 500])).toBe(900);
    expect(topSpendCutoff(Array.from({ length: 20 }, (_, i) => i + 1))).toBe(19);
  });
  it("escapes CSV", () => {
    expect(toCsv([["Name", "Note"], ['Ada "Ace"', "a,b"], [null, 3]])).toBe('"Name","Note"\r\n"Ada ""Ace""","a,b"\r\n"","3"');
  });
});

/* ───────────────────────────── Traffic sources ───────────────────────────── */

describe("traffic sources", () => {
  it("prefers utm_source, then the referrer host", () => {
    expect(classifySource({ utmSource: "Instagram", referrer: "https://google.com" })).toBe("instagram");
    expect(classifySource({ utmSource: "newsletter" })).toBe("other");
    expect(classifySource({ referrer: "https://l.instagram.com/?u=x" })).toBe("instagram");
    expect(classifySource({ referrer: "https://m.facebook.com/" })).toBe("facebook");
    expect(classifySource({ referrer: "https://www.google.com.ng/" })).toBe("google");
    expect(classifySource({ referrer: "https://t.co/abc" })).toBe("twitter");
    expect(classifySource({ referrer: "https://dukanigeria.com/discover" })).toBe("duka");
    expect(classifySource({ referrer: "" })).toBe("direct");
    expect(classifySource({ referrer: "https://shop.brand.com/x", ownHost: "shop.brand.com" })).toBe("direct");
    expect(classifySource({ referrer: "https://someblog.ng/post" })).toBe("other");
  });
});

/* ───────────────────────────── Analytics + domains ───────────────────────────── */

describe("analytics deltas", () => {
  it("computes % change and handles a zero baseline", () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(50, 100)).toBe(-50);
    expect(pctChange(10, 0)).toBeNull();
    expect(pctChange(0, 0)).toBe(0);
  });
});

describe("custom domain validation", () => {
  it("normalises what merchants paste and rejects what can't work", () => {
    expect(normalizeHostname(" https://Shop.MyBrand.com/ ")).toEqual({ ok: true, hostname: "shop.mybrand.com" });
    expect(normalizeHostname("mystore.dukanigeria.com").ok).toBe(false);
    expect(normalizeHostname("dukanigeria.com").ok).toBe(false);
    expect(normalizeHostname("192.168.0.1").ok).toBe(false);
    expect(normalizeHostname("not a domain").ok).toBe(false);
    expect(normalizeHostname("").ok).toBe(false);
  });
  it("spots bare domains and live status", () => {
    expect(isApex("brand.com")).toBe(true);
    expect(isApex("brand.com.ng")).toBe(true);
    expect(isApex("shop.brand.com")).toBe(false);
    expect(isLive({ status: "active", sslStatus: "active" })).toBe(true);
    expect(isLive({ status: "active", sslStatus: "pending_validation" })).toBe(false);
  });
});

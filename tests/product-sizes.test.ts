import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────
// Product sizes / per-size stock (see migrations/product_sizes.sql).
//
// The most important guarantee to protect here isn't the UI — it's that a
// sized product can never be oversold: a size must be picked, the pre-check
// must read that size's own stock (not the product-level total), and the
// atomic decrement inside the order transaction must be conditioned on
// stock_quantity >= requested so two concurrent checkouts racing the same
// size can't both succeed.
// ─────────────────────────────────────────────────────────────────────────

const STORE_ID = "11111111-1111-1111-1111-111111111111";
const PRODUCT_ID = "22222222-2222-2222-2222-222222222222";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  withTransaction: vi.fn(),
}));
vi.mock("@/lib/push", () => ({
  notifyStoreNewOrder: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/webpush", () => ({
  sendWebPushToSubject: vi.fn().mockResolvedValue(undefined),
}));

import { queryOne, withTransaction } from "@/lib/db";

const mockedQueryOne = vi.mocked(queryOne);
const mockedWithTransaction = vi.mocked(withTransaction);

/** A fake pg PoolClient whose `.query` returns queued `{ rows }` responses,
 *  one per call, in the order the route is expected to issue them. */
function fakeClient(responses: unknown[][]) {
  const query = vi.fn();
  for (const rows of responses) query.mockResolvedValueOnce({ rows });
  return { query };
}

function req(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

function ctx(slug = "test-store") {
  return { params: Promise.resolve({ slug }) };
}

const baseOrder = {
  storeId: STORE_ID,
  customerName: "Ada",
  customerPhone: "08012345678",
  deliveryAddress: "1 Test Street",
  paymentMethod: "transfer" as const,
  totalAmount: 10000,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/storefront/[slug]/orders — sized products", () => {
  it("rejects with 400 when a sized product is ordered with no size chosen", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne
      .mockResolvedValueOnce({ id: STORE_ID, is_active: true }) // store lookup
      .mockResolvedValueOnce({ id: PRODUCT_ID, stock_quantity: 10, has_sizes: true }); // product lookup

    const res = await POST(
      req({ ...baseOrder, items: [{ productId: PRODUCT_ID, quantity: 1, unitPrice: 5000 }] }),
      ctx()
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/select a size/i);
    expect(mockedWithTransaction).not.toHaveBeenCalled();
  });

  it('rejects with 400 when the chosen size doesn\'t exist on the product', async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne
      .mockResolvedValueOnce({ id: STORE_ID, is_active: true })
      .mockResolvedValueOnce({ id: PRODUCT_ID, stock_quantity: 10, has_sizes: true })
      .mockResolvedValueOnce(null); // size lookup finds nothing

    const res = await POST(
      req({ ...baseOrder, items: [{ productId: PRODUCT_ID, quantity: 1, unitPrice: 5000, size: "XXL" }] }),
      ctx()
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/not available/i);
    expect(mockedWithTransaction).not.toHaveBeenCalled();
  });

  it("rejects with 400 when the chosen size doesn't have enough stock", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne
      .mockResolvedValueOnce({ id: STORE_ID, is_active: true })
      .mockResolvedValueOnce({ id: PRODUCT_ID, stock_quantity: 10, has_sizes: true })
      .mockResolvedValueOnce({ stock_quantity: 1 }); // only 1 left in this size

    const res = await POST(
      req({ ...baseOrder, items: [{ productId: PRODUCT_ID, quantity: 3, unitPrice: 5000, size: "M" }] }),
      ctx()
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/insufficient stock for size "m"/i);
    expect(mockedWithTransaction).not.toHaveBeenCalled();
  });

  it("creates the order and decrements both the size row and the product total", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne
      .mockResolvedValueOnce({ id: STORE_ID, is_active: true })
      .mockResolvedValueOnce({ id: PRODUCT_ID, stock_quantity: 10, has_sizes: true })
      .mockResolvedValueOnce({ stock_quantity: 5 });

    const client = fakeClient([
      [{ id: "order-1", order_number: "ORD-1" }], // INSERT orders
      [{ name: "Shirt", image_url: null, images: [], has_sizes: true }], // per-item product lookup
      [], // INSERT order_items
      [{ id: "size-row" }], // UPDATE product_sizes ... RETURNING id (found a row → success)
      [], // UPDATE products stock_quantity
    ]);
    mockedWithTransaction.mockImplementation(async (fn) => fn(client as never));

    const res = await POST(
      req({ ...baseOrder, items: [{ productId: PRODUCT_ID, quantity: 2, unitPrice: 5000, size: "M" }] }),
      ctx()
    );

    expect(res.status).toBe(201);

    const calls = client.query.mock.calls;
    // order_items INSERT carries the size through
    const itemInsert = calls.find(([sql]) => String(sql).includes("INSERT INTO order_items"));
    expect(itemInsert?.[1]).toContain("M");

    // the size decrement is conditioned on having enough stock, scoped to
    // this exact product + label
    const sizeUpdate = calls.find(([sql]) => String(sql).includes("UPDATE product_sizes"));
    expect(String(sizeUpdate?.[0])).toMatch(/stock_quantity >= \$1/);
    expect(sizeUpdate?.[1]).toEqual([2, PRODUCT_ID, "M"]);

    // product-level stock_quantity is still decremented too (kept as the
    // sum, for every consumer that doesn't know about sizes)
    const productUpdate = calls.find(([sql]) => String(sql).includes("UPDATE products SET stock_quantity"));
    expect(productUpdate?.[1]).toEqual([2, PRODUCT_ID]);
  });

  it("returns 409 (not 500) when the atomic size decrement is raced out from under it", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne
      .mockResolvedValueOnce({ id: STORE_ID, is_active: true })
      .mockResolvedValueOnce({ id: PRODUCT_ID, stock_quantity: 10, has_sizes: true })
      .mockResolvedValueOnce({ stock_quantity: 5 }); // pre-check saw stock…

    const client = fakeClient([
      [{ id: "order-1", order_number: "ORD-1" }],
      [{ name: "Shirt", image_url: null, images: [], has_sizes: true }],
      [],
      [], // …but the atomic UPDATE finds nothing — someone else bought it first
    ]);
    mockedWithTransaction.mockImplementation(async (fn) => fn(client as never));

    const res = await POST(
      req({ ...baseOrder, items: [{ productId: PRODUCT_ID, quantity: 2, unitPrice: 5000, size: "M" }] }),
      ctx()
    );

    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/insufficient stock for size "m"/i);
  });

  it("skips per-size handling entirely for a plain (unsized) product", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne
      .mockResolvedValueOnce({ id: STORE_ID, is_active: true })
      .mockResolvedValueOnce({ id: PRODUCT_ID, stock_quantity: 10, has_sizes: false });

    const client = fakeClient([
      [{ id: "order-1", order_number: "ORD-1" }],
      [{ name: "Mug", image_url: null, images: [], has_sizes: false }],
      [],
      [], // UPDATE products stock_quantity — no product_sizes call in between
    ]);
    mockedWithTransaction.mockImplementation(async (fn) => fn(client as never));

    const res = await POST(
      req({ ...baseOrder, items: [{ productId: PRODUCT_ID, quantity: 1, unitPrice: 5000 }] }),
      ctx()
    );

    expect(res.status).toBe(201);
    const calls = client.query.mock.calls;
    expect(calls.some(([sql]) => String(sql).includes("product_sizes"))).toBe(false);
    const itemInsert = calls.find(([sql]) => String(sql).includes("INSERT INTO order_items"));
    expect(itemInsert?.[1]).toContain(null); // size column stored as null
  });
});

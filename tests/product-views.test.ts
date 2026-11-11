import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn() }));
vi.mock("@/lib/storefront-page", () => ({ getCachedStore: vi.fn() }));

import { query } from "@/lib/db";
import { getCachedStore } from "@/lib/storefront-page";
import { alsoViewedIds, productViewStats, recordView, validView, viewedNotBought } from "@/lib/product-views";
import { POST } from "@/app/api/storefront/[slug]/view/route";

// "Customers also viewed" and the Analytics view reports.

const PRODUCT = "6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b";
const VISITOR = "0b7c6d5e-4f3a-4b2c-9d1e-0f9a8b7c6d5e";
const missing = Object.assign(new Error('relation "product_views" does not exist'), { code: "42P01" });

beforeEach(() => {
  vi.mocked(query).mockReset().mockResolvedValue([]);
  vi.mocked(getCachedStore).mockReset().mockResolvedValue({ id: "store-1", is_active: true } as never);
});

describe("recording a view", () => {
  it("accepts a product uuid and the browser's anonymous id only", () => {
    expect(validView(PRODUCT, VISITOR)).toBe(true);
    expect(validView("1; DROP TABLE products", VISITOR)).toBe(false);
    expect(validView(PRODUCT, "x")).toBe(false);
    expect(validView(PRODUCT, "<script>alert(1)</script>")).toBe(false);
    expect(validView(undefined, VISITOR)).toBe(false);
  });

  it("only records products that belong to the store, once a day", async () => {
    await recordView("store-1", PRODUCT, VISITOR);
    const [sql, params] = vi.mocked(query).mock.calls[0];
    expect(sql).toMatch(/FROM products p WHERE p.id = \$2 AND p.store_id = \$1/);
    expect(sql).toMatch(/ON CONFLICT DO NOTHING/);
    expect(params).toEqual(["store-1", PRODUCT, VISITOR]);
  });

  it("the API rejects bad input and unknown stores, and answers 204 otherwise", async () => {
    const post = (body: unknown) =>
      POST(new NextRequest("http://x.test/api/storefront/amaka/view", { method: "POST", body: JSON.stringify(body) }), {
        params: Promise.resolve({ slug: "amaka" }),
      });
    expect((await post({ product_id: "nope", visitor_id: VISITOR })).status).toBe(400);
    vi.mocked(getCachedStore).mockResolvedValueOnce(null);
    expect((await post({ product_id: PRODUCT, visitor_id: VISITOR })).status).toBe(404);
    expect((await post({ product_id: PRODUCT, visitor_id: VISITOR })).status).toBe(204);
  });

  it("never breaks the page when tracking fails", async () => {
    vi.mocked(query).mockRejectedValueOnce(new Error("db down"));
    const res = await POST(
      new NextRequest("http://x.test/api/storefront/amaka/view", { method: "POST", body: JSON.stringify({ product_id: PRODUCT, visitor_id: VISITOR }) }),
      { params: Promise.resolve({ slug: "amaka" }) },
    );
    expect(res.status).toBe(204);
  });
});

describe("before the migration is run", () => {
  it("everything reads as empty instead of failing", async () => {
    vi.mocked(query).mockRejectedValue(missing);
    expect(await recordView("store-1", PRODUCT, VISITOR)).toBe(false);
    expect(await alsoViewedIds("store-1", PRODUCT)).toEqual([]);
    expect(await productViewStats("store-1", 30)).toEqual([]);
  });

  it("other database errors still surface", async () => {
    vi.mocked(query).mockRejectedValue(new Error("connection refused"));
    await expect(alsoViewedIds("store-1", PRODUCT)).rejects.toThrow("connection refused");
  });
});

describe("customers also viewed", () => {
  it("ranks other active products by how many of this product's viewers opened them", async () => {
    vi.mocked(query).mockResolvedValueOnce([{ product_id: "b" }, { product_id: "c" }] as never);
    expect(await alsoViewedIds("store-1", PRODUCT, 8)).toEqual(["b", "c"]);
    const [sql, params] = vi.mocked(query).mock.calls[0];
    expect(sql).toMatch(/pv.product_id <> \$2/);
    expect(sql).toMatch(/is_active = true/);
    expect(sql).toMatch(/ORDER BY COUNT\(DISTINCT pv.visitor_id\) DESC/);
    expect(params).toEqual(["store-1", PRODUCT, 8]);
  });
});

describe("viewed but not bought", () => {
  const stat = (name: string, views: number, orders: number) => ({ productId: name, name, views, orders });

  it("flags products many people view but almost nobody buys", () => {
    const out = viewedNotBought([stat("Gown", 120, 0), stat("Bag", 80, 12), stat("Shoe", 3, 0), stat("Wig", 200, 2)]);
    expect(out.map((s) => s.name)).toEqual(["Wig", "Gown"]); // Bag sells; Shoe has too few views to judge
  });
});

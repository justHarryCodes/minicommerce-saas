import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn() }));
vi.mock("@/lib/redis", () => ({ getOrSet: vi.fn(async (_k: string, f: () => Promise<unknown>) => f()) }));
vi.mock("@/lib/reels", () => ({ getTrendingReels: vi.fn(async () => [{ id: "r1", title: "New drop", thumbnail_url: "https://t/1.jpg", view_count: 1500, store_name: "Amaka", store_slug: "amaka", store_logo: null }]) }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(async () => null) }));

import { query } from "@/lib/db";
import { feedPage, spreadStores, validLike, FEED_PAGE } from "@/lib/discover-feed";
import { POST as likePOST } from "@/app/api/discover/like/route";

// Discover "For you" feed.

const UUID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function productRow(n: number, store: string) {
  return {
    id: UUID(n), name: `Product ${n}`, slug: `product-${n}`, price: "5000", compare_price: n === 1 ? "8000" : null,
    image_url: `https://res.cloudinary.com/c/image/upload/v1/p${n}.jpg`, images: [`https://res.cloudinary.com/c/image/upload/v1/p${n}b.jpg`],
    short_description: "<b>Nice</b> thing", description: null, category_name: n === 2 ? "Uncategorized" : "Bags", stock_quantity: 3,
    created_at: "2026-11-10T00:00:00Z", likes: n, store_id: store, store_name: `Store ${store}`, store_slug: `store-${store}`,
    store_logo: null, store_category: "Fashion", nin_verified: n % 2 === 0,
  };
}

describe("spreading stores", () => {
  it("never shows one store 3 posts running when others are available", () => {
    const items = ["a", "a", "a", "a", "b", "c"].map((s, i) => ({ i, store: { id: s } }));
    const out = spreadStores(items).map((x) => x.store.id);
    for (let i = 2; i < out.length; i++) {
      const window = out.slice(i - 2, i + 1);
      if (out.slice(i).some((s) => s !== out[i])) expect(new Set(window).size).toBeGreaterThan(1);
    }
    expect(out).toHaveLength(6);
    expect(out[0]).toBe("a"); // best-ranked first
  });
});

describe("feed page", () => {
  beforeEach(() => {
    vi.mocked(query).mockReset().mockImplementation(async (sql: unknown) => {
      const s = String(sql);
      if (s.includes("to_regclass")) return [{ t: "product_views" }] as never;
      if (s.includes("FROM products p") && s.includes("ORDER BY (CASE")) {
        return Array.from({ length: FEED_PAGE }, (_, i) => productRow(i + 1, ["x", "y", "z"][i % 3])) as never;
      }
      if (s.includes("FROM stores s") && s.includes("New") === false && s.includes("json_agg")) {
        return [{ id: "s9", name: "New Shop", slug: "new-shop", logo_url: null, primary_category: "Beauty", description: "Fresh", created_at: "2026-11-01", nin_verified: true, product_count: 4, products: [{ id: "p", name: "Lip", slug: "lip", price: "2000", image: "https://res.cloudinary.com/c/image/upload/v1/l.jpg" }] }] as never;
      }
      if (s.includes("FROM product_likes WHERE visitor_id")) return [{ product_id: UUID(3) }] as never;
      return [] as never;
    });
  });

  it("mixes products, a new-store spotlight and a reel, with this visitor's likes", async () => {
    const { posts, hasMore } = await feedPage({ page: 1, visitorId: "visitor-abc-123" });
    expect(hasMore).toBe(true);
    const types = posts.map((p) => p.type);
    expect(types.filter((t) => t === "product")).toHaveLength(FEED_PAGE);
    expect(types.indexOf("store")).toBe(5); // after the 5th product
    expect(types).toContain("reel");
    const p1 = posts.find((p) => p.type === "product" && p.id === UUID(1));
    expect(p1).toMatchObject({ compare_price: 8000, caption: "Nice thing", likes: 1, liked: false, category: "Bags" });
    expect(posts.find((p) => p.type === "product" && p.id === UUID(3))).toMatchObject({ liked: true });
    expect(posts.find((p) => p.type === "product" && p.id === UUID(2))).toMatchObject({ category: null }); // no #uncategorized
    // Feed photos are resized Cloudinary images, not full uploads
    expect((p1 as { images: string[] }).images[0]).toContain("/upload/f_auto");
  });

  it("only shows products in stock, with a photo, from live stores; ranks by likes, views, freshness", async () => {
    await feedPage({ page: 2, category: "Fashion", q: "bag" });
    const sql = vi.mocked(query).mock.calls.map(([s]) => String(s)).find((s) => s.includes("ORDER BY (CASE"))!;
    for (const c of ["p.is_active = true", "s.is_active = true", "s.deleted_at IS NULL", "COALESCE(p.stock_quantity, 0) > 0", "COALESCE(NULLIF(p.image_url, ''), p.images[1]) IS NOT NULL", "product_views", "s.primary_category = $1"]) {
      expect(sql).toContain(c);
    }
    const params = vi.mocked(query).mock.calls.find(([s]) => String(s).includes("ORDER BY (CASE"))![1] as unknown[];
    expect(params).toEqual(["Fashion", "%bag%", FEED_PAGE, FEED_PAGE]); // page 2 offset
  });
});

describe("likes", () => {
  beforeEach(() => {
    vi.mocked(query).mockReset().mockImplementation(async (sql: unknown) => {
      const s = String(sql);
      if (s.includes("SELECT 1 FROM products")) return [{ "?column?": 1 }] as never;
      if (s.includes("COUNT(*)::int AS n FROM product_likes")) return [{ n: 7 }] as never;
      return [] as never;
    });
  });
  const post = (body: object) => likePOST(new NextRequest("http://x/api/discover/like", { method: "POST", body: JSON.stringify(body) }));

  it("validates ids", () => {
    expect(validLike(UUID(1), "visitor-abc-123")).toBe(true);
    expect(validLike("nope", "visitor-abc-123")).toBe(false);
    expect(validLike(UUID(1), "x")).toBe(false);
    expect(validLike(UUID(1), "bad visitor <script>")).toBe(false);
  });

  it("likes once per visitor and returns the total", async () => {
    const res = await post({ productId: UUID(1), visitorId: "visitor-abc-123", liked: true });
    expect(await res.json()).toEqual({ ok: true, likes: 7 });
    const insert = vi.mocked(query).mock.calls.find(([s]) => String(s).includes("INSERT INTO product_likes"))!;
    expect(String(insert[0])).toContain("ON CONFLICT DO NOTHING");
    expect(insert[1]).toEqual([UUID(1), "visitor-abc-123"]);
  });

  it("unlikes, and rejects bad input or missing products", async () => {
    await post({ productId: UUID(1), visitorId: "visitor-abc-123", liked: false });
    expect(vi.mocked(query).mock.calls.some(([s]) => String(s).includes("DELETE FROM product_likes"))).toBe(true);
    expect((await post({ productId: UUID(1), visitorId: "visitor-abc-123", liked: "yes" })).status).toBe(422);
    vi.mocked(query).mockImplementation(async () => [] as never);
    expect((await post({ productId: UUID(1), visitorId: "visitor-abc-123", liked: true })).status).toBe(404);
  });
});

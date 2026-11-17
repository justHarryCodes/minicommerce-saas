import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }));
vi.mock("@/lib/storefront-page", () => ({ getCachedStore: vi.fn(async () => null) }));

import { cardPhoto } from "@/lib/og-cards";
import { productCardUrl, storeCardUrl } from "@/lib/seo";
import { platformRobots } from "@/lib/sitemaps";
import { GET as productGET } from "@/app/api/og/product/[store]/[product]/route";
import { GET as storeGET } from "@/app/api/og/store/[store]/route";

// Share cards: the og:image social apps show for product and store links.

process.env.NEXT_PUBLIC_APP_URL = "https://dukanigeria.com";

describe("share card URLs", () => {
  it("live on the Duka domain with a version that changes when the product does", () => {
    const p = { id: "p1", slug: "ankara-gown", updated_at: "2026-11-01T00:00:00Z", price: "20000", compare_price: null, image_url: "a.jpg" };
    const a = productCardUrl("amaka", p, { name: "Amaka", logo_url: null });
    expect(a).toMatch(/^https:\/\/dukanigeria\.com\/api\/og\/product\/amaka\/ankara-gown\?v=[a-z0-9]+$/);
    expect(productCardUrl("amaka", p, { name: "Amaka", logo_url: null })).toBe(a); // stable
    expect(productCardUrl("amaka", { ...p, price: "18000" }, { name: "Amaka", logo_url: null })).not.toBe(a); // price change -> new card
    expect(productCardUrl("amaka", { ...p, slug: null }, {})).toContain("/amaka/p1?v=");
    const s = storeCardUrl({ slug: "amaka", name: "Amaka", updated_at: "2026-11-01" });
    expect(s).toMatch(/^https:\/\/dukanigeria\.com\/api\/og\/store\/amaka\?v=/);
    expect(storeCardUrl({ slug: "amaka", name: "Amaka Styles", updated_at: "2026-11-01" })).not.toBe(s);
  });

  it("card photos are fetched as cropped JPEGs (Satori can't draw webp/jxl)", () => {
    expect(cardPhoto("https://res.cloudinary.com/c/image/upload/v1/duka/a.jxl", 630, 630)).toBe("https://res.cloudinary.com/c/image/upload/c_fill,g_auto,w_630,h_630,q_auto:good/v1/duka/a.jpg");
    expect(cardPhoto("https://example.com/a.png", 10, 10)).toBe("https://example.com/a.png");
    expect(cardPhoto("https://example.com/a.webp", 10, 10)).toBeNull();
    expect(cardPhoto(null, 10, 10)).toBeNull();
  });

  it("robots.txt lets X/Twitter fetch the cards", () => {
    const r = platformRobots();
    expect(r).toContain("Allow: /api/og/");
    expect(r.indexOf("Allow: /api/og/")).toBeLessThan(r.indexOf("Disallow: /api/"));
  });

  it("unknown stores / products get a 404, not a broken image", async () => {
    expect((await productGET(new NextRequest("http://x"), { params: Promise.resolve({ store: "nope", product: "x" }) })).status).toBe(404);
    expect((await storeGET(new NextRequest("http://x"), { params: Promise.resolve({ store: "nope" }) })).status).toBe(404);
  });
});

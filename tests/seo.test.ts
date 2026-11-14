import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn() }));
vi.mock("@/lib/store-pages", () => ({ blogEnabled: vi.fn(async () => true) }));
vi.mock("@/lib/auth", () => ({ verifySession: vi.fn(), getUserStore: vi.fn() }));
vi.mock("@/lib/store-cache", () => ({ invalidateStore: vi.fn(async () => {}) }));

import { query } from "@/lib/db";
import { verifySession, getUserStore } from "@/lib/auth";
import { jsonLd, metaText, productLd, returnPolicyLd, shippingLd, storeCanonicalBase, storeLd, breadcrumbLd } from "@/lib/seo";
import { platformRobots, storeRobots, storeSitemapUrls, urlsetXml, sitemapIndexXml } from "@/lib/sitemaps";
import { parseVerification } from "@/lib/google-verification";
import { clCrawler } from "@/lib/cloudinary";
import { PATCH as seoPATCH } from "@/app/api/dashboard/seo/route";
import type { Product, Store } from "@/types";

process.env.NEXT_PUBLIC_ROOT_DOMAIN = "dukanigeria.com";
process.env.NEXT_PUBLIC_APP_URL = "https://dukanigeria.com";

const store = {
  id: "s1",
  name: "Amaka Styles",
  slug: "amaka",
  custom_domain: null,
  logo_url: "https://res.cloudinary.com/x/logo.png",
  description: "Ankara gowns & bags",
  phone: "+2348012345678",
  return_policy: "Returns accepted within 7 days if unused.",
  delivery_time_frame: "2-4 days",
  free_delivery_threshold: 50000,
  delivery_zones: [{ id: "lagos", name: "Lagos", fee: 2500 }],
  allow_preorders: false,
  created_at: "2025-01-10T00:00:00Z",
} as unknown as Store;

const product = {
  id: "p1",
  name: "Ankara Gown",
  slug: "ankara-gown",
  price: 20000,
  compare_price: 25000,
  stock_quantity: 3,
  image_url: "https://img/1.jpg",
  images: ["https://img/1.jpg", "https://img/2.jpg"],
  description: "<p>Beautiful <b>gown</b></p>",
  category_name: "Gowns",
} as unknown as Product;

const URL_ = "https://amaka.dukanigeria.com/products/ankara-gown";

describe("helpers", () => {
  it("canonical base is the custom domain when live, else the subdomain", () => {
    expect(storeCanonicalBase(store)).toBe("https://amaka.dukanigeria.com");
    expect(storeCanonicalBase({ slug: "amaka", custom_domain: "www.amaka.ng" })).toBe("https://www.amaka.ng");
  });
  it("metaText strips markup and cuts at a word", () => {
    expect(metaText("<p>Hello <b>there</b> &nbsp; friend</p>")).toBe("Hello there friend");
    const long = metaText("word ".repeat(80), 50);
    expect(long.length).toBeLessThanOrEqual(50);
    expect(long.endsWith("…")).toBe(true);
  });
  it("crawler images: fixed size, and formats Google can't read become JPG", () => {
    const base = "https://res.cloudinary.com/c/image/upload/v17/duka/u/abc";
    expect(clCrawler(`${base}.jxl`)).toBe("https://res.cloudinary.com/c/image/upload/q_auto:good,c_limit,w_1600/v17/duka/u/abc.jpg");
    expect(clCrawler(`${base}.heic`)).toMatch(/abc\.jpg$/);
    expect(clCrawler(`${base}.png`)).toMatch(/abc\.png$/); // logos keep transparency
    expect(clCrawler(`${base}`)).toMatch(/abc\.jpg$/);
    expect(clCrawler("https://images.unsplash.com/photo-1?w=800")).toBe("https://images.unsplash.com/photo-1?w=800");
    expect(clCrawler(null)).toBe("");
  });

  it("jsonLd can't break out of the script tag", () => {
    const out = jsonLd({ name: "</script><script>alert(1)</script>", sep: `a${String.fromCharCode(0x2028)}b` });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain(String.fromCharCode(0x2028));
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});

describe("returns and shipping", () => {
  it("reads a return window or no-returns, and skips vague policies", () => {
    expect(returnPolicyLd("Returns within 14 days")).toMatchObject({ returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow", merchantReturnDays: 14 });
    expect(returnPolicyLd("No returns. All sales are final")).toMatchObject({ returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted" });
    expect(returnPolicyLd("Contact us about returns")).toBeNull();
    expect(returnPolicyLd("")).toBeNull();
  });
  it("states the delivery fee only when certain", () => {
    expect(shippingLd(store, 60000)?.shippingRate).toEqual({ "@type": "MonetaryAmount", value: "0.00", currency: "NGN" }); // over free threshold
    expect(shippingLd(store, 20000)?.shippingRate?.value).toBe("2500.00"); // one zone fee
    const twoZones = { ...store, delivery_zones: [{ fee: 1000 }, { fee: 3000 }], free_delivery_threshold: 0 } as unknown as Store;
    const s = shippingLd(twoZones, 20000)!;
    expect(s.shippingRate).toBeUndefined();
    expect(s.deliveryTime?.transitTime).toMatchObject({ minValue: 2, maxValue: 4 });
    expect(shippingLd({ ...twoZones, delivery_time_frame: null } as unknown as Store, 20000)).toBeNull();
  });
});

describe("product structured data", () => {
  it("has everything Google's merchant listings read", () => {
    const ld = productLd({ store, product, url: URL_, rating: [4.5, 12], reviews: [{ customer_name: "Ada", rating: 5, body: "Lovely", created_at: "2026-01-02" }], today: "2026-11-14" }) as Record<string, any>;
    expect(ld["@type"]).toBe("Product");
    expect(ld.url).toBe(URL_);
    expect(ld.image).toEqual(["https://img/1.jpg", "https://img/2.jpg"]);
    expect(ld.description).toBe("Beautiful gown");
    expect(ld.brand.name).toBe("Amaka Styles");
    expect(ld.category).toBe("Gowns");
    expect(ld.offers).toMatchObject({ price: "20000.00", priceCurrency: "NGN", availability: "https://schema.org/InStock", itemCondition: "https://schema.org/NewCondition", url: URL_ });
    expect(ld.offers.priceSpecification[1]).toMatchObject({ priceType: "https://schema.org/StrikethroughPrice", price: "25000.00" });
    expect(ld.offers.shippingDetails.shippingRate.value).toBe("2500.00");
    expect(ld.offers.hasMerchantReturnPolicy.merchantReturnDays).toBe(7);
    expect(ld.aggregateRating).toMatchObject({ ratingValue: 4.5, reviewCount: 12 });
    expect(ld.review[0]).toMatchObject({ author: { name: "Ada" }, reviewRating: { ratingValue: 5 }, datePublished: "2026-01-02" });
  });

  it("no rating without reviews, used goods marked used, sold out and pre-orders", () => {
    const used = productLd({ store, product: { ...product, name: "UK Used iPhone 12", stock_quantity: 0 }, url: URL_, today: "2026-11-14" }) as Record<string, any>;
    expect(used.aggregateRating).toBeUndefined();
    expect(used.offers.itemCondition).toBe("https://schema.org/UsedCondition");
    expect(used.offers.availability).toBe("https://schema.org/OutOfStock");
    const pre = productLd({ store: { ...store, allow_preorders: true } as Store, product: { ...product, stock_quantity: 0 }, url: URL_, today: "2026-11-14" }) as Record<string, any>;
    expect(pre.offers.availability).toBe("https://schema.org/PreOrder");
    const food = productLd({ store, product: { ...product, sold_out_until: "2026-11-14" }, url: URL_, today: "2026-11-14" }) as Record<string, any>;
    expect(food.offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("variants become a ProductGroup with a link per variant", () => {
    const withSizes = {
      ...product,
      sizes: [
        { id: "v1", label: "M / Red", options: { Size: "M", Colour: "Red" }, stock_quantity: 2, price: null },
        { id: "v2", label: "L / Red", options: { Size: "L", Colour: "Red" }, stock_quantity: 0, price: 22000 },
      ],
    } as unknown as Product;
    const ld = productLd({ store, product: withSizes, url: URL_, today: "2026-11-14" }) as Record<string, any>;
    expect(ld["@type"]).toBe("ProductGroup");
    expect(ld.variesBy).toEqual(["https://schema.org/size", "https://schema.org/color"]);
    expect(ld.hasVariant).toHaveLength(2);
    expect(ld.hasVariant[0]).toMatchObject({ size: "M", color: "Red", offers: { price: "20000.00", availability: "https://schema.org/InStock", url: `${URL_}?variant=v1` } });
    expect(ld.hasVariant[1].offers).toMatchObject({ price: "22000.00", availability: "https://schema.org/OutOfStock" });
  });

  it("store and breadcrumb markup", () => {
    const [shop, site] = storeLd(store) as Record<string, any>[];
    expect(shop).toMatchObject({ "@type": "OnlineStore", name: "Amaka Styles", url: "https://amaka.dukanigeria.com/", logo: store.logo_url, telephone: "+2348012345678" });
    expect(shop.hasMerchantReturnPolicy.merchantReturnDays).toBe(7);
    expect(site).toMatchObject({ "@type": "WebSite", url: "https://amaka.dukanigeria.com/" });
    const bc = breadcrumbLd([{ name: "A", url: "https://a/" }, { name: "B", url: "https://a/b" }]) as Record<string, any>;
    expect(bc.itemListElement[1]).toEqual({ "@type": "ListItem", position: 2, name: "B", item: "https://a/b" });
  });
});

describe("sitemaps and robots", () => {
  it("escapes XML and adds product photos", () => {
    const xml = urlsetXml([{ loc: "https://a/?category=x&sub=y", lastmod: "2026-11-01T10:00:00Z", images: ["https://img/a.jpg", "not-a-url"] }]);
    expect(xml).toContain("<loc>https://a/?category=x&amp;sub=y</loc>");
    expect(xml).toContain("<lastmod>2026-11-01</lastmod>");
    expect(xml).toContain("<image:loc>https://img/a.jpg</image:loc>");
    expect(xml).not.toContain("not-a-url");
    expect(sitemapIndexXml([{ loc: "https://amaka.dukanigeria.com/sitemap.xml" }])).toContain("<sitemap><loc>https://amaka.dukanigeria.com/sitemap.xml</loc></sitemap>");
  });

  it("robots keep private pages out and point to the sitemaps", () => {
    const p = platformRobots();
    for (const d of ["Disallow: /dashboard", "Disallow: /admin", "Disallow: /api/", "Disallow: /store/*/checkout"]) expect(p).toContain(d);
    // One group only: a separate "User-agent: Googlebot" group would make Google ignore every rule above
    expect(p.match(/User-agent:/g)).toHaveLength(1);
    expect(p).toContain("Allow: /api/feeds/");
    expect(p).toContain("Sitemap: https://dukanigeria.com/sitemap.xml");
    expect(p).toContain("Sitemap: https://dukanigeria.com/stores-sitemap.xml");
    const s = storeRobots(store);
    expect(s).toContain("Disallow: /checkout");
    expect(s).toContain("Sitemap: https://amaka.dukanigeria.com/sitemap.xml");
  });

  it("a store's sitemap lists home, filled categories, products, pages and blog", async () => {
    vi.mocked(query).mockImplementation(async (sql: unknown) => {
      const s = String(sql);
      if (s.includes("FROM products")) return [{ id: "p1", slug: "ankara-gown", updated_at: "2026-11-10", image_url: "https://img/1.jpg", images: ["https://img/2.jpg"] }] as never;
      if (s.includes("FROM categories")) return [{ slug: "gowns", lastmod: "2026-11-10" }] as never;
      if (s.includes("FROM store_pages")) return [{ kind: "page", slug: "about", updated_at: null, cover_url: null }, { kind: "post", slug: "new-in", updated_at: "2026-11-01", cover_url: null }] as never;
      return [] as never;
    });
    const urls = (await storeSitemapUrls(store)).map((u) => u.loc);
    expect(urls).toEqual([
      "https://amaka.dukanigeria.com/",
      "https://amaka.dukanigeria.com/?category=gowns",
      "https://amaka.dukanigeria.com/products/ankara-gown",
      "https://amaka.dukanigeria.com/pages/about",
      "https://amaka.dukanigeria.com/blog",
      "https://amaka.dukanigeria.com/blog/new-in",
    ]);
    const cats = vi.mocked(query).mock.calls.map(([s]) => String(s)).find((s) => s.includes("FROM categories"))!;
    expect(cats).toContain("is_active = true"); // only categories with products
  });
});

describe("Google verification", () => {
  const CODE = "AbCdEf1234567890_-xyzABCDEF0123";
  it("takes the whole tag or the code, and rejects other tags", () => {
    expect(parseVerification(`<meta name="google-site-verification" content="${CODE}" />`)).toBe(CODE);
    expect(parseVerification(CODE)).toBe(CODE);
    expect(parseVerification("  ")).toBe("");
    expect(parseVerification('<meta name="facebook-domain-verification" content="abc123abc123abc123abc123" />')).toBeNull();
    expect(parseVerification('"><script>')).toBeNull();
  });

  beforeEach(() => {
    vi.mocked(query).mockReset().mockResolvedValue([] as never);
  });

  it("owner saves it; SQL adds the column if missing", async () => {
    vi.mocked(verifySession).mockResolvedValue({ firebaseUid: "u1" } as never);
    vi.mocked(getUserStore).mockResolvedValue({ id: "s1", slug: "amaka" } as never);
    const res = await seoPATCH(new NextRequest("http://x", { method: "PATCH", body: JSON.stringify({ code: `<meta name="google-site-verification" content="${CODE}">` }) }));
    expect(await res.json()).toEqual({ ok: true, code: CODE });
    const sqls = vi.mocked(query).mock.calls.map(([s]) => String(s));
    expect(sqls.some((s) => s.includes("ADD COLUMN IF NOT EXISTS google_site_verification"))).toBe(true);
    expect(vi.mocked(query).mock.calls.find(([s]) => String(s).startsWith("UPDATE stores"))?.[1]).toEqual(["s1", CODE]);
    const bad = await seoPATCH(new NextRequest("http://x", { method: "PATCH", body: JSON.stringify({ code: "nope" }) }));
    expect(bad.status).toBe(422);
  });

  it("only the owner", async () => {
    vi.mocked(verifySession).mockResolvedValue({ firebaseUid: "u2" } as never);
    vi.mocked(getUserStore).mockResolvedValue(null);
    expect((await seoPATCH(new NextRequest("http://x", { method: "PATCH", body: JSON.stringify({ code: "" }) }))).status).toBe(403);
  });
});

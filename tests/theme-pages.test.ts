import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn() }));
import { THEMES } from "@/lib/themes/catalog";
import { TIER_CAPS } from "@/lib/themes/kits";
import { capCustomization, mergeTheme, parseCustomization } from "@/lib/themes/resolve";
import { COLLECTION_LAYOUTS, PRODUCT_LAYOUTS, SEARCH_STYLES } from "@/lib/themes/types";
import { applyFilters, filtersFromSearch, filtersToUrl, priceBands, NO_FILTERS } from "@/lib/collection-filters";
import { keySpecs, parseProductDetails } from "@/lib/product-details";
import { likePattern } from "@/lib/storefront-search";
import { toCardProduct } from "@/lib/public-store";
import { draftToDetails, toDraft } from "@/components/dashboard/DetailsEditor";
import type { Product } from "@/types";

// Phase 2: product, category and search pages vary by theme.

describe("page layouts per theme", () => {
  it("every theme picks a valid product, category and search layout", () => {
    for (const t of THEMES) {
      expect(PRODUCT_LAYOUTS, t.id).toContain(t.layout.product);
      expect(COLLECTION_LAYOUTS, t.id).toContain(t.layout.collection);
      expect(SEARCH_STYLES, t.id).toContain(t.layout.search);
    }
  });

  it("every layout is used by at least one theme", () => {
    expect(new Set(THEMES.map((t) => t.layout.product))).toEqual(new Set(PRODUCT_LAYOUTS));
    expect(new Set(THEMES.map((t) => t.layout.collection))).toEqual(new Set(COLLECTION_LAYOUTS));
    expect(new Set(THEMES.map((t) => t.layout.search))).toEqual(new Set(SEARCH_STYLES));
  });

  it("food themes use the menu or compact pages; gadget themes the spec-friendly ones", () => {
    const quick = THEMES.find((t) => t.id === "quick-bites")!;
    expect(quick.layout.product).toBe("compact");
    expect(quick.layout.collection).toBe("menu");
    const gadget = THEMES.find((t) => t.id === "gadget-hub")!;
    expect(gadget.layout.product).toBe("showcase");
    expect(gadget.layout.collection).toBe("catalog");
  });

  it("only premium and signature themes can switch page layouts", () => {
    const want = { layout: { product: "editorial", collection: "lookbook", search: "spotlight" } };
    for (const t of THEMES) {
      const capped = capCustomization(t, parseCustomization(want));
      const merged = mergeTheme(t, capped);
      if (TIER_CAPS[t.tier].pages) {
        expect(merged.layout.product, t.id).toBe("editorial");
        expect(merged.layout.collection, t.id).toBe("lookbook");
        expect(merged.layout.search, t.id).toBe("spotlight");
      } else {
        expect(merged.layout.product, t.id).toBe(t.layout.product);
        expect(merged.layout.collection, t.id).toBe(t.layout.collection);
        expect(merged.layout.search, t.id).toBe(t.layout.search);
      }
    }
  });

  it("rejects unknown layout names", () => {
    const c = parseCustomization({ layout: { product: "<script>", collection: "x", search: 3 } });
    expect(c.layout?.product).toBeUndefined();
    expect(c.layout?.collection).toBeUndefined();
    expect(c.layout?.search).toBeUndefined();
  });
});

const p = (id: string, price: number, extra: Partial<Product> = {}) => ({ id, name: id, price, created_at: `2026-01-0${id}`, ...extra }) as Product;

describe("category filters", () => {
  const list = [p("1", 5000), p("2", 1500, { compare_price: 2000 }), p("3", 9000), p("4", 3000, { compare_price: 3500 })];

  it("featured keeps the store's order; price sorts both ways; newest by date", () => {
    expect(applyFilters(list, NO_FILTERS).map((x) => x.id)).toEqual(["1", "2", "3", "4"]);
    expect(applyFilters(list, { ...NO_FILTERS, sort: "price-asc" }).map((x) => x.id)).toEqual(["2", "4", "1", "3"]);
    expect(applyFilters(list, { ...NO_FILTERS, sort: "price-desc" }).map((x) => x.id)).toEqual(["3", "1", "4", "2"]);
    expect(applyFilters(list, { ...NO_FILTERS, sort: "newest" }).map((x) => x.id)).toEqual(["4", "3", "2", "1"]);
  });

  it("filters on sale and price range (max exclusive, so bands don't overlap)", () => {
    expect(applyFilters(list, { ...NO_FILTERS, sale: true }).map((x) => x.id)).toEqual(["2", "4"]);
    expect(applyFilters(list, { ...NO_FILTERS, min: 3000, max: 9000 }).map((x) => x.id)).toEqual(["1", "4"]);
    expect(applyFilters(list, { ...NO_FILTERS, min: 9000 }).map((x) => x.id)).toEqual(["3"]);
  });

  it("does not mutate the list it was given", () => {
    const copy = list.map((x) => x.id);
    applyFilters(list, { ...NO_FILTERS, sort: "price-desc" });
    expect(list.map((x) => x.id)).toEqual(copy);
  });

  it("price bands are round, ordered and cover every product exactly once", () => {
    const prices = [1200, 2500, 3100, 4800, 6000, 7500, 9900, 15000, 22000];
    const bands = priceBands(prices);
    expect(bands.length).toBeGreaterThanOrEqual(2);
    for (const b of bands.slice(0, -1)) expect(b.max! % 100).toBe(0);
    for (const price of prices) {
      const hits = bands.filter((b) => (b.min == null || price >= b.min) && (b.max == null || price < b.max));
      expect(hits, String(price)).toHaveLength(1);
    }
    expect(priceBands([1000, 2000])).toEqual([]);
  });

  it("round-trips through the URL and ignores junk", () => {
    const f = { sort: "price-asc" as const, sale: true, min: 1000, max: 5000 };
    const url = filtersToUrl(new URL("https://x.test/store/a?category=shoes"), f);
    expect(url.searchParams.get("category")).toBe("shoes");
    expect(filtersFromSearch(url.search)).toEqual(f);
    expect(filtersToUrl(new URL("https://x.test/?sort=newest&sale=1"), NO_FILTERS).search).toBe("");
    expect(filtersFromSearch("?sort=hack&min=-5&max=abc&sale=yes")).toEqual(NO_FILTERS);
  });
});

describe("product details", () => {
  it("cards carry only the first three specs", () => {
    const details = { specs: [1, 2, 3, 4, 5].map((n) => ({ label: `L${n}`, value: `V${n}` })), highlights: ["x"] };
    const card = toCardProduct({ id: "1", details }) as unknown as { specs: unknown[]; details?: unknown };
    expect(card.specs).toEqual(keySpecs(parseProductDetails(details), 3));
    expect(card.specs).toHaveLength(3);
    expect(card.details).toBeUndefined();
  });

  it("the editor draft round-trips and drops empty parts", () => {
    const d = { specs: [{ label: "RAM", value: "8GB" }], notes: { top: ["Bergamot"], heart: [], base: ["Oud", "Musk"] }, highlights: ["Fast"] };
    expect(draftToDetails(toDraft(d))).toEqual(d);
    expect(draftToDetails({ specs: [{ label: "RAM", value: " " }], top: " , ", heart: "", base: "", highlights: "\n \n" })).toBeNull();
    expect(draftToDetails({ ...toDraft(null), top: "Rose, , Jasmine ," })?.notes?.top).toEqual(["Rose", "Jasmine"]);
  });
});

describe("search", () => {
  it("escapes LIKE wildcards so they match literally", () => {
    expect(likePattern("50%")).toBe("%50\\%%");
    expect(likePattern("a_b")).toBe("%a\\_b%");
    expect(likePattern("c:\\x")).toBe("%c:\\\\x%");
  });
});

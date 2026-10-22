import { describe, expect, it } from "vitest";
import {
  THEMES,
  THEME_CATEGORIES,
  decodeThemePreview,
  encodeThemePreview,
  parseCustomization,
  resolveStoreTheme,
  storeThemeState,
  themeCss,
} from "@/lib/themes";
import { getDemoStore } from "@/lib/themes/demo";

describe("theme catalog", () => {
  it("ships the agreed number of themes per category", () => {
    for (const { id, limit } of THEME_CATEGORIES) {
      expect(THEMES.filter((t) => t.category === id)).toHaveLength(limit);
    }
    expect(THEMES).toHaveLength(41);
  });

  it("has unique ids and valid accent colors", () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    for (const t of THEMES) expect(t.tokens.accent).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("parseCustomization", () => {
  it("keeps valid overrides and drops invalid ones individually", () => {
    const c = parseCustomization({
      tokens: { accent: "#123456", background: "red;}</style><script>", radius: "huge" },
      layout: { hero: "fullbleed", sections: ["hero", "hero", "nope"] },
      copy: { heroCta: "  Go  ", addToCart: "x".repeat(50) },
    });
    expect(c.tokens).toEqual({ accent: "#123456" });
    expect(c.layout).toEqual({ hero: "fullbleed" });
    expect(c.copy).toEqual({ heroCta: "Go" });
  });

  it("dedupes sections", () => {
    expect(parseCustomization({ layout: { sections: ["hero", "about", "hero"] } }).layout?.sections).toEqual(["hero", "about"]);
  });

  it("survives garbage", () => {
    expect(parseCustomization("nope")).toEqual({});
    expect(parseCustomization(null)).toEqual({});
  });
});

describe("resolveStoreTheme", () => {
  it("maps legacy stores onto Duka Classic using the old columns", () => {
    const store = { storefront_accent_color: "#6366f1", storefront_font: "playfair", storefront_card_style: "sharp" };
    const t = resolveStoreTheme(store);
    expect(t.id).toBe("classic");
    expect(t.tokens.accent).toBe("#6366f1");
    expect(t.tokens.headingFont).toBe("playfair");
    expect(t.tokens.radius).toBe("sm");
    expect(storeThemeState(store).themeId).toBe("classic");
  });

  it("applies saved theme + overrides", () => {
    const t = resolveStoreTheme({ storefront_theme_id: "atelier", storefront_customization: { copy: { heroCta: "Shop" } } });
    expect(t.layout.card).toBe("editorial");
    expect(t.copy.heroCta).toBe("Shop");
  });

  it("prefers a valid preview, ignores an unknown one", () => {
    const store = { storefront_theme_id: "atelier" };
    expect(resolveStoreTheme(store, { themeId: "consult", customization: {} }).id).toBe("consult");
    expect(resolveStoreTheme(store, { themeId: "missing", customization: {} }).id).toBe("atelier");
  });
});

describe("theme preview encoding", () => {
  it("round-trips, including non-ASCII text", () => {
    const raw = encodeThemePreview({ themeId: "quick-bites", customization: { copy: { announcement: "Free delivery over ₦20,000 🎉" } } });
    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeThemePreview(raw)).toEqual({ themeId: "quick-bites", customization: { copy: { announcement: "Free delivery over ₦20,000 🎉" } } });
  });

  it("rejects junk", () => {
    expect(decodeThemePreview("!!!")).toBeNull();
    expect(decodeThemePreview(null)).toBeNull();
  });
});

describe("highlights", () => {
  it("validates icons, trims text and caps the list at 4", () => {
    const c = parseCustomization({
      copy: {
        highlights: [
          { icon: "rocket", title: " Fast ", text: "Same day" },
          { icon: "truck", title: "A" },
          { icon: "truck", title: "B", text: "" },
          { icon: "truck", title: "C", text: "" },
        ],
      },
    });
    expect(c.copy?.highlights?.[0]).toEqual({ icon: "star", title: "Fast", text: "Same day" });
    expect(c.copy?.highlights?.[1]).toEqual({ icon: "truck", title: "A", text: "" });
    expect(parseCustomization({ copy: { highlights: Array(5).fill({ icon: "star", title: "x", text: "" }) } }).copy?.highlights).toBeUndefined();
  });

  it("every theme ships 2–4 highlights with titles", () => {
    for (const t of THEMES) {
      expect(t.copy.highlights.length).toBeGreaterThanOrEqual(2);
      expect(t.copy.highlights.length).toBeLessThanOrEqual(4);
      for (const h of t.copy.highlights) expect(h.title).not.toBe("");
    }
  });
});

describe("demo stores", () => {
  it("builds a full catalog for every theme without repeating featured as newest", () => {
    for (const t of THEMES) {
      const demo = getDemoStore(t);
      expect(demo.products.length).toBeGreaterThanOrEqual(6);
      expect(demo.store.banner_images?.length).toBeGreaterThan(0);
      expect(demo.store.whatsapp).toBeUndefined();
      const featured = demo.store.featured_product_ids ?? [];
      expect(featured[0]).not.toBe(demo.products[0].id);
      for (const tile of demo.categoryTiles) expect(tile.product_count).toBeGreaterThan(0);
    }
  });
});

describe("themeCss", () => {
  it("emits typography and rhythm variables", () => {
    const css = themeCss(resolveStoreTheme({ storefront_theme_id: "streetwear" }));
    expect(css).toContain("--sf-heading-transform: uppercase");
    expect(css).toContain("--sf-gap:");
  });

  it("darkens a light accent used as text on a light page", () => {
    const css = themeCss(resolveStoreTheme({ storefront_theme_id: "streetwear", storefront_customization: { tokens: { mode: "light" } } }));
    // First declaration is the light-page value; the .dark rule keeps lime on black.
    expect(css.match(/--sf-accent-ink: (#[0-9a-f]{6})/)?.[1]).not.toBe("#a3e635");
    expect(css).toMatch(/.dark[^{]*{[^}]*--sf-accent-ink: #a3e635/);
  });

  it("picks readable text on dark and light accents", () => {
    const dark = themeCss(resolveStoreTheme({ storefront_theme_id: "atelier" }));
    const light = themeCss(resolveStoreTheme({ storefront_theme_id: "streetwear" }));
    expect(dark).toContain("--sf-on-accent: #ffffff");
    expect(light).toContain("--sf-on-accent: #000000");
  });
});

import { describe, it, expect } from "vitest";
import { THEMES, THEME_CATEGORIES, getTheme } from "@/lib/themes/catalog";
import { TIER_PRICE_RANGE, navDefaultsFor } from "@/lib/themes/kits";
import { capCustomization, mergeTheme, parseCustomization } from "@/lib/themes/resolve";
import { NAV_STYLES } from "@/lib/themes/types";
import { FREE_THEME_IDS } from "@/lib/features-shared";

// Theme kits: every theme priced inside its tier, ships a nav bar, and the
// tier decides how much a merchant can change.

describe("pricing", () => {
  it("every theme is priced inside its tier's band", () => {
    for (const t of THEMES) {
      const [min, max] = TIER_PRICE_RANGE[t.tier];
      expect(t.price, t.id).toBeGreaterThanOrEqual(min);
      expect(t.price, t.id).toBeLessThanOrEqual(max);
    }
  });

  it("exactly one free theme per category, and only those are free", () => {
    for (const c of THEME_CATEGORIES) {
      const free = THEMES.filter((t) => t.category === c.id && t.tier === "free");
      expect(free, c.id).toHaveLength(1);
      expect(FREE_THEME_IDS.has(free[0].id)).toBe(true);
    }
    expect(THEMES.filter((t) => t.price === 0).every((t) => FREE_THEME_IDS.has(t.id))).toBe(true);
  });

  it("paid themes run from ₦10,000 to ₦50,000", () => {
    const paid = THEMES.filter((t) => t.price > 0).map((t) => t.price);
    expect(Math.min(...paid)).toBeGreaterThanOrEqual(10_000);
    expect(Math.max(...paid)).toBeLessThanOrEqual(50_000);
  });
});

describe("navigation", () => {
  it("every theme ships a nav bar, and all ten styles are in use", () => {
    for (const t of THEMES) expect(NAV_STYLES).toContain(t.layout.nav);
    expect(new Set(THEMES.map((t) => t.layout.nav))).toEqual(new Set(NAV_STYLES));
  });

  it("style defaults: marketplace leads with a search bar, drawer hides category links", () => {
    expect(navDefaultsFor("marketplace").search).toBe("bar");
    expect(navDefaultsFor("drawer").categories).toBe(false);
    expect(navDefaultsFor("classic")).toEqual({ sticky: true, search: "icon", categories: true, logoSize: "md", tone: "page" });
  });

  it("a merchant can switch style and flip single options without losing the rest", () => {
    const t = getTheme("gadget-hub")!; // twotier, dark tone
    const custom = parseCustomization({ layout: { nav: "floating", navOptions: { sticky: false } } });
    const r = mergeTheme(t, custom);
    expect(r.layout.nav).toBe("floating");
    expect(r.layout.navOptions).toMatchObject({ sticky: false, tone: "dark", search: "bar" });
  });

  it("drops unknown nav styles and bad option values individually", () => {
    const c = parseCustomization({ layout: { nav: "spaceship", navOptions: { search: "huge", logoSize: "lg" } } });
    expect(c.layout?.nav).toBeUndefined();
    expect(c.layout?.navOptions).toEqual({ logoSize: "lg" });
  });
});

describe("customisation by tier", () => {
  const everything = parseCustomization({
    tokens: { accent: "#123456", headingFont: "playfair", radius: "xl", background: "#fafafa", density: "airy", mode: "dark" },
    layout: { nav: "mega", navOptions: { sticky: false }, sections: ["hero", "allProducts"], hero: "split", columns: 3 },
    copy: { heroTitle: "Hello" },
  });

  it("free themes: colour, mode, text and nav switches only", () => {
    const c = capCustomization(getTheme("classic")!, everything);
    expect(c.tokens).toEqual({ accent: "#123456", mode: "dark" });
    expect(c.layout).toEqual({ navOptions: { sticky: false } });
    expect(c.copy).toEqual({ heroTitle: "Hello" });
  });

  it("starter themes add fonts, corners, nav style and sections", () => {
    const c = capCustomization(getTheme("marketplace")!, everything);
    expect(c.tokens).toMatchObject({ headingFont: "playfair", radius: "xl" });
    expect(c.tokens).not.toHaveProperty("background");
    expect(c.layout).toMatchObject({ nav: "mega", sections: ["hero", "allProducts"] });
    expect(c.layout).not.toHaveProperty("hero");
  });

  it("standard themes and up: everything", () => {
    expect(capCustomization(getTheme("bazaar")!, everything)).toEqual(everything);
    expect(capCustomization(getTheme("wig-vault")!, everything)).toEqual(everything);
  });
});

// Each theme's "kit": price, tier and the navigation bar it ships with.
// Themes in catalog.ts / catalog-more.ts describe the look; this table is
// the commercial and structural side, kept in one place so pricing and
// layout choices are easy to review side by side.
import type { CollectionLayout, NavOptions, NavStyle, ProductLayout, SearchStyle, StorefrontTheme, ThemeLayout, ThemeTier } from "./types";

/** A theme as written in the catalogue, before its kit is applied. */
export type ThemeSeed = Omit<StorefrontTheme, "tier" | "price" | "layout"> & {
  layout: Omit<ThemeLayout, "nav" | "navOptions" | "product" | "collection" | "search">;
};

interface Kit {
  tier: ThemeTier;
  price: number;
  nav: NavStyle;
  navOptions?: Partial<NavOptions>;
  /** product page · category page · search style */
  pages: [ProductLayout, CollectionLayout, SearchStyle];
}

export const TIER_LABEL: Record<ThemeTier, string> = {
  free: "Free",
  starter: "Starter",
  standard: "Standard",
  premium: "Premium",
  signature: "Signature",
};

/** Price band per tier (naira) — individual themes are priced inside it. */
export const TIER_PRICE_RANGE: Record<ThemeTier, [number, number]> = {
  free: [0, 0],
  starter: [10_000, 12_000],
  standard: [15_000, 20_000],
  premium: [25_000, 35_000],
  signature: [40_000, 50_000],
};

const DEFAULT_NAV_OPTIONS: NavOptions = { sticky: true, search: "icon", categories: true, logoSize: "md", tone: "page" };

/** Sensible starting switches per nav style (a theme can still override). */
const NAV_DEFAULTS: Record<NavStyle, Partial<NavOptions>> = {
  classic: {},
  boutique: { logoSize: "lg" },
  marketplace: { search: "bar" },
  floating: {},
  mega: {},
  drawer: { categories: false, logoSize: "lg" },
  app: { search: "bar" },
  overlay: { logoSize: "lg" },
  twotier: { search: "bar" },
  chips: {},
};

const KITS: Record<string, Kit> = {
  // E-commerce
  classic: { tier: "free", price: 0, nav: "classic", pages: ["classic", "grid", "list"] },
  marketplace: { tier: "starter", price: 10_000, nav: "marketplace", pages: ["classic", "aisle", "list"] },
  "gadget-hub": { tier: "premium", price: 30_000, nav: "twotier", navOptions: { tone: "dark" }, pages: ["showcase", "catalog", "spotlight"] },
  "minimal-store": { tier: "starter", price: 10_000, nav: "floating", navOptions: { search: "icon" }, pages: ["editorial", "lookbook", "spotlight"] },
  bazaar: { tier: "standard", price: 15_000, nav: "mega", pages: ["split", "grid", "visual"] },
  // Food delivery
  "quick-bites": { tier: "free", price: 0, nav: "app", pages: ["compact", "menu", "list"] },
  "home-kitchen": { tier: "standard", price: 18_000, nav: "boutique", pages: ["compact", "menu", "visual"] },
  "grill-house": { tier: "premium", price: 30_000, nav: "overlay", pages: ["split", "menu", "spotlight"] },
  "fresh-bowl": { tier: "standard", price: 15_000, nav: "chips", pages: ["compact", "grid", "visual"] },
  "sweet-treats": { tier: "premium", price: 28_000, nav: "floating", navOptions: { tone: "accent" }, pages: ["split", "lookbook", "visual"] },
  // Clothing
  atelier: { tier: "free", price: 0, nav: "drawer", pages: ["editorial", "lookbook", "spotlight"] },
  streetwear: { tier: "premium", price: 32_000, nav: "overlay", navOptions: { tone: "dark" }, pages: ["split", "lookbook", "visual"] },
  boutique: { tier: "standard", price: 20_000, nav: "boutique", pages: ["editorial", "grid", "visual"] },
  ankara: { tier: "premium", price: 30_000, nav: "mega", navOptions: { tone: "accent" }, pages: ["showcase", "lookbook", "visual"] },
  essentials: { tier: "starter", price: 10_000, nav: "floating", pages: ["classic", "grid", "list"] },
  // Services
  consult: { tier: "free", price: 0, nav: "classic", pages: ["classic", "grid", "list"] },
  studio: { tier: "standard", price: 20_000, nav: "overlay", pages: ["editorial", "lookbook", "spotlight"] },
  salon: { tier: "premium", price: 28_000, nav: "boutique", pages: ["split", "grid", "list"] },
  // Perfume
  "noir-essence": { tier: "free", price: 0, nav: "drawer", pages: ["editorial", "lookbook", "spotlight"] },
  "scent-atelier": { tier: "standard", price: 20_000, nav: "boutique", pages: ["split", "grid", "visual"] },
  "oud-house": { tier: "premium", price: 30_000, nav: "mega", pages: ["showcase", "lookbook", "visual"] },
  "bloom-mist": { tier: "starter", price: 10_000, nav: "floating", pages: ["classic", "grid", "visual"] },
  "decant-bar": { tier: "standard", price: 15_000, nav: "marketplace", pages: ["compact", "catalog", "list"] },
  // Local market
  "mama-market": { tier: "free", price: 0, nav: "app", pages: ["compact", "aisle", "list"] },
  "oja-fresh": { tier: "standard", price: 18_000, nav: "chips", navOptions: { tone: "accent" }, pages: ["compact", "aisle", "visual"] },
  "foodstuff-depot": { tier: "premium", price: 25_000, nav: "twotier", pages: ["classic", "catalog", "list"] },
  "farm-gate": { tier: "standard", price: 15_000, nav: "boutique", pages: ["split", "grid", "visual"] },
  "provisions-plus": { tier: "starter", price: 12_000, nav: "marketplace", navOptions: { tone: "accent" }, pages: ["compact", "aisle", "spotlight"] },
  // Gadgets
  "tech-grid": { tier: "free", price: 0, nav: "twotier", pages: ["showcase", "catalog", "list"] },
  "neon-circuit": { tier: "premium", price: 35_000, nav: "overlay", pages: ["showcase", "grid", "spotlight"] },
  "phone-plug": { tier: "starter", price: 10_000, nav: "marketplace", pages: ["classic", "catalog", "list"] },
  "sound-lab": { tier: "premium", price: 32_000, nav: "drawer", pages: ["editorial", "lookbook", "spotlight"] },
  "laptop-lane": { tier: "standard", price: 18_000, nav: "floating", pages: ["showcase", "catalog", "spotlight"] },
  // Hair
  "crown-hair": { tier: "free", price: 0, nav: "boutique", pages: ["split", "grid", "visual"] },
  "silk-strands": { tier: "starter", price: 10_000, nav: "floating", pages: ["classic", "grid", "visual"] },
  "wig-vault": { tier: "premium", price: 35_000, nav: "overlay", pages: ["editorial", "lookbook", "spotlight"] },
  "naturals-co": { tier: "standard", price: 15_000, nav: "classic", pages: ["compact", "grid", "list"] },
  "lace-lab": { tier: "starter", price: 12_000, nav: "drawer", pages: ["split", "lookbook", "visual"] },
  // Interiors
  "nest-interiors": { tier: "free", price: 0, nav: "overlay", pages: ["editorial", "lookbook", "visual"] },
  "luxe-living": { tier: "premium", price: 35_000, nav: "mega", navOptions: { tone: "dark" }, pages: ["showcase", "lookbook", "spotlight"] },
  "aesthetic-corner": { tier: "standard", price: 20_000, nav: "floating", pages: ["split", "grid", "visual"] },
};

export function kitFor(id: string): Kit {
  const kit = KITS[id];
  if (!kit) throw new Error(`Theme "${id}" has no kit in themes/kits.ts`);
  return kit;
}

/** Catalogue entry → full theme (adds tier, price, nav and nav options). */
export function withKit(seed: ThemeSeed): StorefrontTheme {
  const kit = kitFor(seed.id);
  return {
    ...seed,
    tier: kit.tier,
    price: kit.price,
    layout: {
      ...seed.layout,
      product: kit.pages[0],
      collection: kit.pages[1],
      search: kit.pages[2],
      nav: kit.nav,
      navOptions: { ...DEFAULT_NAV_OPTIONS, ...NAV_DEFAULTS[kit.nav], ...kit.navOptions },
    },
  };
}

export function navDefaultsFor(style: NavStyle): NavOptions {
  return { ...DEFAULT_NAV_OPTIONS, ...NAV_DEFAULTS[style] };
}

/**
 * What a theme lets the merchant change. Cheaper themes keep the look
 * tighter (fewer knobs, quicker to set up); higher tiers unlock more.
 * Enforced when saving (older saved settings keep rendering as they were).
 */
export interface Capabilities {
  /** Accent, light/dark mode, all text, highlights, nav switches */
  basics: true;
  /** Fonts, heading style, corner style, nav style, section order */
  style: boolean;
  /** Backgrounds, spacing, hero/card/category/footer layouts, grid columns */
  layout: boolean;
  /** Switch product page, category page and search layouts */
  pages: boolean;
}

export const TIER_CAPS: Record<ThemeTier, Capabilities> = {
  free: { basics: true, style: false, layout: false, pages: false },
  starter: { basics: true, style: true, layout: false, pages: false },
  standard: { basics: true, style: true, layout: true, pages: false },
  premium: { basics: true, style: true, layout: true, pages: true },
  signature: { basics: true, style: true, layout: true, pages: true },
};

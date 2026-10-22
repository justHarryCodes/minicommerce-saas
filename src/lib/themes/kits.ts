// Each theme's "kit": price, tier and the navigation bar it ships with.
// Themes in catalog.ts / catalog-more.ts describe the look; this table is
// the commercial and structural side, kept in one place so pricing and
// layout choices are easy to review side by side.
import type { NavOptions, NavStyle, StorefrontTheme, ThemeLayout, ThemeTier } from "./types";

/** A theme as written in the catalogue, before its kit is applied. */
export type ThemeSeed = Omit<StorefrontTheme, "tier" | "price" | "layout"> & {
  layout: Omit<ThemeLayout, "nav" | "navOptions">;
};

interface Kit {
  tier: ThemeTier;
  price: number;
  nav: NavStyle;
  navOptions?: Partial<NavOptions>;
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
  classic: { tier: "free", price: 0, nav: "classic" },
  marketplace: { tier: "starter", price: 10_000, nav: "marketplace" },
  "gadget-hub": { tier: "premium", price: 30_000, nav: "twotier", navOptions: { tone: "dark" } },
  "minimal-store": { tier: "starter", price: 10_000, nav: "floating", navOptions: { search: "icon" } },
  bazaar: { tier: "standard", price: 15_000, nav: "mega" },
  // Food delivery
  "quick-bites": { tier: "free", price: 0, nav: "app" },
  "home-kitchen": { tier: "standard", price: 18_000, nav: "boutique" },
  "grill-house": { tier: "premium", price: 30_000, nav: "overlay" },
  "fresh-bowl": { tier: "standard", price: 15_000, nav: "chips" },
  "sweet-treats": { tier: "premium", price: 28_000, nav: "floating", navOptions: { tone: "accent" } },
  // Clothing
  atelier: { tier: "free", price: 0, nav: "drawer" },
  streetwear: { tier: "premium", price: 32_000, nav: "overlay", navOptions: { tone: "dark" } },
  boutique: { tier: "standard", price: 20_000, nav: "boutique" },
  ankara: { tier: "premium", price: 30_000, nav: "mega", navOptions: { tone: "accent" } },
  essentials: { tier: "starter", price: 10_000, nav: "floating" },
  // Services
  consult: { tier: "free", price: 0, nav: "classic" },
  studio: { tier: "standard", price: 20_000, nav: "overlay" },
  salon: { tier: "premium", price: 28_000, nav: "boutique" },
  // Perfume
  "noir-essence": { tier: "free", price: 0, nav: "drawer" },
  "scent-atelier": { tier: "standard", price: 20_000, nav: "boutique" },
  "oud-house": { tier: "premium", price: 30_000, nav: "mega" },
  "bloom-mist": { tier: "starter", price: 10_000, nav: "floating" },
  "decant-bar": { tier: "standard", price: 15_000, nav: "marketplace" },
  // Local market
  "mama-market": { tier: "free", price: 0, nav: "app" },
  "oja-fresh": { tier: "standard", price: 18_000, nav: "chips", navOptions: { tone: "accent" } },
  "foodstuff-depot": { tier: "premium", price: 25_000, nav: "twotier" },
  "farm-gate": { tier: "standard", price: 15_000, nav: "boutique" },
  "provisions-plus": { tier: "starter", price: 12_000, nav: "marketplace", navOptions: { tone: "accent" } },
  // Gadgets
  "tech-grid": { tier: "free", price: 0, nav: "twotier" },
  "neon-circuit": { tier: "premium", price: 35_000, nav: "overlay" },
  "phone-plug": { tier: "starter", price: 10_000, nav: "marketplace" },
  "sound-lab": { tier: "premium", price: 32_000, nav: "drawer" },
  "laptop-lane": { tier: "standard", price: 18_000, nav: "floating" },
  // Hair
  "crown-hair": { tier: "free", price: 0, nav: "boutique" },
  "silk-strands": { tier: "starter", price: 10_000, nav: "floating" },
  "wig-vault": { tier: "premium", price: 35_000, nav: "overlay" },
  "naturals-co": { tier: "standard", price: 15_000, nav: "classic" },
  "lace-lab": { tier: "starter", price: 12_000, nav: "drawer" },
  // Interiors
  "nest-interiors": { tier: "free", price: 0, nav: "overlay" },
  "luxe-living": { tier: "premium", price: 35_000, nav: "mega", navOptions: { tone: "dark" } },
  "aesthetic-corner": { tier: "standard", price: 20_000, nav: "floating" },
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
}

export const TIER_CAPS: Record<ThemeTier, Capabilities> = {
  free: { basics: true, style: false, layout: false },
  starter: { basics: true, style: true, layout: false },
  standard: { basics: true, style: true, layout: true },
  premium: { basics: true, style: true, layout: true },
  signature: { basics: true, style: true, layout: true },
};

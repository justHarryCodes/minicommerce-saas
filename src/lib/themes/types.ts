import type { FontKey } from "@/lib/theme-presets";

export type ThemeCategory = "ecommerce" | "food" | "clothing" | "services" | "perfume" | "market" | "gadgets" | "hair" | "interior";

/** How the top of the homepage is laid out. */
export type HeroVariant = "split" | "banner" | "fullbleed" | "centered" | "minimal";
/** How a single product renders in grids and rails. */
export type CardVariant = "classic" | "minimal" | "editorial" | "menu" | "service";
/** How the "shop by category" strip renders. */
export type CategoryStyle = "tiles" | "circles" | "pills" | "cards";
/** Site header: search-led marketplace bar, centred-logo boutique, or a single slim row. */
export type HeaderVariant = "standard" | "centered" | "minimal";

/** The ten navigation bars. Each is its own component (components/storefront/nav). */
export const NAV_STYLES = [
  "classic",     // logo · links · search · cart
  "boutique",    // centred logo, links split either side
  "marketplace", // big search bar + department row
  "floating",    // rounded pill floating over the page
  "mega",        // category columns with pictures
  "drawer",      // full-screen menu behind a single button
  "app",         // slim top bar + bottom tab bar on phones
  "overlay",     // see-through over the hero, solid on scroll
  "twotier",     // utility row (contact, delivery) + main bar
  "chips",       // sticky, scrollable category chips
] as const;
export type NavStyle = (typeof NAV_STYLES)[number];

/** Product page layouts (components/storefront/product). */
export const PRODUCT_LAYOUTS = ["classic", "editorial", "showcase", "split", "compact"] as const;
export type ProductLayout = (typeof PRODUCT_LAYOUTS)[number];

/** Category / search-result layouts (components/storefront/collection). */
export const COLLECTION_LAYOUTS = ["grid", "lookbook", "menu", "aisle", "catalog"] as const;
export type CollectionLayout = (typeof COLLECTION_LAYOUTS)[number];

/** Search overlay styles. */
export const SEARCH_STYLES = ["list", "visual", "spotlight"] as const;
export type SearchStyle = (typeof SEARCH_STYLES)[number];

/** Simple switches every nav style understands. */
export interface NavOptions {
  sticky: boolean;
  /** Search as a full bar, an icon, or hidden */
  search: "bar" | "icon" | "hidden";
  /** Show category links in the bar */
  categories: boolean;
  logoSize: "sm" | "md" | "lg";
  /** Bar colour: the page, the accent colour, or dark */
  tone: "page" | "accent" | "dark";
}

/**
 * How much a theme offers (and costs). Free: one per category. Higher tiers
 * have more bespoke pages and unlock deeper customisation.
 */
export type ThemeTier = "free" | "starter" | "standard" | "premium" | "signature";
/** Site footer: light columns, a bold brand block, or a single slim line. */
export type FooterVariant = "standard" | "bold" | "minimal";
export type Radius = "none" | "sm" | "md" | "lg" | "xl";
export type ColorMode = "auto" | "light" | "dark";
export type GridColumns = 2 | 3 | 4 | 5;
/** Display typography personality. */
export type HeadingStyle = "bold" | "elegant" | "condensed";
/** Vertical rhythm between homepage sections. */
export type Density = "compact" | "comfortable" | "airy";

export const SECTION_IDS = [
  "hero",
  "highlights",
  "categories",
  "perks",
  "featured",
  "promo",
  "newArrivals",
  "categoryRails",
  "allProducts",
  "testimonials",
  "about",
  "ctaBand",
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const HIGHLIGHT_ICONS = [
  "truck",
  "clock",
  "shield",
  "star",
  "leaf",
  "sparkles",
  "phone",
  "refresh",
  "gift",
  "scissors",
  "calendar",
  "award",
  "flame",
  "heart",
] as const;
export type HighlightIcon = (typeof HIGHLIGHT_ICONS)[number];

export interface Highlight {
  icon: HighlightIcon;
  title: string;
  text: string;
}

export interface ThemeTokens {
  accent: string;
  bodyFont: FontKey;
  headingFont: FontKey;
  headingStyle: HeadingStyle;
  radius: Radius;
  density: Density;
  mode: ColorMode;
  /** Page background in light mode */
  background: string;
  /** Page background in dark mode */
  backgroundDark: string;
}

export interface ThemeLayout {
  /** Legacy 3-way header (kept for stored customisations); `nav` drives the bar */
  header: HeaderVariant;
  nav: NavStyle;
  navOptions: NavOptions;
  product: ProductLayout;
  collection: CollectionLayout;
  search: SearchStyle;
  hero: HeroVariant;
  card: CardVariant;
  categories: CategoryStyle;
  footer: FooterVariant;
  /** Desktop product grid columns (list-style cards ignore this) */
  columns: GridColumns;
  /** Homepage sections, in render order. Anything not listed is hidden. */
  sections: SectionId[];
}

export interface ThemeCopy {
  /** Small label above the hero headline; empty → hidden */
  heroEyebrow: string;
  /** Empty → store name */
  heroTitle: string;
  /** Empty → store description */
  heroSubtitle: string;
  heroCta: string;
  addToCart: string;
  categoriesTitle: string;
  featuredTitle: string;
  newArrivalsTitle: string;
  allProductsTitle: string;
  promoEyebrow: string;
  promoTitle: string;
  promoText: string;
  promoCta: string;
  testimonialsTitle: string;
  ctaTitle: string;
  ctaText: string;
  /** Thin bar above the nav; empty → hidden */
  announcement: string;
  /** Value-proposition strip (2–4 items) */
  highlights: Highlight[];
}

export interface StorefrontTheme {
  id: string;
  name: string;
  category: ThemeCategory;
  tagline: string;
  /** Short "best for" list shown in the gallery */
  bestFor: string[];
  tokens: ThemeTokens;
  layout: ThemeLayout;
  copy: ThemeCopy;
  tier: ThemeTier;
  /** One-time price in naira (0 for the free theme of each category) */
  price: number;
}

/** What a merchant has changed on top of their chosen theme. */
export interface ThemeCustomization {
  tokens?: Partial<ThemeTokens>;
  layout?: Partial<Omit<ThemeLayout, "navOptions">> & { navOptions?: Partial<NavOptions> };
  copy?: Partial<ThemeCopy>;
}

export interface ResolvedTheme {
  id: string;
  name: string;
  category: ThemeCategory;
  tokens: ThemeTokens;
  layout: ThemeLayout;
  copy: ThemeCopy;
}

/** A review shown in the testimonials section. */
export interface Testimonial {
  id: string;
  customer_name: string;
  rating: number;
  body: string;
  product_name?: string | null;
}

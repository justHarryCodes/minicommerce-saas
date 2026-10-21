import type { FontKey } from "@/lib/theme-presets";

export type ThemeCategory = "ecommerce" | "food" | "clothing" | "services";

/** How the top of the homepage is laid out. */
export type HeroVariant = "split" | "banner" | "fullbleed" | "centered" | "minimal";
/** How a single product renders in grids and rails. */
export type CardVariant = "classic" | "minimal" | "editorial" | "menu" | "service";
/** How the "shop by category" strip renders. */
export type CategoryStyle = "tiles" | "circles" | "pills" | "cards";
/** Site header: search-led marketplace bar, centred-logo boutique, or a single slim row. */
export type HeaderVariant = "standard" | "centered" | "minimal";
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
  header: HeaderVariant;
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
}

/** What a merchant has changed on top of their chosen theme. */
export interface ThemeCustomization {
  tokens?: Partial<ThemeTokens>;
  layout?: Partial<ThemeLayout>;
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

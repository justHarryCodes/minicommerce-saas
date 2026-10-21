// Curated storefront theme presets — a shortcut that sets accent color, font,
// and card style together. Full storefront themes (layout + copy + tokens)
// live in src/lib/themes; these presets remain for the legacy columns.

export type CardStyle = "rounded" | "sharp";

export const FONT_KEYS = [
  "inter",
  "poppins",
  "playfair",
  "spacegrotesk",
  "dmsans",
  "manrope",
  "outfit",
  "cormorant",
  "bebas",
  "fraunces",
  "lora",
  "syne",
] as const;
export type FontKey = (typeof FONT_KEYS)[number];

export interface ThemePreset {
  id: string;
  label: string;
  accentColor: string;
  font: FontKey;
  cardStyle: CardStyle;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: "classic-amber", label: "Classic",     accentColor: "#f59e0b", font: "inter",        cardStyle: "rounded" },
  { id: "modern-indigo", label: "Modern",      accentColor: "#6366f1", font: "spacegrotesk",  cardStyle: "sharp" },
  { id: "boutique-rose", label: "Boutique",    accentColor: "#f43f5e", font: "playfair",      cardStyle: "rounded" },
  { id: "fresh-emerald", label: "Fresh",       accentColor: "#10b981", font: "poppins",       cardStyle: "rounded" },
  { id: "sky-minimal",   label: "Minimal",     accentColor: "#0ea5e9", font: "inter",         cardStyle: "sharp" },
  { id: "bold-orange",   label: "Bold",        accentColor: "#f97316", font: "poppins",       cardStyle: "sharp" },
];

// CSS font-family stacks, keyed the same as FontKey — used wherever
// --sf-font / --sf-heading-font is injected.
export const FONT_STACKS: Record<FontKey, string> = {
  inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
  poppins: '"Poppins", ui-sans-serif, system-ui, sans-serif',
  playfair: '"Playfair Display", ui-serif, Georgia, serif',
  spacegrotesk: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
  dmsans: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  manrope: '"Manrope", ui-sans-serif, system-ui, sans-serif',
  outfit: '"Outfit", ui-sans-serif, system-ui, sans-serif',
  cormorant: '"Cormorant Garamond", ui-serif, Georgia, serif',
  bebas: '"Bebas Neue", Impact, ui-sans-serif, sans-serif',
  fraunces: '"Fraunces", ui-serif, Georgia, serif',
  lora: '"Lora", ui-serif, Georgia, serif',
  syne: '"Syne", ui-sans-serif, system-ui, sans-serif',
};

export const FONT_LABELS: Record<FontKey, string> = {
  inter: "Inter",
  poppins: "Poppins",
  playfair: "Playfair Display",
  spacegrotesk: "Space Grotesk",
  dmsans: "DM Sans",
  manrope: "Manrope",
  outfit: "Outfit",
  cormorant: "Cormorant",
  bebas: "Bebas Neue",
  fraunces: "Fraunces",
  lora: "Lora",
  syne: "Syne",
};

// Google Fonts css2 `family=` values (weights trimmed to what the storefront uses).
const GOOGLE_FAMILIES: Record<FontKey, string> = {
  inter: "Inter:wght@400;500;600;700;800;900",
  poppins: "Poppins:wght@400;500;600;700;800;900",
  playfair: "Playfair+Display:wght@500;600;700;800;900",
  spacegrotesk: "Space+Grotesk:wght@400;500;600;700",
  dmsans: "DM+Sans:wght@400;500;600;700;800;900",
  manrope: "Manrope:wght@400;500;600;700;800",
  outfit: "Outfit:wght@400;500;600;700;800;900",
  cormorant: "Cormorant+Garamond:wght@500;600;700",
  bebas: "Bebas+Neue",
  fraunces: "Fraunces:wght@500;600;700;800;900",
  lora: "Lora:wght@500;600;700",
  syne: "Syne:wght@500;600;700;800",
};

/** One stylesheet URL that loads every given font (deduped). */
export function googleFontsHref(fonts: FontKey[]): string {
  const families = Array.from(new Set(fonts)).map((f) => `family=${GOOGLE_FAMILIES[f]}`);
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

export function isFontKey(value: unknown): value is FontKey {
  return typeof value === "string" && value in FONT_STACKS;
}

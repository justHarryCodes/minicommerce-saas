// Curated storefront theme presets — a shortcut that sets accent color, font,
// and card style together. Not a new customization axis: after picking one,
// the existing per-field accent-color swatches in SettingsClient still work
// for fine-tuning, same as before.

export type CardStyle = "rounded" | "sharp";
export type FontKey = "inter" | "poppins" | "playfair" | "spacegrotesk";

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
// --sf-font is injected. All are web-safe fallback chains; no webfont
// loading is wired up yet, so pick fonts with a decent system-font fallback.
export const FONT_STACKS: Record<FontKey, string> = {
  inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
  poppins: '"Poppins", ui-sans-serif, system-ui, sans-serif',
  playfair: '"Playfair Display", ui-serif, Georgia, serif',
  spacegrotesk: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
};

export function isFontKey(value: unknown): value is FontKey {
  return typeof value === "string" && value in FONT_STACKS;
}

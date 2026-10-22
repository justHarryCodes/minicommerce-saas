import chroma from "chroma-js";
import { z } from "zod";
import { FONT_KEYS, FONT_STACKS, isFontKey } from "@/lib/theme-presets";
import { deriveThemeColors } from "@/lib/utils";
import { DEFAULT_THEME_ID, getTheme, THEMES } from "./catalog";
import { FREE_THEME_IDS } from "@/lib/features-shared";
import { TIER_CAPS } from "./kits";
import { HIGHLIGHT_ICONS, NAV_STYLES, SECTION_IDS } from "./types";
import type { Density, HeadingStyle, ResolvedTheme, StorefrontTheme, ThemeCustomization, Radius } from "./types";

// ── Validation ──────────────────────────────────────────────────────────────
// Every field is optional and individually `.catch(undefined)` — one bad
// value drops only that override instead of throwing away the whole
// customization. Colors are strict 6-digit hex because they're interpolated
// into an inline <style> tag.

const HEX = /^#[0-9a-fA-F]{6}$/;
const hex = z.string().regex(HEX).optional().catch(undefined);
const text = (max: number) => z.string().trim().max(max).optional().catch(undefined);
const oneOf = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values).optional().catch(undefined);

export const customizationSchema = z
  .object({
    tokens: z
      .object({
        accent: hex,
        bodyFont: oneOf(FONT_KEYS),
        headingFont: oneOf(FONT_KEYS),
        headingStyle: oneOf(["bold", "elegant", "condensed"] as const),
        radius: oneOf(["none", "sm", "md", "lg", "xl"] as const),
        density: oneOf(["compact", "comfortable", "airy"] as const),
        mode: oneOf(["auto", "light", "dark"] as const),
        background: hex,
        backgroundDark: hex,
      })
      .optional()
      .catch(undefined),
    layout: z
      .object({
        header: oneOf(["standard", "centered", "minimal"] as const),
        nav: oneOf(NAV_STYLES),
        navOptions: z
          .object({
            sticky: z.boolean().optional().catch(undefined),
            search: oneOf(["bar", "icon", "hidden"] as const),
            categories: z.boolean().optional().catch(undefined),
            logoSize: oneOf(["sm", "md", "lg"] as const),
            tone: oneOf(["page", "accent", "dark"] as const),
          })
          .optional()
          .catch(undefined),
        hero: oneOf(["split", "banner", "fullbleed", "centered", "minimal"] as const),
        card: oneOf(["classic", "minimal", "editorial", "menu", "service"] as const),
        categories: oneOf(["tiles", "circles", "pills", "cards"] as const),
        footer: oneOf(["standard", "bold", "minimal"] as const),
        columns: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional().catch(undefined),
        sections: z
          .array(z.enum(SECTION_IDS))
          .max(SECTION_IDS.length * 2)
          .transform((s) => Array.from(new Set(s)))
          .optional()
          .catch(undefined),
      })
      .optional()
      .catch(undefined),
    copy: z
      .object({
        heroEyebrow: text(40),
        heroTitle: text(80),
        heroSubtitle: text(200),
        heroCta: text(30),
        addToCart: text(20),
        categoriesTitle: text(40),
        featuredTitle: text(40),
        newArrivalsTitle: text(40),
        allProductsTitle: text(40),
        promoEyebrow: text(40),
        promoTitle: text(80),
        promoText: text(200),
        promoCta: text(30),
        testimonialsTitle: text(40),
        ctaTitle: text(80),
        ctaText: text(200),
        announcement: text(120),
        highlights: z
          .array(
            z.object({
              icon: z.enum(HIGHLIGHT_ICONS).catch("star"),
              title: z.string().trim().max(40),
              text: z.string().trim().max(80).catch(""),
            }),
          )
          .max(4)
          .optional()
          .catch(undefined),
      })
      .optional()
      .catch(undefined),
  })
  .catch({});

export function parseCustomization(raw: unknown): ThemeCustomization {
  return stripUndefined(customizationSchema.parse(raw ?? {})) as ThemeCustomization;
}

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? {}));
}

// ── Resolution ──────────────────────────────────────────────────────────────

/** Store columns the resolver reads (both raw-row and toCamel'd shapes). */
export interface ThemeSource {
  storefront_theme_id?: string | null;
  storefrontThemeId?: string | null;
  storefront_customization?: unknown;
  storefrontCustomization?: unknown;
  storefront_accent_color?: string;
  storefrontAccentColor?: string;
  storefront_font?: string;
  storefrontFont?: string;
  storefront_card_style?: string;
  storefrontCardStyle?: string;
  storefront_theme_mode?: string;
  storefrontThemeMode?: string;
}

export function mergeTheme(theme: StorefrontTheme, custom: ThemeCustomization): ResolvedTheme {
  return {
    id: theme.id,
    name: theme.name,
    category: theme.category,
    tokens: { ...theme.tokens, ...custom.tokens },
    layout: {
      ...theme.layout,
      ...custom.layout,
      navOptions: { ...theme.layout.navOptions, ...custom.layout?.navOptions },
    },
    copy: { ...theme.copy, ...custom.copy },
  };
}

/**
 * Stores that never picked a theme keep their look from the legacy columns
 * (accent / font / card style / mode) layered on Duka Classic.
 */
function legacyCustomization(store: ThemeSource): ThemeCustomization {
  const accent = store.storefront_accent_color ?? store.storefrontAccentColor;
  const font = store.storefront_font ?? store.storefrontFont;
  const cardStyle = store.storefront_card_style ?? store.storefrontCardStyle;
  const mode = store.storefront_theme_mode ?? store.storefrontThemeMode;
  return parseCustomization({
    tokens: {
      accent,
      bodyFont: isFontKey(font) ? font : undefined,
      headingFont: isFontKey(font) ? font : undefined,
      radius: cardStyle === "sharp" ? "sm" : undefined,
      mode: mode === "light" || mode === "dark" ? mode : undefined,
    },
  });
}

/** The saved theme id + overrides for a store (legacy stores map onto Duka Classic). */
export function storeThemeState(store: ThemeSource): ThemePreview {
  const theme = getTheme(store.storefront_theme_id ?? store.storefrontThemeId);
  if (!theme) return { themeId: DEFAULT_THEME_ID, customization: legacyCustomization(store) };
  return {
    themeId: theme.id,
    customization: parseCustomization(store.storefront_customization ?? store.storefrontCustomization),
  };
}

export function resolveStoreTheme(store: ThemeSource, preview?: ThemePreview | null, opts: { premiumOk?: boolean } = {}): ResolvedTheme {
  const state = preview && getTheme(preview.themeId) ? preview : storeThemeState(store);
  let theme = getTheme(state.themeId)!;
  if (opts.premiumOk === false && !FREE_THEME_IDS.has(theme.id)) theme = freeThemeFor(theme);
  return mergeTheme(theme, state.customization);
}

/** The free design in the same category (food store → free food theme). */
export function freeThemeFor(theme: StorefrontTheme): StorefrontTheme {
  const free = THEMES.find((t) => FREE_THEME_IDS.has(t.id) && t.category === theme.category);
  return free ?? getTheme(DEFAULT_THEME_ID)!;
}

// ── Live preview (dashboard iframe) ─────────────────────────────────────────
// The theme studio passes an unsaved theme as ?theme_preview=<base64url JSON>.
// Middleware forwards it as the x-theme-preview header; it is validated with
// the same schema as saved data and only changes how the page looks.

export interface ThemePreview {
  themeId: string;
  customization: ThemeCustomization;
}

export function encodeThemePreview(preview: ThemePreview): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ t: preview.themeId, c: preview.customization }));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeThemePreview(raw: string | null | undefined): ThemePreview | null {
  if (!raw || raw.length > 6000) return null;
  try {
    const bin = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
    const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    if (typeof json?.t !== "string" || !getTheme(json.t)) return null;
    return { themeId: json.t, customization: parseCustomization(json.c) };
  } catch {
    return null;
  }
}

// ── CSS output ──────────────────────────────────────────────────────────────

const RADIUS: Record<Radius, { card: string; button: string }> = {
  none: { card: "0px", button: "0px" },
  sm: { card: "6px", button: "4px" },
  md: { card: "10px", button: "8px" },
  lg: { card: "16px", button: "12px" },
  xl: { card: "24px", button: "9999px" },
};

const HEADING: Record<HeadingStyle, { weight: number; tracking: string; transform: string; leading: number }> = {
  bold: { weight: 800, tracking: "-0.03em", transform: "none", leading: 1.04 },
  elegant: { weight: 500, tracking: "-0.015em", transform: "none", leading: 1.08 },
  condensed: { weight: 400, tracking: "0.01em", transform: "uppercase", leading: 0.92 },
};

/** Section spacing, mobile → desktop. */
const DENSITY: Record<Density, [string, string]> = {
  compact: ["2.25rem", "3rem"],
  comfortable: ["3rem", "4.5rem"],
  airy: ["4rem", "6.5rem"],
};

/** Black or white — whichever reads better on the given color. */
export function readableOn(color: string): string {
  return chroma.contrast(color, "#000") >= chroma.contrast(color, "#fff") ? "#000000" : "#ffffff";
}

/** CSS custom properties + theme-wide rules, scoped to `.storefront`. */
export function themeCss(t: ResolvedTheme, selector = ".storefront"): string {
  const { accent, background, backgroundDark } = t.tokens;
  const { accentLight, accentDark } = deriveThemeColors(accent);
  const r = RADIUS[t.tokens.radius];
  const h = HEADING[t.tokens.headingStyle];
  const [gap, gapLg] = DENSITY[t.tokens.density];
  // Accent used as *text* must stay legible on the page background: very
  // light accents (lime, cyan) read fine on dark pages but vanish on white.
  const accentInkLight = chroma.contrast(accent, background) < 3 ? chroma(accent).darken(1.6).hex() : accent;
  const accentInkDark = chroma.contrast(accent, backgroundDark) < 3 ? chroma(accent).brighten(1.6).hex() : accent;
  const s = selector;
  return `
    ${s} {
      --sf-accent: ${accent};
      --sf-accent-light: ${accentLight};
      --sf-accent-dark: ${accentDark};
      --sf-on-accent: ${readableOn(accent)};
      --sf-accent-ink: ${accentInkLight};
      --sf-font: ${FONT_STACKS[t.tokens.bodyFont]};
      --sf-heading-font: ${FONT_STACKS[t.tokens.headingFont]};
      --sf-heading-weight: ${h.weight};
      --sf-heading-tracking: ${h.tracking};
      --sf-heading-transform: ${h.transform};
      --sf-heading-leading: ${h.leading};
      --sf-radius: ${r.card};
      --sf-radius-btn: ${r.button};
      --sf-gap: ${gap};
      --sf-bg: ${background};
      --sf-bg-dark: ${backgroundDark};
      --sf-page: var(--sf-bg);
      background-color: var(--sf-page);
      -webkit-font-smoothing: antialiased;
    }
    @media (min-width: 1024px) { ${s} { --sf-gap: ${gapLg}; } }
    ${s} { --sf-ink: #18181b; }
    .dark ${s}, ${s}.dark { --sf-page: var(--sf-bg-dark); --sf-accent-ink: ${accentInkDark}; --sf-ink: #fafafa; }
    ${s} h1, ${s} h2, ${s} h3, ${s} .sf-display {
      font-family: var(--sf-heading-font);
      font-weight: var(--sf-heading-weight);
      letter-spacing: var(--sf-heading-tracking);
      text-transform: var(--sf-heading-transform);
      line-height: var(--sf-heading-leading);
    }
    ${s} .sf-eyebrow {
      font-family: var(--sf-font);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--sf-accent-ink);
    }
    ${s} .sf-section { padding-top: var(--sf-gap); }
    ${t.layout.nav === "app" ? `@media (max-width: 1023px) { ${s} { --sf-tabbar: calc(64px + env(safe-area-inset-bottom)); padding-bottom: var(--sf-tabbar); } }` : ""}
    @media print { ${s} .sf-header, ${s} .sf-no-print { display: none !important; } ${s} { background: #fff !important; } }
    ${s} .sf-header { background-color: color-mix(in srgb, var(--sf-page) 92%, transparent); }
    ${s} .sf-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
      border-radius: var(--sf-radius-btn);
      font-weight: 700;
      transition: transform .2s ease, opacity .2s ease, background-color .2s ease;
    }
    ${s} .sf-btn:hover { transform: translateY(-1px); }
    ${s} .sf-btn:active { transform: translateY(0) scale(.98); }
    @media (prefers-reduced-motion: no-preference) {
      @keyframes sf-rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
      @keyframes sf-fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes sf-zoom { from { transform: scale(1.08); } to { transform: scale(1); } }
      ${s} .sf-hero-in > * { animation: sf-rise .8s cubic-bezier(.2,.7,.2,1) both; }
      ${s} .sf-hero-in > *:nth-child(2) { animation-delay: .08s; }
      ${s} .sf-hero-in > *:nth-child(3) { animation-delay: .16s; }
      ${s} .sf-hero-in > *:nth-child(4) { animation-delay: .24s; }
      ${s} .sf-hero-zoom { animation: sf-zoom 1.6s cubic-bezier(.2,.7,.2,1) both; }
      @supports (animation-timeline: view()) {
        ${s} .sf-reveal {
          animation: sf-rise linear both;
          animation-timeline: view();
          animation-range: entry 0% entry 40%;
        }
      }
    }
  `;
}

/** Legacy card-style flag still read by a few components. */
export function cardStyleFor(t: ResolvedTheme): "rounded" | "sharp" {
  return t.tokens.radius === "none" || t.tokens.radius === "sm" ? "sharp" : "rounded";
}

/**
 * Drop overrides the theme's tier doesn't allow (enforced on save; settings
 * saved before tiers existed keep rendering as they were).
 */
export function capCustomization(theme: StorefrontTheme, c: ThemeCustomization): ThemeCustomization {
  const caps = TIER_CAPS[theme.tier];
  const tokens = { ...c.tokens };
  const layout = { ...c.layout };
  if (!caps.style) {
    for (const k of ["bodyFont", "headingFont", "headingStyle", "radius"] as const) delete tokens[k];
    delete layout.nav;
    delete layout.sections;
  }
  if (!caps.layout) {
    for (const k of ["background", "backgroundDark", "density"] as const) delete tokens[k];
    for (const k of ["header", "hero", "card", "categories", "footer", "columns"] as const) delete layout[k];
  }
  const out: ThemeCustomization = { ...c };
  if (Object.keys(tokens).length) out.tokens = tokens;
  else delete out.tokens;
  if (Object.keys(layout).length) out.layout = layout;
  else delete out.layout;
  return out;
}

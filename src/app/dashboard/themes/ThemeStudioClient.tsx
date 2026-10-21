"use client";

import { useEffect, useMemo, useState } from "react";
import { FREE_THEME_IDS } from "@/lib/features-shared";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Monitor,
  Plus,
  RotateCcw,
  Trash2,
  Smartphone,
  Sparkles, Lock } from "lucide-react";
import { FONT_KEYS, FONT_LABELS, googleFontsHref } from "@/lib/theme-presets";
import { THEMES, THEME_CATEGORIES, getTheme } from "@/lib/themes/catalog";
import { encodeThemePreview, mergeTheme } from "@/lib/themes/resolve";
import { HIGHLIGHT_ICONS, SECTION_IDS } from "@/lib/themes/types";
import type {
  Highlight,
  ThemeCategory,
  ThemeCopy,
  ThemeCustomization,
  ThemeLayout,
  ThemeTokens,
  SectionId,
} from "@/lib/themes/types";
import ThemeThumbnail from "./ThemeThumbnail";

interface Props {
  storeSlug: string;
  storeName: string;
  storeUrl: string;
  savedThemeId: string;
  savedCustomization: ThemeCustomization;
  /** Plan includes premium themes; free themes are always available */
  premiumUnlocked?: boolean;
}

const ACCENT_SWATCHES = ["#f59e0b", "#ef4444", "#f97316", "#ec4899", "#e11d48", "#8b5cf6", "#2563eb", "#0ea5e9", "#10b981", "#0d9488", "#a3e635", "#18181b"];

const SECTION_LABELS: Record<SectionId, string> = {
  hero: "Hero banner",
  highlights: "Highlights bar",
  promo: "Promo banner",
  testimonials: "Customer reviews",
  ctaBand: "Call-to-action band",
  categories: "Categories",
  perks: "Help strip (track · reels · WhatsApp)",
  featured: "Featured products",
  newArrivals: "New arrivals",
  categoryRails: "Category rows",
  allProducts: "All products grid",
  about: "About & contact",
};

const HERO_OPTIONS: { value: ThemeLayout["hero"]; label: string }[] = [
  { value: "split", label: "Split" },
  { value: "banner", label: "Wide banner" },
  { value: "fullbleed", label: "Full-bleed photo" },
  { value: "centered", label: "Centered" },
  { value: "minimal", label: "Minimal text" },
];
const CARD_OPTIONS: { value: ThemeLayout["card"]; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "minimal", label: "Minimal" },
  { value: "editorial", label: "Editorial (tall)" },
  { value: "menu", label: "Menu row" },
  { value: "service", label: "Service" },
];
const CATEGORY_OPTIONS: { value: ThemeLayout["categories"]; label: string }[] = [
  { value: "tiles", label: "Tiles" },
  { value: "circles", label: "Circles" },
  { value: "pills", label: "Pills" },
  { value: "cards", label: "Photo cards" },
];
const RADIUS_OPTIONS: { value: ThemeTokens["radius"]; label: string }[] = [
  { value: "none", label: "Square" },
  { value: "sm", label: "Slight" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Round" },
  { value: "xl", label: "Pill" },
];
const MODE_OPTIONS: { value: ThemeTokens["mode"]; label: string }[] = [
  { value: "auto", label: "Visitor's choice" },
  { value: "light", label: "Always light" },
  { value: "dark", label: "Always dark" },
];

const HEADER_OPTIONS: { value: ThemeLayout["header"]; label: string }[] = [
  { value: "standard", label: "Search bar" },
  { value: "centered", label: "Centred logo" },
  { value: "minimal", label: "Slim row" },
];
const FOOTER_OPTIONS: { value: ThemeLayout["footer"]; label: string }[] = [
  { value: "standard", label: "Columns" },
  { value: "bold", label: "Bold dark" },
  { value: "minimal", label: "One line" },
];
const HEADING_OPTIONS: { value: ThemeTokens["headingStyle"]; label: string }[] = [
  { value: "bold", label: "Bold" },
  { value: "elegant", label: "Elegant" },
  { value: "condensed", label: "Condensed caps" },
];
const DENSITY_OPTIONS: { value: ThemeTokens["density"]; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "airy", label: "Airy" },
];

const COPY_GROUPS: { title: string; fields: Exclude<keyof ThemeCopy, "highlights">[] }[] = [
  { title: "Hero", fields: ["announcement", "heroEyebrow", "heroTitle", "heroSubtitle", "heroCta"] },
  { title: "Buttons & section titles", fields: ["addToCart", "categoriesTitle", "featuredTitle", "newArrivalsTitle", "allProductsTitle", "testimonialsTitle"] },
  { title: "Promo banner", fields: ["promoEyebrow", "promoTitle", "promoText", "promoCta"] },
  { title: "Call-to-action band", fields: ["ctaTitle", "ctaText"] },
];

const COPY_FIELDS: { key: Exclude<keyof ThemeCopy, "highlights">; label: string; placeholder?: string; max: number }[] = [
  { key: "announcement", label: "Announcement bar", placeholder: "e.g. Free delivery on orders over ₦20,000", max: 120 },
  { key: "heroTitle", label: "Hero headline", max: 80 },
  { key: "heroSubtitle", label: "Hero subtitle", max: 200 },
  { key: "heroCta", label: "Hero button", max: 30 },
  { key: "addToCart", label: "Add-to-cart button", max: 20 },
  { key: "categoriesTitle", label: "Categories title", max: 40 },
  { key: "featuredTitle", label: "Featured title", max: 40 },
  { key: "newArrivalsTitle", label: "New arrivals title", max: 40 },
  { key: "allProductsTitle", label: "All products title", max: 40 },
  { key: "heroEyebrow", label: "Small label above headline", max: 40 },
  { key: "testimonialsTitle", label: "Reviews title", max: 40 },
  { key: "promoEyebrow", label: "Label", max: 40 },
  { key: "promoTitle", label: "Headline", max: 80 },
  { key: "promoText", label: "Text", max: 200 },
  { key: "promoCta", label: "Button", max: 30 },
  { key: "ctaTitle", label: "Headline", max: 80 },
  { key: "ctaText", label: "Text", max: 200 },
];

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/* ───────────────────────────── Small controls ───────────────────────────── */

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
      <h3 className="text-sm font-bold text-surface-900 dark:text-white">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-surface-500 dark:text-surface-400">{label}</p>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            value === o.value
              ? "border-surface-900 bg-surface-900 text-white dark:border-white dark:bg-white dark:text-black"
              : "border-surface-200 text-surface-600 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-10 cursor-pointer rounded-lg border border-surface-200 dark:border-surface-700"
      />
      <input
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value.toLowerCase());
        }}
        className="w-28 rounded-lg border border-surface-200 bg-transparent px-2.5 py-2 font-mono text-xs text-surface-900 focus:outline-none focus:ring-2 focus:ring-accent-400 dark:border-surface-700 dark:text-white"
      />
    </div>
  );
}

const ICON_LABELS: Record<Highlight["icon"], string> = {
  truck: "Delivery",
  clock: "Time",
  shield: "Secure",
  star: "Star",
  leaf: "Fresh",
  sparkles: "Quality",
  phone: "Support",
  refresh: "Returns",
  gift: "Gift",
  scissors: "Styling",
  calendar: "Booking",
  award: "Award",
  flame: "Hot",
  heart: "Care",
};

function HighlightsEditor({ value, onChange }: { value: Highlight[]; onChange: (v: Highlight[]) => void }) {
  const update = (i: number, patch: Partial<Highlight>) => onChange(value.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  const inputCls =
    "w-full rounded-lg border border-surface-200 bg-transparent px-2.5 py-1.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-accent-400 dark:border-surface-700 dark:text-white";
  return (
    <div className="space-y-2">
      {value.map((h, i) => (
        <div key={i} className="space-y-1.5 rounded-lg border border-surface-200 p-2.5 dark:border-surface-700">
          <div className="flex gap-1.5">
            <select value={h.icon} onChange={(e) => update(i, { icon: e.target.value as Highlight["icon"] })} className={`${selectCls} !w-28 !py-1.5`}>
              {HIGHLIGHT_ICONS.map((ic) => (
                <option key={ic} value={ic}>{ICON_LABELS[ic]}</option>
              ))}
            </select>
            <input value={h.title} maxLength={40} placeholder="Title" onChange={(e) => update(i, { title: e.target.value })} className={inputCls} />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove highlight" className="shrink-0 rounded p-1.5 text-surface-400 hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <input value={h.text} maxLength={80} placeholder="Short description" onChange={(e) => update(i, { text: e.target.value })} className={inputCls} />
        </div>
      ))}
      {value.length < 4 && (
        <button
          type="button"
          onClick={() => onChange([...value, { icon: "star", title: "", text: "" }])}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-surface-300 py-2 text-xs font-semibold text-surface-500 hover:text-surface-900 dark:border-surface-600 dark:hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" /> Add highlight
        </button>
      )}
    </div>
  );
}

const selectCls =
  "w-full rounded-lg border border-surface-200 bg-transparent px-2.5 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-accent-400 dark:border-surface-700 dark:bg-surface-900 dark:text-white";

/* ───────────────────────────── Studio ───────────────────────────── */

export default function ThemeStudioClient({ storeSlug, storeName, storeUrl, savedThemeId, savedCustomization, premiumUnlocked = true }: Props) {
  const isLocked = (id: string) => !premiumUnlocked && !FREE_THEME_IDS.has(id);
  const [saved, setSaved] = useState({ themeId: savedThemeId, customization: savedCustomization });
  const [themeId, setThemeId] = useState(savedThemeId);
  const [custom, setCustom] = useState<ThemeCustomization>(savedCustomization);
  const [view, setView] = useState<"gallery" | "customize">("gallery");
  const [filter, setFilter] = useState<ThemeCategory | "all">("all");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  // Preview against the merchant's own products, or the theme's sample store
  // (handy before a store has products/banners, or to see a theme at its best).
  const [content, setContent] = useState<"store" | "demo">("store");
  const [saving, setSaving] = useState(false);
  const [previewSrc, setPreviewSrc] = useState("");

  const theme = getTheme(themeId)!;
  const resolved = useMemo(() => mergeTheme(theme, custom), [theme, custom]);
  const dirty = themeId !== saved.themeId || !same(custom, saved.customization);
  const liveTheme = getTheme(saved.themeId)!;

  // Debounced live preview — rebuilds the iframe URL after edits settle.
  useEffect(() => {
    if (view !== "customize") return;
    const id = setTimeout(() => {
      const preview = encodeThemePreview({ themeId, customization: custom });
      const base = content === "demo" ? `/theme-demo/${themeId}` : `/store/${storeSlug}`;
      setPreviewSrc(`${base}?theme_preview=${preview}`);
    }, 450);
    return () => clearTimeout(id);
  }, [themeId, custom, storeSlug, view, content]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Writes an override, or removes it when it matches the theme default, so
  // "Reset" and future theme updates behave predictably.
  function setGroup<G extends "tokens" | "layout" | "copy">(group: G, key: string, value: unknown) {
    setCustom((prev) => {
      const groupObj: Record<string, unknown> = { ...(prev[group] ?? {}) };
      const defaults = theme[group] as unknown as Record<string, unknown>;
      if (same(defaults[key], value)) delete groupObj[key];
      else groupObj[key] = value;
      const next = { ...prev, [group]: groupObj };
      if (!Object.keys(groupObj).length) delete next[group];
      return next;
    });
  }
  const setToken = <K extends keyof ThemeTokens>(k: K, v: ThemeTokens[K]) => setGroup("tokens", k, v);
  const setLayout = <K extends keyof ThemeLayout>(k: K, v: ThemeLayout[K]) => setGroup("layout", k, v);
  const setCopy = (k: keyof ThemeCopy, v: ThemeCopy[keyof ThemeCopy]) => setGroup("copy", k, v);

  /** Switching themes keeps only theme-independent text (the announcement). */
  function carryOver(c: ThemeCustomization): ThemeCustomization {
    return c.copy?.announcement ? { copy: { announcement: c.copy.announcement } } : {};
  }

  function openCustomizer(id: string) {
    if (id !== themeId) {
      setThemeId(id);
      setCustom(id === saved.themeId ? saved.customization : carryOver(custom));
    }
    setView("customize");
    window.scrollTo({ top: 0 });
  }

  async function save(nextThemeId = themeId, nextCustom = custom) {
    setSaving(true);
    try {
      const res = await fetch("/api/stores/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: nextThemeId, customization: nextCustom }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save theme");
      setSaved({ themeId: data.themeId, customization: data.customization });
      setThemeId(data.themeId);
      setCustom(data.customization);
      toast.success(`${getTheme(data.themeId)?.name ?? "Theme"} is now live`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  function applyFromGallery(id: string) {
    const nextCustom = id === saved.themeId ? saved.customization : carryOver(saved.customization);
    setThemeId(id);
    setCustom(nextCustom);
    save(id, nextCustom);
  }

  // Sections: visible ones in order, then hidden ones.
  const visibleSections = resolved.layout.sections;
  const hiddenSections = SECTION_IDS.filter((s) => !visibleSections.includes(s));

  function moveSection(id: SectionId, dir: -1 | 1) {
    const list = [...visibleSections];
    const i = list.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setLayout("sections", list);
  }
  function toggleSection(id: SectionId) {
    setLayout(
      "sections",
      visibleSections.includes(id) ? visibleSections.filter((s) => s !== id) : [...visibleSections, id],
    );
  }

  const isListCard = resolved.layout.card === "menu" || resolved.layout.card === "service";
  const shownThemes = THEMES.filter((t) => filter === "all" || t.category === filter);
  const categoryLabel = (c: ThemeCategory) => THEME_CATEGORIES.find((x) => x.id === c)?.label ?? c;

  return (
    <div className="space-y-6">
      {/* Every theme font, so gallery thumbnails and pickers render true to life */}
      <link rel="stylesheet" href={googleFontsHref([...FONT_KEYS])} />

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Themes</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Pick a design for {storeName}, then customise colours, fonts, layout and wording.
          </p>
        </div>
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-fit items-center gap-2 rounded-xl border border-surface-200 px-4 py-2 text-sm font-semibold text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
        >
          <ExternalLink className="h-4 w-4" /> View live store
        </a>
      </div>

      {view === "gallery" ? (
        <>
          {/* ── Live theme ─────────────────────────────────── */}
          <div className="flex flex-col gap-4 rounded-2xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900 sm:flex-row sm:items-center">
            <div className="w-full overflow-hidden rounded-xl border border-surface-100 dark:border-surface-800 sm:w-44">
              <ThemeThumbnail theme={mergeTheme(liveTheme, saved.customization)} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Live now</p>
              <p className="text-lg font-bold text-surface-900 dark:text-white">{liveTheme.name}</p>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                {categoryLabel(liveTheme.category)}
                {Object.keys(saved.customization).length > 0 && " · customised"}
              </p>
            </div>
            <button
              onClick={() => openCustomizer(saved.themeId)}
              className="flex items-center justify-center gap-2 rounded-xl bg-accent-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-accent-500"
            >
              <Sparkles className="h-4 w-4" /> Customise
            </button>
          </div>

          {/* ── Category tabs ──────────────────────────────── */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {[{ id: "all" as const, label: "All", limit: THEMES.length }, ...THEME_CATEGORIES].map((c) => (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  filter === c.id
                    ? "bg-surface-900 text-white dark:bg-white dark:text-black"
                    : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
                }`}
              >
                {c.label} <span className="opacity-60">{THEMES.filter((t) => c.id === "all" || t.category === c.id).length}</span>
              </button>
            ))}
          </div>

          {/* ── Gallery ────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shownThemes.map((t) => {
              const isLive = t.id === saved.themeId;
              return (
                <div
                  key={t.id}
                  className={`flex flex-col overflow-hidden rounded-2xl border bg-white dark:bg-surface-900 ${
                    isLive ? "border-emerald-400 ring-2 ring-emerald-400/30" : "border-surface-100 dark:border-surface-800"
                  }`}
                >
                  <button onClick={() => openCustomizer(t.id)} className="block text-left" aria-label={`Preview ${t.name}`}>
                    <ThemeThumbnail theme={mergeTheme(t, isLive ? saved.customization : {})} />
                  </button>
                  <div className="flex flex-1 flex-col gap-1 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-surface-900 dark:text-white">{t.name}</p>
                      {isLive ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <Check className="h-3 w-3" /> Live
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface-100 px-2 py-0.5 text-[11px] font-semibold text-surface-500 dark:bg-surface-800 dark:text-surface-400">
                          {categoryLabel(t.category)}
                        </span>
                      )}
                    </div>
                    <p className="flex-1 text-xs text-surface-500 dark:text-surface-400">{t.tagline}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => openCustomizer(t.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-surface-200 px-3 py-2 text-xs font-semibold text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
                      >
                        <Eye className="h-3.5 w-3.5" /> Customise
                      </button>
                      <a
                        href={`/theme-demo/${t.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 rounded-xl border border-surface-200 px-3 py-2 text-xs font-semibold text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
                      >
                        Demo <ExternalLink className="h-3 w-3" />
                      </a>
                      {!isLive && isLocked(t.id) && (
                        <a
                          href="/dashboard/billing"
                          className="flex items-center gap-1 rounded-xl bg-surface-900 px-3 py-2 text-xs font-bold text-white hover:bg-surface-800 dark:bg-white dark:text-black"
                          title="Premium theme — upgrade to apply it"
                        >
                          <Lock className="h-3 w-3" /> Pro
                        </a>
                      )}
                      {!isLive && !isLocked(t.id) && (
                        <button
                          onClick={() => applyFromGallery(t.id)}
                          disabled={saving}
                          className="rounded-xl bg-accent-400 px-4 py-2 text-xs font-bold text-black hover:bg-accent-500 disabled:opacity-60"
                        >
                          Apply
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ── Customiser ──────────────────────────────────────── */
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setView("gallery")}
                className="flex items-center gap-1.5 text-sm font-semibold text-surface-600 hover:text-surface-900 dark:text-surface-300 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" /> All themes
              </button>
              <span className="text-xs text-surface-400">
                {theme.name} · {categoryLabel(theme.category)}
              </span>
            </div>

            <Panel title="Colours">
              <Field label="Accent (buttons, badges, highlights)">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {ACCENT_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setToken("accent", c)}
                      title={c}
                      className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                        resolved.tokens.accent.toLowerCase() === c ? "border-surface-900 dark:border-white" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <ColorInput value={resolved.tokens.accent} onChange={(v) => setToken("accent", v)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Background (light)">
                  <ColorInput value={resolved.tokens.background} onChange={(v) => setToken("background", v)} />
                </Field>
                <Field label="Background (dark)">
                  <ColorInput value={resolved.tokens.backgroundDark} onChange={(v) => setToken("backgroundDark", v)} />
                </Field>
              </div>
              <Field label="Light / dark">
                <Segmented value={resolved.tokens.mode} options={MODE_OPTIONS} onChange={(v) => setToken("mode", v)} />
              </Field>
            </Panel>

            <Panel title="Typography & shape">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Headings">
                  <select value={resolved.tokens.headingFont} onChange={(e) => setToken("headingFont", e.target.value as ThemeTokens["headingFont"])} className={selectCls}>
                    {FONT_KEYS.map((f) => (
                      <option key={f} value={f}>{FONT_LABELS[f]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Body text">
                  <select value={resolved.tokens.bodyFont} onChange={(e) => setToken("bodyFont", e.target.value as ThemeTokens["bodyFont"])} className={selectCls}>
                    {FONT_KEYS.map((f) => (
                      <option key={f} value={f}>{FONT_LABELS[f]}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Heading style">
                <Segmented value={resolved.tokens.headingStyle} options={HEADING_OPTIONS} onChange={(v) => setToken("headingStyle", v)} />
              </Field>
              <Field label="Corners">
                <Segmented value={resolved.tokens.radius} options={RADIUS_OPTIONS} onChange={(v) => setToken("radius", v)} />
              </Field>
              <Field label="Spacing between sections">
                <Segmented value={resolved.tokens.density} options={DENSITY_OPTIONS} onChange={(v) => setToken("density", v)} />
              </Field>
            </Panel>

            <Panel title="Layout">
              <Field label="Header">
                <Segmented value={resolved.layout.header} options={HEADER_OPTIONS} onChange={(v) => setLayout("header", v)} />
              </Field>
              <Field label="Hero style">
                <Segmented value={resolved.layout.hero} options={HERO_OPTIONS} onChange={(v) => setLayout("hero", v)} />
              </Field>
              <Field label="Product cards">
                <Segmented value={resolved.layout.card} options={CARD_OPTIONS} onChange={(v) => setLayout("card", v)} />
              </Field>
              <Field label="Categories">
                <Segmented value={resolved.layout.categories} options={CATEGORY_OPTIONS} onChange={(v) => setLayout("categories", v)} />
              </Field>
              <Field label={isListCard ? "Products per row (list cards always use 1–2)" : "Products per row (desktop)"}>
                <Segmented
                  value={resolved.layout.columns}
                  options={[2, 3, 4, 5].map((n) => ({ value: n as ThemeLayout["columns"], label: String(n) }))}
                  onChange={(v) => setLayout("columns", v)}
                  disabled={isListCard}
                />
              </Field>
              <Field label="Footer">
                <Segmented value={resolved.layout.footer} options={FOOTER_OPTIONS} onChange={(v) => setLayout("footer", v)} />
              </Field>
            </Panel>

            <Panel title="Homepage sections">
              <p className="-mt-1 text-xs text-surface-400">Reorder with the arrows, hide anything you don&apos;t need.</p>
              <ul className="space-y-1.5">
                {visibleSections.map((id, i) => (
                  <li key={id} className="flex items-center gap-2 rounded-lg border border-surface-200 px-2.5 py-2 dark:border-surface-700">
                    <span className="flex-1 text-sm text-surface-800 dark:text-surface-100">{SECTION_LABELS[id]}</span>
                    <button type="button" onClick={() => moveSection(id, -1)} disabled={i === 0} aria-label="Move up" className="rounded p-1 text-surface-400 hover:text-surface-900 disabled:opacity-30 dark:hover:text-white">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => moveSection(id, 1)} disabled={i === visibleSections.length - 1} aria-label="Move down" className="rounded p-1 text-surface-400 hover:text-surface-900 disabled:opacity-30 dark:hover:text-white">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => toggleSection(id)} aria-label="Hide section" className="rounded p-1 text-surface-400 hover:text-red-500">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
                {hiddenSections.map((id) => (
                  <li key={id} className="flex items-center gap-2 rounded-lg border border-dashed border-surface-200 px-2.5 py-2 dark:border-surface-700">
                    <span className="flex-1 text-sm text-surface-400 line-through">{SECTION_LABELS[id]}</span>
                    <button type="button" onClick={() => toggleSection(id)} aria-label="Show section" className="rounded p-1 text-surface-400 hover:text-emerald-500">
                      <EyeOff className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Highlights bar">
              <p className="-mt-1 text-xs text-surface-400">2–4 short selling points, e.g. delivery time or return policy.</p>
              <HighlightsEditor value={resolved.copy.highlights} onChange={(v) => setCopy("highlights", v)} />
            </Panel>

            {COPY_GROUPS.map((group) => (
              <Panel key={group.title} title={group.title}>
                {group.fields.map((key) => {
                  const f = COPY_FIELDS.find((x) => x.key === key)!;
                  return (
                    <Field key={key} label={f.label}>
                      <input
                        value={resolved.copy[key]}
                        maxLength={f.max}
                        placeholder={
                          f.placeholder ?? (key === "heroTitle" ? storeName : key === "heroSubtitle" ? "Uses your store description" : "Leave empty to hide")
                        }
                        onChange={(e) => setCopy(key, e.target.value)}
                        className="w-full rounded-lg border border-surface-200 bg-transparent px-2.5 py-2 text-sm text-surface-900 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-accent-400 dark:border-surface-700 dark:text-white dark:placeholder:text-surface-600"
                      />
                    </Field>
                  );
                })}
              </Panel>
            ))}

            {/* Actions */}
            <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-surface-100 bg-surface-50/95 py-3 backdrop-blur dark:border-surface-800 dark:bg-surface-950/95">
              <button
                type="button"
                onClick={() => setCustom(carryOver(custom))}
                disabled={!Object.keys(custom).length}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-surface-500 hover:text-surface-900 disabled:opacity-40 dark:hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Theme defaults
              </button>
              {dirty && (
                <button
                  type="button"
                  onClick={() => {
                    setThemeId(saved.themeId);
                    setCustom(saved.customization);
                  }}
                  className="rounded-xl border border-surface-200 px-3 py-2.5 text-xs font-semibold text-surface-600 hover:bg-white dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
                >
                  Discard
                </button>
              )}
              {isLocked(themeId) ? (
              <a
                href="/dashboard/billing"
                className="ml-auto flex items-center gap-2 rounded-xl bg-surface-900 px-5 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-black"
              >
                <Lock className="h-4 w-4" /> Upgrade to apply {theme.name}
              </a>
              ) : (
              <button
                type="button"
                onClick={() => save()}
                disabled={saving || !dirty}
                className="ml-auto flex items-center gap-2 rounded-xl bg-accent-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-accent-500 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? "Publishing…" : themeId === saved.themeId ? "Save & publish" : `Apply ${theme.name}`}
              </button>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
            <div className="flex items-center justify-between gap-2">
              <div className="flex rounded-xl border border-surface-200 p-0.5 dark:border-surface-700">
                {(["desktop", "mobile"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDevice(d)}
                    aria-label={`${d} preview`}
                    className={`rounded-lg px-3 py-1.5 ${device === d ? "bg-surface-900 text-white dark:bg-white dark:text-black" : "text-surface-500"}`}
                  >
                    {d === "desktop" ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                  </button>
                ))}
              </div>
              <div className="flex rounded-xl border border-surface-200 p-0.5 text-xs font-semibold dark:border-surface-700">
                {(["store", "demo"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setContent(c)}
                    className={`rounded-lg px-3 py-1.5 ${content === c ? "bg-surface-900 text-white dark:bg-white dark:text-black" : "text-surface-500"}`}
                  >
                    {c === "store" ? "My products" : "Demo content"}
                  </button>
                ))}
              </div>
              <span className="hidden text-xs text-surface-400 xl:inline">{dirty ? "Unsaved — only you can see this" : "Matches your live store"}</span>
              {previewSrc && (
                <a href={previewSrc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold text-surface-500 hover:text-surface-900 dark:hover:text-white">
                  Open <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            <div className="flex justify-center overflow-hidden rounded-2xl border border-surface-200 bg-surface-100 dark:border-surface-800 dark:bg-surface-900">
              {previewSrc ? (
                <iframe
                  key={previewSrc}
                  src={previewSrc}
                  title="Store preview"
                  className="h-[70vh] border-0 bg-white transition-[width] duration-300 lg:h-[calc(100vh-11rem)]"
                  style={{ width: device === "mobile" ? 390 : "100%" }}
                />
              ) : (
                <div className="grid h-[70vh] place-items-center text-surface-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

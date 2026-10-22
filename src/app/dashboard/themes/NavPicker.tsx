"use client";

// Navigation bar picker for the theme studio: ten drawn previews to choose
// from, plus five plain switches. No jargon — what you tap is what you get.
import { Check, Lock } from "lucide-react";
import { NAV_STYLES, type NavOptions, type NavStyle } from "@/lib/themes/types";

export const NAV_LABELS: Record<NavStyle, { name: string; hint: string }> = {
  classic: { name: "Classic", hint: "Logo, links, cart" },
  boutique: { name: "Boutique", hint: "Centred logo" },
  marketplace: { name: "Marketplace", hint: "Big search bar" },
  floating: { name: "Floating", hint: "Rounded pill" },
  mega: { name: "Mega menu", hint: "Categories with photos" },
  drawer: { name: "Full-screen", hint: "Editorial menu" },
  app: { name: "App-style", hint: "Bottom tabs on phones" },
  overlay: { name: "See-through", hint: "Over your hero photo" },
  twotier: { name: "Two-tier", hint: "Contact row on top" },
  chips: { name: "Category chips", hint: "Swipeable categories" },
};

/** A tiny drawing of each bar (accent = the theme colour). */
function Sketch({ style, accent }: { style: NavStyle; accent: string }) {
  const line = "h-1 rounded-full bg-surface-300 dark:bg-surface-600";
  const dot = "h-2 w-2 rounded-full bg-surface-400 dark:bg-surface-500";
  const logo = <span className="h-2 w-6 rounded-sm bg-surface-800 dark:bg-surface-200" />;
  switch (style) {
    case "classic":
      return (
        <div className="flex h-full items-center gap-1.5 px-2">
          {logo}
          <span className={`${line} w-4`} />
          <span className={`${line} w-4`} />
          <span className={`${line} w-4`} />
          <span className="ml-auto flex gap-1"><span className={dot} /><span className={dot} /></span>
        </div>
      );
    case "boutique":
      return (
        <div className="grid h-full grid-cols-3 items-center px-2">
          <span className="flex gap-1"><span className={`${line} w-3`} /><span className={`${line} w-3`} /></span>
          <span className="justify-self-center">{logo}</span>
          <span className="flex justify-end gap-1"><span className={dot} /><span className={dot} /></span>
        </div>
      );
    case "marketplace":
      return (
        <div className="flex h-full flex-col justify-center gap-1 px-2">
          <div className="flex items-center gap-1.5">
            {logo}
            <span className="h-2.5 flex-1 rounded border border-surface-300 dark:border-surface-600" />
            <span className={dot} />
          </div>
          <div className="flex gap-1">
            <span className="h-1.5 w-5 rounded-sm" style={{ background: accent }} />
            <span className={`${line} w-3`} /><span className={`${line} w-3`} /><span className={`${line} w-3`} />
          </div>
        </div>
      );
    case "floating":
      return (
        <div className="flex h-full items-center px-1.5">
          <div className="flex h-4 w-full items-center gap-1 rounded-full border border-surface-300 bg-white px-1.5 shadow-sm dark:border-surface-600 dark:bg-surface-800">
            {logo}
            <span className={`${line} mx-auto w-8`} />
            <span className={dot} />
          </div>
        </div>
      );
    case "mega":
      return (
        <div className="flex h-full flex-col">
          <div className="flex h-3 items-center gap-1.5 px-2 pt-1">{logo}<span className={`${line} w-4`} /></div>
          <div className="mx-1 mt-1 grid flex-1 grid-cols-4 gap-1 rounded-sm bg-surface-100 p-1 dark:bg-surface-800">
            <span className={`${line} w-full`} /><span className={`${line} w-full`} /><span className={`${line} w-full`} />
            <span className="row-span-2 rounded-sm" style={{ background: accent }} />
          </div>
        </div>
      );
    case "drawer":
      return (
        <div className="relative h-full">
          <div className="grid h-full grid-cols-3 items-center px-2">
            <span className="flex flex-col gap-0.5"><span className="h-px w-3 bg-surface-700 dark:bg-surface-300" /><span className="h-px w-2 bg-surface-700 dark:bg-surface-300" /></span>
            <span className="justify-self-center">{logo}</span>
            <span className={`${dot} justify-self-end`} />
          </div>
        </div>
      );
    case "app":
      return (
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-center gap-1 px-2 pt-1">{logo}<span className={`${dot} ml-auto`} /></div>
          <div className="flex justify-around border-t border-surface-200 py-0.5 dark:border-surface-700">
            {[0, 1, 2, 3].map((i) => <span key={i} className={dot} style={i === 0 ? { background: accent } : undefined} />)}
          </div>
        </div>
      );
    case "overlay":
      return (
        <div className="relative h-full overflow-hidden rounded-sm bg-gradient-to-br from-surface-500 to-surface-800">
          <div className="flex items-center gap-1.5 px-2 pt-1">
            <span className="h-2 w-6 rounded-sm bg-white" />
            <span className="ml-auto h-1 w-4 rounded-full bg-white/70" />
          </div>
        </div>
      );
    case "twotier":
      return (
        <div className="flex h-full flex-col">
          <div className="flex h-2 items-center gap-1 bg-surface-800 px-2"><span className="h-0.5 w-6 bg-white/60" /></div>
          <div className="flex flex-1 items-center gap-1.5 px-2">
            {logo}
            <span className="ml-auto h-2.5 w-10 rounded border border-surface-300 dark:border-surface-600" />
            <span className={dot} />
          </div>
        </div>
      );
    case "chips":
      return (
        <div className="flex h-full flex-col justify-center gap-1 px-2">
          <div className="flex items-center">{logo}<span className={`${dot} ml-auto`} /></div>
          <div className="flex gap-1">
            <span className="h-2 w-4 rounded-full" style={{ background: accent }} />
            <span className="h-2 w-4 rounded-full border border-surface-300 dark:border-surface-600" />
            <span className="h-2 w-4 rounded-full border border-surface-300 dark:border-surface-600" />
          </div>
        </div>
      );
  }
}

export function NavStylePicker({ value, accent, locked, onChange }: { value: NavStyle; accent: string; locked: boolean; onChange: (v: NavStyle) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {NAV_STYLES.map((s) => {
        const active = s === value;
        return (
          <button
            key={s}
            type="button"
            disabled={locked && !active}
            onClick={() => onChange(s)}
            className={`group rounded-xl border p-1.5 text-left transition ${
              active ? "border-accent-500 ring-2 ring-accent-400/40" : "border-surface-200 hover:border-surface-300 dark:border-surface-700"
            } disabled:cursor-not-allowed disabled:opacity-40`}
            aria-pressed={active}
          >
            <div className="h-12 overflow-hidden rounded-lg bg-surface-50 dark:bg-surface-900">
              <Sketch style={s} accent={accent} />
            </div>
            <div className="mt-1.5 flex items-center gap-1 px-0.5">
              <span className="text-xs font-semibold text-surface-900 dark:text-white">{NAV_LABELS[s].name}</span>
              {active && <Check className="ml-auto h-3.5 w-3.5 text-accent-600" />}
              {locked && !active && <Lock className="ml-auto h-3 w-3 text-surface-400" />}
            </div>
            <p className="px-0.5 text-[10px] leading-tight text-surface-400">{NAV_LABELS[s].hint}</p>
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
      <span className="text-sm text-surface-700 dark:text-surface-200">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-accent-500" : "bg-surface-300 dark:bg-surface-600"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

function Pills<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
            value === o.value ? "bg-white text-surface-900 shadow-sm dark:bg-surface-950 dark:text-white" : "text-surface-500"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function NavOptionsEditor({ value, onChange }: { value: NavOptions; onChange: <K extends keyof NavOptions>(k: K, v: NavOptions[K]) => void }) {
  return (
    <div className="space-y-3">
      <Toggle label="Stays at the top when scrolling" checked={value.sticky} onChange={(v) => onChange("sticky", v)} />
      <Toggle label="Show categories in the bar" checked={value.categories} onChange={(v) => onChange("categories", v)} />
      <div>
        <p className="mb-1.5 text-xs font-semibold text-surface-500">Search</p>
        <Pills value={value.search} onChange={(v) => onChange("search", v)} options={[{ value: "bar", label: "Search bar" }, { value: "icon", label: "Icon" }, { value: "hidden", label: "Off" }]} />
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-surface-500">Logo size</p>
        <Pills value={value.logoSize} onChange={(v) => onChange("logoSize", v)} options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]} />
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-surface-500">Bar colour</p>
        <Pills value={value.tone} onChange={(v) => onChange("tone", v)} options={[{ value: "page", label: "Page" }, { value: "accent", label: "Brand colour" }, { value: "dark", label: "Dark" }]} />
      </div>
    </div>
  );
}

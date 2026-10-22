"use client";

// Product editor: highlights, a spec table and (for perfume) scent notes.
// Themes show these as bullet lists, spec tables, comparison chips and a
// note pyramid. The server re-validates (lib/product-details).
import { useState } from "react";
import { ListChecks, Plus, Trash2 } from "lucide-react";
import type { ProductDetails } from "@/lib/product-details";

const input =
  "w-full px-2.5 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-400";

const SPEC_TEMPLATES: { label: string; fields: string[] }[] = [
  { label: "Gadget", fields: ["Storage", "RAM", "Screen", "Battery", "Camera", "Warranty"] },
  { label: "Hair", fields: ["Length", "Texture", "Density", "Lace", "Hair type"] },
  { label: "Perfume", fields: ["Concentration", "Size", "Longevity", "Best for"] },
  { label: "Food", fields: ["Serves", "Spice level", "Contains", "Prep time"] },
  { label: "Furniture", fields: ["Dimensions", "Material", "Colour", "Assembly"] },
  { label: "Clothing", fields: ["Material", "Fit", "Care"] },
];

export type DetailsDraft = { specs: { label: string; value: string }[]; top: string; heart: string; base: string; highlights: string };

export const toDraft = (d: ProductDetails | null): DetailsDraft => ({
  specs: d?.specs?.map((s) => ({ ...s })) ?? [],
  top: d?.notes?.top.join(", ") ?? "",
  heart: d?.notes?.heart.join(", ") ?? "",
  base: d?.notes?.base.join(", ") ?? "",
  highlights: d?.highlights?.join("\n") ?? "",
});

const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

/** What the API receives; empty parts are dropped. */
export function draftToDetails(d: DetailsDraft): ProductDetails | null {
  const out: ProductDetails = {};
  const specs = d.specs.filter((s) => s.label.trim() && s.value.trim()).map((s) => ({ label: s.label.trim(), value: s.value.trim() }));
  if (specs.length) out.specs = specs;
  const notes = { top: split(d.top), heart: split(d.heart), base: split(d.base) };
  if (notes.top.length || notes.heart.length || notes.base.length) out.notes = notes;
  const highlights = d.highlights.split("\n").map((x) => x.trim()).filter(Boolean);
  if (highlights.length) out.highlights = highlights;
  return Object.keys(out).length ? out : null;
}

export default function DetailsEditor({ value, onChange }: { value: ProductDetails | null; onChange: (d: ProductDetails | null) => void }) {
  // Local draft so half-typed lists ("rose, ") aren't normalised mid-typing
  const [d, setD] = useState<DetailsDraft>(() => toDraft(value));
  const [showNotes, setShowNotes] = useState(() => !!value?.notes);
  const update = (patch: Partial<DetailsDraft>) => {
    const next = { ...d, ...patch };
    setD(next);
    onChange(draftToDetails(next));
  };
  const setSpec = (i: number, k: "label" | "value", v: string) => update({ specs: d.specs.map((s, j) => (j === i ? { ...s, [k]: v } : s)) });
  const addTemplate = (fields: string[]) => {
    const have = new Set(d.specs.map((s) => s.label.trim().toLowerCase()));
    update({ specs: [...d.specs.filter((s) => s.label || s.value), ...fields.filter((f) => !have.has(f.toLowerCase())).map((label) => ({ label, value: "" }))].slice(0, 24) });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-surface-700 dark:text-surface-300">
          <ListChecks className="w-3.5 h-3.5 text-surface-400" /> Product details
        </span>
        <span className="text-[11px] text-surface-400">Optional · shown on your product page</span>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-surface-500">Highlights (one per line)</span>
        <textarea
          rows={3}
          value={d.highlights}
          onChange={(e) => update({ highlights: e.target.value })}
          placeholder={"100% human hair\nShips in 24 hours\nFree wig cap"}
          className={`${input} resize-y`}
        />
      </label>

      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold text-surface-500">Specifications</span>
          {SPEC_TEMPLATES.map((t) => (
            <button key={t.label} type="button" onClick={() => addTemplate(t.fields)} className="px-2 py-0.5 rounded-md text-[11px] font-semibold border border-surface-200 dark:border-surface-700 text-surface-500 hover:border-accent-400">
              + {t.label}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          {d.specs.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input value={s.label} onChange={(e) => setSpec(i, "label", e.target.value)} placeholder="e.g. Storage" maxLength={40} className={`${input} w-2/5`} aria-label="Spec name" />
              <input value={s.value} onChange={(e) => setSpec(i, "value", e.target.value)} placeholder="e.g. 256GB" maxLength={120} className={input} aria-label="Spec value" />
              <button type="button" onClick={() => update({ specs: d.specs.filter((_, j) => j !== i) })} className="p-1.5 text-surface-400 hover:text-red-500" aria-label="Remove spec">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {d.specs.length < 24 && (
            <button type="button" onClick={() => update({ specs: [...d.specs, { label: "", value: "" }] })} className="flex items-center gap-1 text-xs font-semibold text-accent-600 dark:text-accent-400">
              <Plus className="w-3.5 h-3.5" /> Add a spec
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-surface-500">
          <input
            type="checkbox"
            checked={showNotes}
            onChange={(e) => {
              setShowNotes(e.target.checked);
              if (!e.target.checked) update({ top: "", heart: "", base: "" });
            }}
          />
          Fragrance notes (perfume)
        </label>
        {showNotes && (
          <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
            {(
              [
                ["top", "Top", "Bergamot, pink pepper"],
                ["heart", "Heart", "Rose, jasmine"],
                ["base", "Base", "Oud, amber, musk"],
              ] as const
            ).map(([k, l, ph]) => (
              <label key={k} className="block">
                <span className="mb-1 block text-[11px] text-surface-400">{l} notes</span>
                <input value={d[k]} onChange={(e) => update({ [k]: e.target.value })} placeholder={ph} className={input} />
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

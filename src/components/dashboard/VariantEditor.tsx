"use client";

// Product options (Size, Colour, …) → every combination as a variant with
// its own stock, optional price override and SKU. Replaces the old
// size-only editor; legacy size-only products open as a single "Size" option.

import { useMemo, useState } from "react";
import { Layers, Plus, Trash2, X } from "lucide-react";
import { CLOTHING_SIZES, SHOE_SIZES } from "@/lib/sizes";
import { MAX_OPTIONS, MAX_VARIANTS, combinations, optionsOf, variantLabel } from "@/lib/variants-shared";
import type { ProductSize } from "@/types";

export interface VariantState {
  optionNames: string[];
  variants: ProductSize[];
}

interface Option {
  name: string;
  values: string[];
}

const NAME_PRESETS = ["Size", "Colour", "Material", "Style"];
const VALUE_PRESETS: Record<string, { label: string; values: string[] }[]> = {
  size: [
    { label: "Clothing", values: CLOTHING_SIZES },
    { label: "Shoes", values: SHOE_SIZES },
  ],
  colour: [{ label: "Common colours", values: ["Black", "White", "Red", "Blue", "Green", "Brown", "Beige", "Pink"] }],
  color: [{ label: "Common colours", values: ["Black", "White", "Red", "Blue", "Green", "Brown", "Beige", "Pink"] }],
};

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400";

/** Rebuild state from what's stored (legacy size-only → one "Size" option). */
export function initialVariantState(optionNames: string[] | null | undefined, sizes: ProductSize[] | undefined): VariantState {
  const rows = sizes ?? [];
  if (!rows.length) return { optionNames: [], variants: [] };
  const names = optionNames?.length ? optionNames : ["Size"];
  return {
    optionNames: names,
    variants: rows.map((s) => ({
      ...s,
      options: optionsOf(optionNames, { label: s.label, options: s.options }),
      stockQuantity: s.stockQuantity ?? s.stock_quantity ?? 0,
      price: s.price ?? null,
      imageUrl: s.imageUrl ?? s.image_url ?? null,
      sku: s.sku ?? null,
    })),
  };
}

/** Payload shape the product APIs expect. */
export function variantPayload(state: VariantState) {
  return {
    optionNames: state.variants.length ? state.optionNames : [],
    sizes: state.variants.map((v) => ({
      label: v.label,
      stockQuantity: v.stockQuantity ?? 0,
      options: v.options ?? {},
      price: v.price === undefined || v.price === null || Number.isNaN(Number(v.price)) ? null : Number(v.price),
      imageUrl: v.imageUrl ?? null,
      sku: v.sku || null,
    })),
  };
}

function optionsFromState(state: VariantState): Option[] {
  return state.optionNames.map((name) => ({
    name,
    values: Array.from(new Set(state.variants.map((v) => v.options?.[name]).filter((x): x is string => !!x))),
  }));
}

export function VariantEditor({
  value,
  onChange,
  basePrice,
}: {
  value: VariantState;
  onChange: (next: VariantState) => void;
  /** Product price, shown as the placeholder for per-variant prices */
  basePrice?: number;
}) {
  const enabled = value.optionNames.length > 0;
  const [options, setOptions] = useState<Option[]>(() => optionsFromState(value));
  const [drafts, setDrafts] = useState<string[]>(() => options.map(() => ""));

  // Regenerate the variant list from the options, keeping stock/price/SKU
  // for combinations that already existed.
  function commit(next: Option[]) {
    setOptions(next);
    const names = next.map((o) => o.name.trim()).filter(Boolean);
    const byLabel = new Map(value.variants.map((v) => [v.label.toLowerCase(), v]));
    const combos = combinations(next.map((o) => ({ name: o.name.trim(), values: o.values })))
      .slice(0, MAX_VARIANTS);
    const variants = combos.map((opts) => {
      const label = variantLabel(names, opts);
      const prev = byLabel.get(label.toLowerCase());
      return {
        label,
        options: opts,
        stockQuantity: prev?.stockQuantity ?? 0,
        price: prev?.price ?? null,
        imageUrl: prev?.imageUrl ?? null,
        sku: prev?.sku ?? null,
      };
    });
    onChange({ optionNames: names, variants });
  }

  function addValue(i: number, raw: string) {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = options.map((o, j) =>
      j === i ? { ...o, values: Array.from(new Set([...o.values, ...parts.filter((p) => !o.values.some((v) => v.toLowerCase() === p.toLowerCase()))])) } : o
    );
    setDrafts((d) => d.map((x, j) => (j === i ? "" : x)));
    commit(next);
  }

  function setVariant(label: string, patch: Partial<ProductSize>) {
    onChange({ ...value, variants: value.variants.map((v) => (v.label === label ? { ...v, ...patch } : v)) });
  }

  const totalStock = useMemo(() => value.variants.reduce((s, v) => s + (v.stockQuantity ?? 0), 0), [value.variants]);
  const unusedNames = NAME_PRESETS.filter((n) => !options.some((o) => o.name.toLowerCase() === n.toLowerCase()));

  return (
    <div>
      <label className="flex items-center gap-3 cursor-pointer mb-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            if (e.target.checked) {
              const start = [{ name: "Size", values: [] }];
              setOptions(start);
              setDrafts([""]);
              onChange({ optionNames: ["Size"], variants: [] });
            } else {
              setOptions([]);
              setDrafts([]);
              onChange({ optionNames: [], variants: [] });
            }
          }}
          className="w-4 h-4 rounded accent-amber-400"
        />
        <span className="text-sm font-medium text-surface-700 dark:text-surface-300 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-surface-400" />
          This product has options like size or colour
        </span>
      </label>

      {enabled && (
        <div className="space-y-4">
          {options.map((opt, i) => {
            const presets = VALUE_PRESETS[opt.name.trim().toLowerCase()] ?? [];
            return (
              <div key={i} className="rounded-xl border border-surface-200 dark:border-surface-700 p-3.5 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    value={opt.name}
                    onChange={(e) => {
                      const next = options.map((o, j) => (j === i ? { ...o, name: e.target.value } : o));
                      setOptions(next);
                    }}
                    onBlur={() => commit(options)}
                    maxLength={30}
                    placeholder="Option name, e.g. Colour"
                    className={`${inputCls} font-semibold`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = options.filter((_, j) => j !== i);
                      setDrafts((d) => d.filter((_, j) => j !== i));
                      if (!next.length) {
                        setOptions([]);
                        onChange({ optionNames: [], variants: [] });
                      } else commit(next);
                    }}
                    aria-label={`Remove ${opt.name || "option"}`}
                    className="p-2 rounded-lg text-surface-400 hover:text-red-500 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {opt.values.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {opt.values.map((v) => (
                      <span key={v} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-surface-100 dark:bg-surface-800 text-xs font-semibold text-surface-700 dark:text-surface-200">
                        {v}
                        <button
                          type="button"
                          onClick={() => commit(options.map((o, j) => (j === i ? { ...o, values: o.values.filter((x) => x !== v) } : o)))}
                          aria-label={`Remove ${v}`}
                          className="p-0.5 rounded hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    value={drafts[i] ?? ""}
                    onChange={(e) => setDrafts((d) => d.map((x, j) => (j === i ? e.target.value : x)))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addValue(i, drafts[i] ?? "");
                      }
                    }}
                    maxLength={120}
                    placeholder={`Add ${opt.name.trim() || "value"}s — type and press Enter`}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => addValue(i, drafts[i] ?? "")}
                    className="px-3 rounded-lg text-sm font-semibold bg-surface-900 text-white dark:bg-white dark:text-black shrink-0"
                  >
                    Add
                  </button>
                </div>

                {presets.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-surface-400">Quick add:</span>
                    {presets.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => addValue(i, p.values.join(","))}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-accent-400"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {options.length < MAX_OPTIONS && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-surface-400">Add another option:</span>
              {unusedNames.slice(0, 3).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setOptions([...options, { name: n, values: [] }]);
                    setDrafts([...drafts, ""]);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-dashed border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300 hover:border-accent-400"
                >
                  <Plus className="w-3 h-3" /> {n}
                </button>
              ))}
            </div>
          )}

          {value.variants.length > 0 && (
            <div className="rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-surface-50 dark:bg-surface-800/60 text-xs font-semibold text-surface-500 dark:text-surface-400">
                <span>{value.variants.length} variant{value.variants.length !== 1 ? "s" : ""}</span>
                <span>{totalStock} in stock in total</span>
              </div>
              <div className="divide-y divide-surface-100 dark:divide-surface-800 max-h-[420px] overflow-y-auto">
                {value.variants.map((v) => (
                  <div key={v.label} className="grid grid-cols-[minmax(0,1fr)_80px_110px] sm:grid-cols-[minmax(0,1fr)_90px_120px_120px] gap-2 items-center px-3.5 py-2">
                    <span className="text-sm font-medium text-surface-800 dark:text-surface-100 truncate">{v.label}</span>
                    <input
                      type="number"
                      min={0}
                      value={v.stockQuantity ?? 0}
                      onChange={(e) => setVariant(v.label, { stockQuantity: Math.max(0, parseInt(e.target.value) || 0) })}
                      aria-label={`${v.label} stock`}
                      title="Stock"
                      className={`${inputCls} !py-1.5`}
                    />
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-surface-400">₦</span>
                      <input
                        type="number"
                        min={0}
                        value={v.price ?? ""}
                        onChange={(e) => setVariant(v.label, { price: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
                        placeholder={basePrice ? String(basePrice) : "Same price"}
                        aria-label={`${v.label} price`}
                        title="Price (leave empty to use the product price)"
                        className={`${inputCls} !py-1.5 pl-6`}
                      />
                    </div>
                    <input
                      value={v.sku ?? ""}
                      onChange={(e) => setVariant(v.label, { sku: e.target.value })}
                      maxLength={60}
                      placeholder="SKU"
                      aria-label={`${v.label} SKU`}
                      className={`${inputCls} !py-1.5 hidden sm:block`}
                    />
                  </div>
                ))}
              </div>
              <p className="px-3.5 py-2 text-xs text-surface-400 border-t border-surface-100 dark:border-surface-800">
                Stock · price (leave empty to use the product price) · SKU (optional)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

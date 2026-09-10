"use client";

import { useState } from "react";
import { Plus, X, Ruler } from "lucide-react";
import { CLOTHING_SIZES, SHOE_SIZES } from "@/lib/sizes";
import type { ProductSize } from "@/types";

interface Props {
  sizes: ProductSize[];
  onChange: (sizes: ProductSize[]) => void;
}

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400";

const chipClass = (active: boolean) =>
  `px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
    active
      ? "bg-accent-400 border-accent-400 text-black"
      : "border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-accent-400"
  }`;

export function SizeEditor({ sizes, onChange }: Props) {
  const enabled = sizes.length > 0;
  const [customLabel, setCustomLabel] = useState("");

  function toggle(label: string) {
    const idx = sizes.findIndex((s) => s.label === label);
    if (idx >= 0) {
      onChange(sizes.filter((_, i) => i !== idx));
    } else {
      onChange([...sizes, { label, stockQuantity: 0 }]);
    }
  }

  function addCustom() {
    const label = customLabel.trim();
    if (!label) return;
    if (sizes.some((s) => s.label.toLowerCase() === label.toLowerCase())) {
      setCustomLabel("");
      return;
    }
    onChange([...sizes, { label, stockQuantity: 0 }]);
    setCustomLabel("");
  }

  function setStock(label: string, qty: number) {
    onChange(sizes.map((s) => (s.label === label ? { ...s, stockQuantity: Math.max(0, qty) } : s)));
  }

  function remove(label: string) {
    onChange(sizes.filter((s) => s.label !== label));
  }

  return (
    <div>
      <label className="flex items-center gap-3 cursor-pointer mb-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked ? [{ label: "M", stockQuantity: 0 }] : [])}
          className="w-4 h-4 rounded accent-amber-400"
        />
        <span className="text-sm font-medium text-surface-700 dark:text-surface-300 flex items-center gap-1.5">
          <Ruler className="w-3.5 h-3.5 text-surface-400" />
          This product comes in different sizes
        </span>
      </label>

      {enabled && (
        <div className="space-y-4 pl-0.5">
          <p className="text-xs text-surface-400">
            Tap a size below to add it, then set how many you have in stock. You can also type a custom size.
          </p>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-400 mb-1.5">Clothing</p>
            <div className="flex flex-wrap gap-1.5">
              {CLOTHING_SIZES.map((label) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => toggle(label)}
                  className={chipClass(sizes.some((s) => s.label === label))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-400 mb-1.5">Shoes</p>
            <div className="flex flex-wrap gap-1.5">
              {SHOE_SIZES.map((label) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => toggle(label)}
                  className={chipClass(sizes.some((s) => s.label === label))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addCustom(); }
              }}
              className={inputClass}
              placeholder="Custom size (e.g. One Size, 28 waist)"
            />
            <button
              type="button"
              onClick={addCustom}
              className="shrink-0 p-2.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-500 hover:border-accent-400 hover:text-accent-500 transition-colors"
              aria-label="Add custom size"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {sizes.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-400">
                Sizes on this product · {sizes.reduce((sum, s) => sum + (s.stockQuantity ?? 0), 0)} total in stock
              </p>
              {sizes.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-sm font-semibold text-surface-900 dark:text-white truncate">
                    {s.label}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={s.stockQuantity ?? 0}
                    onChange={(e) => setStock(s.label, parseInt(e.target.value, 10) || 0)}
                    className={inputClass}
                    placeholder="Stock"
                  />
                  <button
                    type="button"
                    onClick={() => remove(s.label)}
                    className="shrink-0 p-2 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    aria-label={`Remove ${s.label}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SizeEditor;

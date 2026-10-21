"use client";

// Product-editor extras for Tier 3 verticals: bookable services (salons,
// consultants, studios) and size guides (clothing).

import { CalendarClock, Minus, Plus, Ruler, Trash2 } from "lucide-react";
import { SIZE_GUIDE_TEMPLATES, type SizeGuide } from "@/lib/size-guide";

const input =
  "w-full px-2.5 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-400";

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240, 480];
const label = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60} hour${m === 60 ? "" : "s"}`);

export function BookableFields({
  isBookable,
  durationMinutes,
  onChange,
  locked = false,
}: {
  isBookable: boolean;
  durationMinutes: number | null;
  onChange: (next: { isBookable: boolean; durationMinutes: number | null }) => void;
  /** Plan doesn't include bookings: can switch off, not on */
  locked?: boolean;
}) {
  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isBookable}
          disabled={locked && !isBookable}
          onChange={(e) => onChange({ isBookable: e.target.checked, durationMinutes: e.target.checked ? durationMinutes ?? 60 : null })}
          className="mt-0.5 w-4 h-4 rounded accent-amber-400"
        />
        <span>
          <span className="flex items-center gap-1.5 text-sm font-medium text-surface-700 dark:text-surface-300">
            <CalendarClock className="w-3.5 h-3.5 text-surface-400" /> This is a bookable service
            {locked && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">Pro</span>}
          </span>
          <span className="block text-xs text-surface-400 mt-0.5">
            Customers pick a date and time instead of a quantity — haircuts, sessions, consultations. Manage appointments under Bookings.
          </span>
        </span>
      </label>
      {isBookable && (
        <div className="pl-7">
          <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">How long does it take?</label>
          <select
            value={durationMinutes ?? 60}
            onChange={(e) => onChange({ isBookable: true, durationMinutes: Number(e.target.value) })}
            className={`${input} max-w-[200px]`}
          >
            {DURATIONS.map((m) => (
              <option key={m} value={m}>{label(m)}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export function SizeGuideEditor({ value, onChange }: { value: SizeGuide | null; onChange: (g: SizeGuide | null) => void }) {
  const g = value;
  const setCell = (r: number, c: number, v: string) =>
    g && onChange({ ...g, rows: g.rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)) });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-surface-700 dark:text-surface-300">
          <Ruler className="w-3.5 h-3.5 text-surface-400" /> Size guide
        </span>
        {g && (
          <button type="button" onClick={() => onChange(null)} className="flex items-center gap-1 text-xs font-medium text-surface-400 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" /> Remove
          </button>
        )}
      </div>

      {!g ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-surface-400">Start from:</span>
          {SIZE_GUIDE_TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => onChange(structuredClone(t.guide))}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-accent-400"
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange({ columns: ["Size", "Measurement"], rows: [["", ""]] })}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-dashed border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300"
          >
            Blank table
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/60">
                  {g.columns.map((c, j) => (
                    <th key={j} className="p-1.5 min-w-[90px]">
                      <input
                        value={c}
                        maxLength={30}
                        onChange={(e) => onChange({ ...g, columns: g.columns.map((x, k) => (k === j ? e.target.value : x)) })}
                        className={`${input} font-semibold`}
                        aria-label={`Column ${j + 1} heading`}
                      />
                    </th>
                  ))}
                  <th className="p-1.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {g.rows.map((row, r) => (
                  <tr key={r} className="border-t border-surface-100 dark:border-surface-800">
                    {row.map((cell, c) => (
                      <td key={c} className="p-1.5">
                        <input value={cell} maxLength={30} onChange={(e) => setCell(r, c, e.target.value)} className={input} aria-label={`Row ${r + 1}, ${g.columns[c]}`} />
                      </td>
                    ))}
                    <td className="p-1.5 text-center">
                      <button type="button" onClick={() => onChange({ ...g, rows: g.rows.filter((_, i) => i !== r) })} aria-label="Remove row" className="p-1 text-surface-400 hover:text-red-500">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={g.rows.length >= 30}
              onClick={() => onChange({ ...g, rows: [...g.rows, g.columns.map(() => "")] })}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 disabled:opacity-40"
            >
              <Plus className="w-3 h-3" /> Row
            </button>
            <button
              type="button"
              disabled={g.columns.length >= 8}
              onClick={() => onChange({ ...g, columns: [...g.columns, ""], rows: g.rows.map((r) => [...r, ""]) })}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 disabled:opacity-40"
            >
              <Plus className="w-3 h-3" /> Column
            </button>
            {g.columns.length > 1 && (
              <button
                type="button"
                onClick={() => onChange({ ...g, columns: g.columns.slice(0, -1), rows: g.rows.map((r) => r.slice(0, -1)) })}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300"
              >
                <Minus className="w-3 h-3" /> Column
              </button>
            )}
          </div>
          <input
            value={g.note ?? ""}
            maxLength={300}
            onChange={(e) => onChange({ ...g, note: e.target.value })}
            placeholder="Note for shoppers, e.g. how to measure"
            className={input}
          />
        </>
      )}
    </div>
  );
}

export interface ListingInfo {
  brand: string;
  gtin: string;
  googleCategory: string;
}

/** Optional catalog details for Google Shopping / Meta (Sales channels). */
export function ListingFields({ value, onChange }: { value: ListingInfo; onChange: (v: ListingInfo) => void }) {
  const set = (k: keyof ListingInfo) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold text-surface-900 dark:text-white text-sm">Google & Facebook listing</p>
        <p className="text-xs text-surface-500 dark:text-surface-400">Optional. Helps your product show up on Google Shopping and Instagram/Facebook Shops.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-surface-600 dark:text-surface-300">Brand</span>
          <input className={input} value={value.brand} onChange={set("brand")} maxLength={70} placeholder="Defaults to your store name" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-surface-600 dark:text-surface-300">Barcode (GTIN)</span>
          <input className={input} value={value.gtin} onChange={set("gtin")} inputMode="numeric" maxLength={14} placeholder="8–14 digits" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-surface-600 dark:text-surface-300">Google category</span>
          <input className={input} value={value.googleCategory} onChange={set("googleCategory")} maxLength={200} placeholder="e.g. Apparel & Accessories > Shoes" />
        </label>
      </div>
    </div>
  );
}

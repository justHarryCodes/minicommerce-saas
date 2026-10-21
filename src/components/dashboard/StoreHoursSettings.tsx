"use client";

// Opening hours + order-ahead, minimum order and prep time. Saved with the
// rest of Settings. No hours = always open (the storefront shows no badge).

import { Clock } from "lucide-react";
import { HOURS_PRESETS, WEEKDAYS, type WeeklyHours } from "@/lib/hours";

const input =
  "px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-400";

// Monday-first for display
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export type HoursField = "openingHours" | "allowPreorders" | "minimumOrder" | "prepTimeMinutes";

export default function StoreHoursSettings({
  hours,
  allowPreorders,
  minimumOrder,
  prepTimeMinutes,
  onChange,
}: {
  hours: WeeklyHours | null;
  allowPreorders: boolean;
  minimumOrder: number | null;
  prepTimeMinutes: number | null;
  onChange: (key: HoursField, value: unknown) => void;
}) {
  const enabled = !!hours;
  const setDay = (d: number, v: WeeklyHours[string]) => onChange("openingHours", { ...(hours ?? {}), [String(d)]: v });

  return (
    <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6 space-y-5">
      <h2 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Opening hours &amp; ordering
      </h2>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange("openingHours", e.target.checked ? HOURS_PRESETS[0].hours : null)}
          className="mt-0.5 w-4 h-4 rounded accent-amber-400"
        />
        <span>
          <span className="block text-sm font-medium text-surface-900 dark:text-white">Set opening hours</span>
          <span className="block text-xs text-surface-400">Shows &ldquo;Open now&rdquo; / &ldquo;Closed&rdquo; on your store. Also used as your booking hours for services.</span>
        </span>
      </label>

      {enabled && hours && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {HOURS_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange("openingHours", p.hours)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800"
              >
                {p.label}
              </button>
            ))}
          </div>
          <ul className="divide-y divide-surface-100 dark:divide-surface-800 rounded-xl border border-surface-200 dark:border-surface-700">
            {ORDER.map((d) => {
              const h = hours[String(d)];
              return (
                <li key={d} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <span className="w-24 text-sm font-medium text-surface-800 dark:text-surface-100">{WEEKDAYS[d]}</span>
                  <label className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
                    <input
                      type="checkbox"
                      checked={!!h}
                      onChange={(e) => setDay(d, e.target.checked ? { open: "09:00", close: "18:00" } : null)}
                      className="w-4 h-4 rounded accent-amber-400"
                    />
                    Open
                  </label>
                  {h ? (
                    <div className="flex items-center gap-2">
                      <input type="time" value={h.open} onChange={(e) => setDay(d, { ...h, open: e.target.value })} className={input} aria-label={`${WEEKDAYS[d]} opens`} />
                      <span className="text-xs text-surface-400">to</span>
                      <input type="time" value={h.close} onChange={(e) => setDay(d, { ...h, close: e.target.value })} className={input} aria-label={`${WEEKDAYS[d]} closes`} />
                    </div>
                  ) : (
                    <span className="text-xs text-surface-400">Closed</span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-surface-400">Times are Lagos time. Closing after midnight (e.g. 6pm to 2am) is fine.</p>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowPreorders}
              onChange={(e) => onChange("allowPreorders", e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-amber-400"
            />
            <span>
              <span className="block text-sm font-medium text-surface-900 dark:text-white">Take orders while closed</span>
              <span className="block text-xs text-surface-400">They&apos;re scheduled for when you next open. Untick to pause ordering outside your hours.</span>
            </span>
          </label>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 pt-1">
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Minimum order</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-surface-400">₦</span>
            <input
              type="number"
              min={0}
              value={minimumOrder ?? ""}
              onChange={(e) => onChange("minimumOrder", e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
              placeholder="No minimum"
              className={`${input} w-full pl-7`}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Preparation time</label>
          <div className="relative">
            <input
              type="number"
              min={1}
              max={1440}
              value={prepTimeMinutes ?? ""}
              onChange={(e) => onChange("prepTimeMinutes", e.target.value === "" ? null : Math.max(1, Number(e.target.value)))}
              placeholder="Not shown"
              className={`${input} w-full pr-14`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-400">minutes</span>
          </div>
          <p className="text-xs text-surface-400 mt-1">Shown as &ldquo;ready in about N min&rdquo; while you&apos;re open.</p>
        </div>
      </div>
    </section>
  );
}

// Static (server-renderable) parts of the analytics chart kit: number
// formatting, stat tiles and ranked bar lists. The interactive column chart
// lives in charts.tsx. Series colour: palette slot 1, validated on both
// card surfaces (#2a78d6 on #ffffff, #3987e5 on #18181b).

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export const SERIES_FILL = "fill-[#2a78d6] dark:fill-[#3987e5]";
export const SERIES_BG = "bg-[#2a78d6] dark:bg-[#3987e5]";

/* ───────────────────────── Number formatting ───────────────────────── */

export function compactNaira(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 1_000) return `₦${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}
export const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
export const count = (n: number) => Math.round(n).toLocaleString("en-NG");
export function compactCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K` : String(Math.round(n));
}

/* ───────────────────────── Stat tile ───────────────────────── */

export function StatTile({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  /** % change vs previous period; null = no baseline */
  delta?: number | null;
  hint?: string;
}) {
  const Icon = delta == null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const tone =
    delta == null || delta === 0
      ? "text-surface-400"
      : delta > 0
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-red-600 dark:text-red-400";
  return (
    <div className="rounded-2xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
      <p className="text-xs text-surface-500 dark:text-surface-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-surface-900 dark:text-white">{value}</p>
      {delta !== undefined && (
        <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${tone}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {delta == null ? "New this period" : `${delta > 0 ? "+" : ""}${delta}%`}
          <span className="font-normal text-surface-400">{hint ?? "vs previous period"}</span>
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── Ranked bar list ───────────────────────── */

export function BarList({
  title,
  subtitle,
  items,
  format,
  empty,
}: {
  title: string;
  subtitle?: string;
  items: { label: string; value: number; note?: string }[];
  format: (n: number) => string;
  empty: string;
}) {
  const max = Math.max(0, ...items.map((i) => i.value));
  return (
    <section className="rounded-2xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900 sm:p-5">
      <h2 className="text-sm font-semibold text-surface-900 dark:text-white">{title}</h2>
      {subtitle && <p className="text-xs text-surface-500 dark:text-surface-400">{subtitle}</p>}
      {items.length === 0 ? (
        <p className="mt-6 pb-4 text-center text-sm text-surface-400">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((it) => (
            <li key={it.label} title={`${it.label}: ${format(it.value)}${it.note ? ` · ${it.note}` : ""}`}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-surface-700 dark:text-surface-200">{it.label}</span>
                <span className="shrink-0 tabular-nums font-semibold text-surface-900 dark:text-white">
                  {format(it.value)}
                  {it.note && <span className="ml-1.5 text-xs font-normal text-surface-400">{it.note}</span>}
                </span>
              </div>
              <div className="h-2 w-full rounded-r bg-surface-50 dark:bg-surface-800/60">
                <div
                  className={`h-2 rounded-r ${SERIES_BG}`}
                  style={{ width: `${max ? Math.max(1.5, (it.value / max) * 100) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

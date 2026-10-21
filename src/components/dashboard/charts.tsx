"use client";

// Interactive column chart for the analytics page.
// Specs (see the data-viz method): one series per chart, one y-axis, bars
// ≤ 24px with a 4px rounded data-end and square baseline, a 2px gap between
// neighbours, hairline grid, hover + keyboard-focus tooltips, and a table
// view. Formatting is passed by name — server pages can't hand functions
// to client components.

import { useEffect, useRef, useState } from "react";
import { Table2 } from "lucide-react";
import { SERIES_FILL, compactCount, compactNaira, count, naira } from "./charts-static";

export type ChartFormat = "naira" | "visitors";
const FORMATS: Record<ChartFormat, { value: (n: number) => string; axis: (n: number) => string }> = {
  naira: { value: naira, axis: compactNaira },
  visitors: { value: (n) => `${count(n)} visitor${n === 1 ? "" : "s"}`, axis: compactCount },
};

/** Round an axis max up to a clean 1/2/2.5/5 × 10ⁿ step (3 gridlines). */
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const raw = max / 3;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  return step * 3;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-NG", { day: "numeric", month: "short" });

export function ColumnChart({
  title,
  subtitle,
  data,
  format: formatName,
}: {
  title: string;
  subtitle?: string;
  data: { date: string; value: number }[];
  format: ChartFormat;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const { value: format, axis: fmtAxis } = FORMATS[formatName];

  const H = 200;
  const axisW = 44;
  const plotW = Math.max(0, width - axisW);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(2, Math.min(24, band - 2)); // 2px surface gap between neighbours
  const y = (v: number) => H - (v / max) * H;
  const ticks = [0, max / 3, (2 * max) / 3, max];
  const labelIdx = data.length <= 7 ? data.map((_, i) => i) : [0, Math.floor((data.length - 1) / 2), data.length - 1];
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <section className="rounded-2xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-surface-900 dark:text-white">{title}</h2>
          <p className="text-xs text-surface-500 dark:text-surface-400">{subtitle ?? `${format(total)} total`}</p>
        </div>
        <button
          type="button"
          onClick={() => setTable((t) => !t)}
          aria-pressed={table}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-surface-500 hover:bg-surface-50 hover:text-surface-900 dark:hover:bg-surface-800 dark:hover:text-white"
        >
          <Table2 className="h-3.5 w-3.5" /> {table ? "Chart" : "Table"}
        </button>
      </div>

      {table ? (
        <div className="max-h-[240px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-surface-400">
                <th className="pb-1.5 font-medium">Date</th>
                <th className="pb-1.5 text-right font-medium">{title}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.map((d) => (
                <tr key={d.date} className="border-t border-surface-50 dark:border-surface-800">
                  <td className="py-1.5 text-surface-600 dark:text-surface-300">{shortDate(d.date)}</td>
                  <td className="py-1.5 text-right text-surface-900 dark:text-white">{format(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative" style={{ height: H + 24 }}>
          {width > 0 && (
            <>
              {/* y-axis labels */}
              {ticks.map((t) => (
                <span
                  key={t}
                  className="absolute left-0 w-10 -translate-y-1/2 text-right text-[11px] tabular-nums text-surface-400"
                  style={{ top: y(t) }}
                >
                  {fmtAxis(t)}
                </span>
              ))}
              <svg width={plotW} height={H} className="absolute top-0 overflow-visible" style={{ left: axisW }} role="img" aria-label={`${title} by day`}>
                {ticks.map((t) => (
                  <line key={t} x1={0} x2={plotW} y1={y(t)} y2={y(t)} className="stroke-surface-100 dark:stroke-surface-800" strokeWidth={1} />
                ))}
                {data.map((d, i) => {
                  const h = H - y(d.value);
                  const x = i * band + (band - barW) / 2;
                  const r = Math.min(4, barW / 2, h);
                  return (
                    <g key={d.date}>
                      {h > 0 && (
                        <path
                          d={`M${x},${H} V${H - h + r} Q${x},${H - h} ${x + r},${H - h} H${x + barW - r} Q${x + barW},${H - h} ${x + barW},${H - h + r} V${H} Z`}
                          className={`${SERIES_FILL} transition-opacity`}
                          opacity={active === null || active === i ? 1 : 0.45}
                        />
                      )}
                      {/* hit target: the whole band, bigger than the mark */}
                      <rect
                        x={i * band}
                        y={0}
                        width={band}
                        height={H}
                        fill="transparent"
                        tabIndex={0}
                        aria-label={`${shortDate(d.date)}: ${format(d.value)}`}
                        onPointerEnter={() => setActive(i)}
                        onPointerLeave={() => setActive(null)}
                        onFocus={() => setActive(i)}
                        onBlur={() => setActive(null)}
                        className="cursor-default outline-none"
                      />
                    </g>
                  );
                })}
              </svg>
              {/* x labels */}
              {labelIdx.map((i) => (
                <span
                  key={i}
                  className="absolute -translate-x-1/2 whitespace-nowrap text-[11px] text-surface-400"
                  style={{ left: axisW + i * band + band / 2, top: H + 6 }}
                >
                  {shortDate(data[i].date)}
                </span>
              ))}
              {/* tooltip — value leads, date follows */}
              {active !== null && data[active] && (
                <div
                  className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-surface-100 bg-white px-3 py-2 shadow-lg dark:border-surface-700 dark:bg-surface-800"
                  style={{
                    left: Math.min(Math.max(axisW + active * band + band / 2, 70), width - 70),
                    top: Math.max(0, y(data[active].value) - 58),
                  }}
                >
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">{format(data[active].value)}</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400">{shortDate(data[active].date)}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Ruler, X } from "lucide-react";
import type { SizeGuide } from "@/lib/size-guide";

export default function SizeGuideButton({ guide, productName }: { guide: SizeGuide; productName: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs font-semibold text-surface-600 underline-offset-4 hover:underline dark:text-surface-300"
      >
        <Ruler className="h-3.5 w-3.5" /> Size guide
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal aria-label="Size guide">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl dark:bg-surface-900 sm:rounded-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg text-surface-900 dark:text-white">Size guide</h2>
                <p className="text-xs text-surface-500 dark:text-surface-400">{productName}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200 text-left dark:border-surface-700">
                    {guide.columns.map((c) => (
                      <th key={c} className="whitespace-nowrap px-2 py-2 text-xs font-semibold text-surface-500 dark:text-surface-400">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {guide.rows.map((r, i) => (
                    <tr key={i} className="border-b border-surface-50 dark:border-surface-800">
                      {r.map((c, j) => (
                        <td key={j} className={`whitespace-nowrap px-2 py-2 ${j === 0 ? "font-semibold text-surface-900 dark:text-white" : "text-surface-600 dark:text-surface-300"}`}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {guide.note && <p className="mt-4 text-xs text-surface-500 dark:text-surface-400">{guide.note}</p>}
          </div>
        </div>
      )}
    </>
  );
}

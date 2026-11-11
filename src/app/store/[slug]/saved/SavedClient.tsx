"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, Trash2, X } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useStore } from "@/lib/store-context";
import { formatCurrency } from "@/lib/utils";

type Sort = "recent" | "low" | "high";

const SORTS: { id: Sort; label: string }[] = [
  { id: "recent", label: "Recently saved" },
  { id: "low", label: "Price: low to high" },
  { id: "high", label: "Price: high to low" },
];

export default function SavedClient({
  storeSlug,
  homeHref,
  categories,
}: {
  storeSlug: string;
  homeHref: string;
  categories: { id: string; name: string; slug: string }[];
}) {
  const { bookmarks, toggleBookmark, clearAll, hydrated } = useBookmarks(storeSlug);
  const { storeBase } = useStore();
  const [sort, setSort] = useState<Sort>("recent");
  const [confirmClear, setConfirmClear] = useState(false);

  const list = useMemo(() => {
    if (sort === "recent") return bookmarks; // newest first already
    const sorted = [...bookmarks].sort((a, b) => a.price - b.price);
    return sort === "high" ? sorted.reverse() : sorted;
  }, [bookmarks, sort]);

  const total = bookmarks.reduce((s, b) => s + (Number(b.price) || 0), 0);

  return (
    <>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="sf-display flex items-center gap-2.5 text-3xl text-surface-900 dark:text-white sm:text-4xl">
            <Heart className="h-7 w-7 fill-red-500 text-red-500" /> Saved items
          </h1>
          {hydrated && bookmarks.length > 0 && (
            <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">
              {bookmarks.length} item{bookmarks.length === 1 ? "" : "s"} · {formatCurrency(total)} in total
            </p>
          )}
        </div>

        {hydrated && bookmarks.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-surface-100 p-1 dark:bg-surface-800">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    sort === s.id ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white" : "text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {confirmClear ? (
              <span className="flex items-center gap-1">
                <button
                  onClick={() => {
                    clearAll();
                    setConfirmClear(false);
                  }}
                  className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white"
                >
                  Clear all
                </button>
                <button onClick={() => setConfirmClear(false)} className="rounded-full p-1.5 text-surface-400 hover:text-surface-700" aria-label="Cancel">
                  <X className="h-4 w-4" />
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-surface-500 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {!hydrated ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-[var(--sf-radius)] bg-surface-100 dark:bg-surface-800" />
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="mx-auto mt-10 max-w-md py-12 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-50 dark:bg-red-950/40">
            <Heart className="h-7 w-7 text-red-500" />
          </span>
          <p className="mt-5 text-lg font-bold text-surface-900 dark:text-white">Nothing saved yet</p>
          <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">
            Tap the heart on any product to keep it here for later. Saved items stay on this device.
          </p>
          <Link
            href={homeHref}
            className="sf-btn mt-6 inline-flex px-6 py-3 text-sm"
            style={{ background: "var(--sf-accent)", color: "var(--sf-on-accent)" }}
          >
            Start shopping <ArrowRight className="h-4 w-4" />
          </Link>
          {categories.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`${homeHref}?category=${c.slug}`}
                  className="rounded-full border border-surface-200 px-3.5 py-1.5 text-xs font-semibold text-surface-700 hover:border-[color:var(--sf-accent)] dark:border-surface-700 dark:text-surface-200"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {list.map((p) => {
            const off = p.compare_price && p.compare_price > p.price ? Math.round((1 - p.price / p.compare_price) * 100) : 0;
            return (
              <li
                key={p.id}
                className="group relative overflow-hidden rounded-[var(--sf-radius)] border border-surface-100 bg-white transition-shadow hover:shadow-lg dark:border-surface-800 dark:bg-surface-900"
              >
                <button
                  onClick={() => toggleBookmark(p)}
                  aria-label={`Remove ${p.name} from saved`}
                  className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-sm transition-transform hover:scale-110 dark:bg-surface-800/95"
                >
                  <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                </button>
                {off > 0 && (
                  <span className="absolute left-2 top-2 z-10 rounded-md px-1.5 py-0.5 text-[11px] font-bold" style={{ background: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
                    -{off}%
                  </span>
                )}
                <Link href={`${storeBase}/products/${p.slug}`} className="block">
                  <div className="relative aspect-square overflow-hidden bg-surface-50 dark:bg-surface-800">
                    {p.image_url ? (
                      <Image src={p.image_url} alt={p.name} fill sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-3xl font-black text-surface-300">{p.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-snug text-surface-900 dark:text-white">{p.name}</p>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="text-base font-black text-surface-900 dark:text-white">{formatCurrency(p.price)}</span>
                      {off > 0 && <span className="text-xs text-surface-400 line-through">{formatCurrency(p.compare_price!)}</span>}
                    </div>
                    <span className="mt-2.5 flex items-center justify-center gap-1.5 rounded-[var(--sf-radius-btn,0.75rem)] border border-surface-200 py-2 text-xs font-bold text-surface-800 transition-colors group-hover:border-[color:var(--sf-accent)] dark:border-surface-700 dark:text-surface-100">
                      View product <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

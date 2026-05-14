"use client";

import { useRef } from "react";
import { Heart, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { formatCurrency } from "@/lib/utils";

const CARD_W = 180;

interface Props {
  storeSlug: string;
}

export default function BookmarkSlider({ storeSlug }: Props) {
  const { bookmarks, clearAll, toggleBookmark, hydrated } = useBookmarks(storeSlug);
  const ref = useRef<HTMLDivElement>(null);

  if (!hydrated || bookmarks.length === 0) return null;

  const scroll = (dir: "left" | "right") =>
    ref.current?.scrollBy({ left: dir === "left" ? -CARD_W * 2 : CARD_W * 2, behavior: "smooth" });

  return (
    <section id="saved-items" className="mt-16 scroll-mt-20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 fill-current text-red-500" />
          <h2 className="text-lg font-bold text-surface-900 dark:text-white">Saved Items</h2>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            {bookmarks.length}
          </span>
        </div>
        <button
          onClick={clearAll}
          className="text-xs text-surface-400 hover:text-red-500 transition-colors font-medium flex items-center gap-1"
        >
          <X className="w-3.5 h-3.5" /> Clear all
        </button>
      </div>

      <div className="relative group/bslider">
        {/* Left arrow */}
        {bookmarks.length > 3 && (
          <button
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-md border bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-700 opacity-0 group-hover/bslider:opacity-100 transition-all hover:scale-110 focus-visible:opacity-100 -ml-4"
          >
            <ChevronLeft className="w-4 h-4 text-surface-700 dark:text-surface-300" />
          </button>
        )}

        {/* Track */}
        <div
          ref={ref}
          className="flex gap-3 overflow-x-auto pb-2"
          style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
        >
          {bookmarks.map((p) => (
            <div
              key={p.id}
              className="group/card relative shrink-0 rounded-2xl border border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
              style={{ width: CARD_W, scrollSnapAlign: "start" }}
            >
              {/* Remove button */}
              <button
                onClick={() => toggleBookmark(p)}
                aria-label="Remove bookmark"
                className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 dark:bg-surface-800/90 flex items-center justify-center shadow opacity-0 group-hover/card:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <X className="w-3.5 h-3.5 text-red-500" />
              </button>

              <a href={`/store/${storeSlug}/products/${p.slug}`} className="block">
                {/* Image */}
                <div className="aspect-square bg-surface-50 dark:bg-surface-800 overflow-hidden">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-surface-200 dark:text-surface-700">
                      🛍️
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-surface-900 dark:text-white line-clamp-2 leading-snug mb-1">
                    {p.name}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-black text-surface-900 dark:text-white">
                      {formatCurrency(p.price)}
                    </span>
                    {p.compare_price && p.compare_price > p.price && (
                      <span className="text-xs text-surface-400 line-through">
                        {formatCurrency(p.compare_price)}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            </div>
          ))}
        </div>

        {/* Right arrow */}
        {bookmarks.length > 3 && (
          <button
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-md border bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-700 opacity-0 group-hover/bslider:opacity-100 transition-all hover:scale-110 focus-visible:opacity-100 -mr-4"
          >
            <ChevronRight className="w-4 h-4 text-surface-700 dark:text-surface-300" />
          </button>
        )}
      </div>
    </section>
  );
}

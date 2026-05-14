"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getProductUrl } from "@/lib/utils";

export interface ProductSlide {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_price: number | null;
  image_url: string;
  store_name: string;
  store_slug: string;
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);
}

const CARD_W = 276; // px, controls scroll step

export default function ProductSlider({ products }: { products: ProductSlide[] }) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") =>
    ref.current?.scrollBy({ left: dir === "left" ? -CARD_W : CARD_W, behavior: "smooth" });

  if (!products.length) return null;

  return (
    <div className="relative group/slider">
      {/* Left arrow */}
      <button
        onClick={() => scroll("left")}
        aria-label="Scroll left"
        className="absolute left-0 top-1/2 -translate-y-8 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-md border opacity-0 group-hover/slider:opacity-100 transition-all hover:scale-110 focus-visible:opacity-100"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <ChevronLeft className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
      </button>

      {/* Scroll track */}
      <div
        ref={ref}
        className="flex gap-5 overflow-x-auto px-2 pb-3"
        style={{
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {products.map((p) => (
          <a
            key={p.id}
            href={getProductUrl(p.store_slug, p.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="group shrink-0 rounded-2xl border overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1"
            style={{
              width: CARD_W,
              scrollSnapAlign: "start",
              background: "var(--bg)",
              borderColor: "var(--border)",
            }}
          >
            {/* Product image */}
            <div className="relative overflow-hidden bg-zinc-100 dark:bg-zinc-800"
              style={{ aspectRatio: "1 / 1" }}>
              <img
                src={p.image_url}
                alt={p.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {p.compare_price && p.compare_price > p.price && (
                <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-black text-white"
                  style={{ background: "#ef4444" }}>
                  {Math.round((1 - p.price / p.compare_price) * 100)}% OFF
                </span>
              )}
            </div>

            {/* Product info */}
            <div className="p-4">
              <p className="text-xs font-bold mb-1 truncate" style={{ color: "var(--accent)" }}>
                {p.store_name}
              </p>
              <p className="text-sm font-semibold leading-snug mb-3 line-clamp-2"
                style={{ color: "var(--text-primary)" }}>
                {p.name}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black" style={{ color: "var(--text-primary)" }}>
                  {formatPrice(p.price)}
                </span>
                {p.compare_price && p.compare_price > p.price && (
                  <span className="text-xs line-through" style={{ color: "var(--text-muted)" }}>
                    {formatPrice(p.compare_price)}
                  </span>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll("right")}
        aria-label="Scroll right"
        className="absolute right-0 top-1/2 -translate-y-8 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-md border opacity-0 group-hover/slider:opacity-100 transition-all hover:scale-110 focus-visible:opacity-100"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <ChevronRight className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
      </button>
    </div>
  );
}

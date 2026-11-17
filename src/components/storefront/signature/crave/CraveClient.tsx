"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";
import { AddButton, useUntilMidnight } from "../shared";
import { hms, imageOf } from "../utils";

// Interactive pieces of the Crave homepage: product cards, the filterable
// menu grid and the deal timer.

const plain = (s?: string) => (s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/** White card: photo, badge, rating, price and a red "+". */
export function CraveCard({ product: p, badge }: { product: Product; badge?: string }) {
  const { storeBase, ratings } = useStore();
  const img = imageOf(p);
  const was = p.compare_price ?? p.comparePrice;
  const off = was && was > p.price ? Math.round((1 - p.price / was) * 100) : 0;
  const tag = off > 0 ? `Save ${off}%` : badge;
  const rating = ratings[p.id];
  return (
    <article className="group relative flex h-full flex-col rounded-[1.75rem] bg-white p-2.5 shadow-[0_10px_30px_-18px_rgba(120,40,10,0.35)] ring-1 ring-black/[0.04] transition-transform duration-300 hover:-translate-y-1 dark:bg-white/[0.06] dark:ring-white/10 sm:p-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-[color-mix(in_srgb,var(--sf-accent)_8%,transparent)]">
        {img && <Image src={img} alt={p.name} fill sizes="(min-width: 1024px) 22vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />}
        {tag && (
          <span className="absolute left-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ backgroundColor: off > 0 ? "#fbbf24" : "var(--sf-accent)", color: off > 0 ? "#111" : "var(--sf-on-accent)" }}>
            {tag}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-1 pb-0.5 pt-3">
        <h3 className="line-clamp-1 text-[15px] !font-bold !normal-case !tracking-normal sm:text-base" style={{ color: "var(--sf-ink)" }}>
          <Link href={`${storeBase}/products/${p.slug ?? p.id}`} className="after:absolute after:inset-0 after:rounded-[1.75rem]">{p.name}</Link>
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs opacity-55" style={{ color: "var(--sf-ink)" }}>{plain(p.short_description ?? p.shortDescription)}</p>
        {rating && rating[1] > 0 && (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--sf-ink)" }}>
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {rating[0].toFixed(1)}
            <span className="font-normal opacity-50">({rating[1]})</span>
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span>
            <span className="block text-lg font-extrabold" style={{ color: "var(--sf-ink)" }}>{formatCurrency(p.price)}</span>
            {off > 0 && <s className="block text-xs opacity-45" style={{ color: "var(--sf-ink)" }}>{formatCurrency(was!)}</s>}
          </span>
          <span className="relative z-10">
            <AddButton product={p} size="sm" />
          </span>
        </div>
      </div>
    </article>
  );
}

/** Category pills over a card grid. */
export function MenuGrid({ tabs, products, bestIds }: { tabs: { id: string; name: string }[]; products: Product[]; bestIds: string[] }) {
  const [active, setActive] = useState("all");
  const all = [{ id: "all", name: "All" }, ...tabs.filter((t) => products.some((p) => p.category_id === t.id))];
  const shown = active === "all" ? products : products.filter((p) => p.category_id === active);
  const best = new Set(bestIds);
  return (
    <div>
      <div role="tablist" aria-label="Menu categories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-center lg:mx-0 lg:flex-wrap lg:px-0">
        {all.map((t) => {
          const on = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(t.id)}
              className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition-all ${on ? "shadow-lg" : "bg-white ring-1 ring-black/5 hover:ring-black/15 dark:bg-white/5 dark:ring-white/10"}`}
              style={on ? { backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)", boxShadow: "0 10px 24px -12px var(--sf-accent)" } : { color: "var(--sf-ink)" }}
            >
              {t.name}
            </button>
          );
        })}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((p) => (
          <div key={p.id} className="ember-pop">
            <CraveCard product={p} badge={best.has(p.id) ? "Bestseller" : undefined} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Ends in 04:12:33" pill. */
export function DealTimer({ dark = false }: { dark?: boolean }) {
  const [h, m, s] = hms(useUntilMidnight());
  return (
    <span role="timer" aria-label="Time left on this deal" className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold tabular-nums ${dark ? "bg-black/25 text-white" : "bg-white/90 text-zinc-900"}`}>
      Ends in {h}:{m}:{s}
    </span>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";
import { AddButton, useUntilMidnight } from "../shared";
import { hms, imageOf } from "../utils";

/** Sports-store product card: white tile, slanted badge, stars, price and a square cart button. */
export function PulseCard({ product: p, badge }: { product: Product; badge?: string }) {
  const { storeBase, ratings } = useStore();
  const img = imageOf(p);
  const was = p.compare_price ?? p.comparePrice;
  const off = was && was > p.price ? Math.round((1 - p.price / was) * 100) : 0;
  const rating = ratings[p.id];
  const tag = off > 0 ? `${off}% off` : badge;
  return (
    <article className="group relative flex h-full flex-col rounded-md bg-white p-3 ring-1 ring-black/[0.06] transition-shadow hover:shadow-[0_16px_36px_-22px_rgba(0,0,0,0.5)] dark:bg-white/[0.05] dark:ring-white/10">
      <div className="relative aspect-square overflow-hidden rounded bg-zinc-100 dark:bg-white/5">
        {img && <Image src={img} alt={p.name} fill sizes="(min-width: 1024px) 18vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
        {tag && (
          <span className="absolute left-0 top-2.5 -skew-x-12 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white" style={{ backgroundColor: off > 0 ? "var(--sf-accent)" : "#0b0b0d" }}>
            <span className="inline-block skew-x-12">{tag}</span>
          </span>
        )}
      </div>
      <h3 className="mt-3 line-clamp-2 text-[13px] ![font-family:var(--sf-font)] !font-semibold !normal-case !leading-snug !tracking-normal" style={{ color: "var(--sf-ink)" }}>
        <Link href={`${storeBase}/products/${p.slug ?? p.id}`} className="after:absolute after:inset-0 after:rounded-md">{p.name}</Link>
      </h3>
      {rating && rating[1] > 0 && (
        <p className="mt-1 flex items-center gap-0.5 text-[11px]" style={{ color: "var(--sf-ink)" }} aria-label={`${rating[0].toFixed(1)} out of 5`}>
          {Array.from({ length: 5 }, (_, n) => (
            <Star key={n} className={`h-3 w-3 ${n < Math.round(rating[0]) ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
          ))}
          <span className="ml-1 opacity-50">({rating[1]})</span>
        </p>
      )}
      <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
        <span className="min-w-0">
          <span className="block text-[15px] font-extrabold" style={{ color: "var(--sf-ink)" }}>{formatCurrency(p.price)}</span>
          {off > 0 && <s className="block text-[11px] opacity-40" style={{ color: "var(--sf-ink)" }}>{formatCurrency(was!)}</s>}
        </span>
        <span className="relative z-10">
          <AddButton product={p} size="sm" variant="square" />
        </span>
      </div>
    </article>
  );
}

/** "Ends in 12 : 34 : 56" on a white chip. */
export function FlashClock() {
  const [h, m, s] = hms(useUntilMidnight());
  return (
    <div role="timer" aria-label="Time left on the flash sale" className="inline-flex items-center gap-2.5 whitespace-nowrap rounded-md bg-white px-3 py-2 sm:gap-3 sm:px-4 text-zinc-900 shadow-lg">
      <span className="text-[10px] font-bold uppercase leading-tight tracking-wider text-zinc-500">
        Ends
        <br />
        in
      </span>
      <span className="text-xl font-black tabular-nums tracking-tight sm:text-2xl">
        {h} : {m} : {s}
      </span>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";
import { AddButton } from "../shared";
import { imageOf } from "../utils";

/** Sneaker-store product card: photo on light grey, badge, rating, price, quick add. */
export function KickCard({ product: p, badge, label }: { product: Product; badge?: string; label?: string }) {
  const { storeBase, ratings } = useStore();
  const img = imageOf(p);
  const was = p.compare_price ?? p.comparePrice;
  const off = was && was > p.price ? Math.round((1 - p.price / was) * 100) : 0;
  const rating = ratings[p.id];
  return (
    <article className="group relative flex h-full flex-col rounded-xl bg-white p-2.5 ring-1 ring-black/[0.06] transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)] dark:bg-white/[0.05] dark:ring-white/10">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-white/5">
        {img && <Image src={img} alt={p.name} fill sizes="(min-width: 1024px) 22vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
        {(off > 0 || badge) && (
          <span className="absolute left-2 top-2 rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white" style={{ backgroundColor: off > 0 ? "var(--sf-accent)" : "#0a0a0a" }}>
            {off > 0 ? `Sale -${off}%` : badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-1 pt-3">
        {label && <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-45" style={{ color: "var(--sf-ink)" }}>{label}</p>}
        <h3 className="mt-0.5 line-clamp-1 text-sm ![font-family:var(--sf-font)] !font-bold !normal-case !leading-snug !tracking-normal" style={{ color: "var(--sf-ink)" }}>
          <Link href={`${storeBase}/products/${p.slug ?? p.id}`} className="after:absolute after:inset-0 after:rounded-xl">{p.name}</Link>
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
          <span>
            <span className="block text-base font-black" style={{ color: off > 0 ? "var(--sf-accent-ink)" : "var(--sf-ink)" }}>{formatCurrency(p.price)}</span>
            {off > 0 && <s className="block text-[11px] opacity-40" style={{ color: "var(--sf-ink)" }}>{formatCurrency(was!)}</s>}
          </span>
          <span className="relative z-10">
            <AddButton product={p} size="sm" />
          </span>
        </div>
      </div>
    </article>
  );
}

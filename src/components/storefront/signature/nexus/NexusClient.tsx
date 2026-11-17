"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";
import { AddButton, useUntilMidnight } from "../shared";
import { hms, imageOf } from "../utils";

// Interactive pieces of the Nexus homepage: the neon product card and the
// flash-deal timer.

/** Dark glass card: photo on a soft glow, rating, price and an add button. */
export function TechCard({ product: p, badge, eyebrow }: { product: Product; badge?: string; eyebrow?: string }) {
  const { storeBase, ratings } = useStore();
  const img = imageOf(p);
  const was = p.compare_price ?? p.comparePrice;
  const off = was && was > p.price ? Math.round((1 - p.price / was) * 100) : 0;
  const tag = off > 0 ? `-${off}%` : badge;
  const rating = ratings[p.id];
  return (
    <article className="nexus-card group relative flex h-full flex-col rounded-2xl p-2.5 transition-all duration-300 hover:-translate-y-1 sm:p-3">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_60%,color-mix(in_srgb,var(--sf-accent)_22%,transparent),transparent_70%)]">
        {img && <Image src={img} alt={p.name} fill sizes="(min-width: 1024px) 18vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
        {tag && (
          <span className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: off > 0 ? "#ef4444" : "linear-gradient(90deg, var(--sf-accent), #8b5cf6)" }}>
            {tag}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-1 pt-3">
        {eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.15em] opacity-50" style={{ color: "var(--sf-ink)" }}>{eyebrow}</p>}
        <h3 className="line-clamp-2 text-sm !font-semibold !normal-case !leading-snug !tracking-normal" style={{ color: "var(--sf-ink)" }}>
          <Link href={`${storeBase}/products/${p.slug ?? p.id}`} className="after:absolute after:inset-0 after:rounded-2xl">{p.name}</Link>
        </h3>
        {rating && rating[1] > 0 && (
          <p className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: "var(--sf-ink)" }}>
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> <span className="font-semibold">{rating[0].toFixed(1)}</span>
            <span className="opacity-50">({rating[1]})</span>
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <span>
            <span className="block text-base font-bold sm:text-lg" style={{ color: "var(--sf-ink)" }}>{formatCurrency(p.price)}</span>
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

/** HH : MM : SS boxes counting down to midnight. */
export function FlashTimer() {
  const parts = hms(useUntilMidnight());
  return (
    <div role="timer" aria-label="Time left on flash deals" className="flex items-center gap-1.5">
      {parts.map((v, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="grid h-9 w-10 place-items-center rounded-lg font-mono text-base font-bold tabular-nums text-white" style={{ background: "linear-gradient(180deg, var(--sf-accent), color-mix(in srgb, var(--sf-accent) 60%, #000))", boxShadow: "0 0 18px -4px var(--sf-accent)" }}>
            {v}
          </span>
          {i < 2 && <span className="font-bold opacity-50" style={{ color: "var(--sf-ink)" }}>:</span>}
        </span>
      ))}
    </div>
  );
}

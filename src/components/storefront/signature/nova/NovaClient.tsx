"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import HeartButton from "@/components/storefront/HeartButton";
import { useStore } from "@/lib/store-context";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";
import { AddButton, useUntilMidnight } from "../shared";
import { hms, imageOf } from "../utils";

const offOf = (p: Product) => {
  const was = p.compare_price ?? p.comparePrice;
  return was && was > p.price ? Math.round((1 - p.price / was) * 100) : 0;
};

function Stars({ id }: { id: string }) {
  const { ratings } = useStore();
  const r = ratings[id];
  if (!r || r[1] === 0) return null;
  return (
    <p className="flex items-center gap-0.5 text-[11px]" style={{ color: "var(--sf-ink)" }} aria-label={`${r[0].toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }, (_, n) => (
        <Star key={n} className={`h-3 w-3 ${n < Math.round(r[0]) ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
      ))}
      <span className="ml-1 opacity-50">({r[1]})</span>
    </p>
  );
}

/** Soft grey photo tile, "New"/"-x%" tag, save heart, price, stars and a dark cart disc. */
export function NovaCard({ product: p, isNew }: { product: Product; isNew?: boolean }) {
  const { storeBase, storeSlug } = useStore();
  const img = imageOf(p);
  const off = offOf(p);
  const was = p.compare_price ?? p.comparePrice;
  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100 dark:bg-white/5">
        {img && <Image src={img} alt={p.name} fill sizes="(min-width: 1024px) 17vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
        {(off > 0 || isNew) && (
          <span className="absolute left-2.5 top-2.5 rounded-md px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: off > 0 ? "var(--sf-accent)" : "#111" }}>
            {off > 0 ? `-${off}%` : "New"}
          </span>
        )}
        <HeartButton product={p} storeSlug={storeSlug} className="absolute right-2.5 top-2.5" />
      </div>
      <h3 className="mt-3 line-clamp-1 text-sm ![font-family:var(--sf-font)] !font-semibold !normal-case !tracking-normal" style={{ color: "var(--sf-ink)" }}>
        <Link href={`${storeBase}/products/${p.slug ?? p.id}`} className="after:absolute after:inset-0 after:rounded-2xl">{p.name}</Link>
      </h3>
      <div className="mt-1 flex flex-1 items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color: "var(--sf-ink)" }}>
            {formatCurrency(p.price)}
            {off > 0 && <s className="ml-1.5 text-[11px] font-normal opacity-40">{formatCurrency(was!)}</s>}
          </p>
          <div className="mt-0.5">
            <Stars id={p.id} />
          </div>
        </div>
        <span className="relative z-10">
          <AddButton product={p} size="sm" variant="ink" />
        </span>
      </div>
    </article>
  );
}

/** Wide best-seller card: photo left, details and a full "Quick add" button right. */
export function BestCard({ product: p }: { product: Product }) {
  const { storeBase } = useStore();
  const img = imageOf(p);
  return (
    <article className="relative flex gap-4 rounded-2xl bg-zinc-50 p-3 ring-1 ring-black/[0.05] dark:bg-white/[0.05] dark:ring-white/10">
      <div className="relative aspect-square w-32 shrink-0 overflow-hidden rounded-xl bg-white sm:w-36 dark:bg-white/5">
        {img && <Image src={img} alt={p.name} fill sizes="144px" className="object-cover" />}
        <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-zinc-900">Bestseller</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-1">
        <h3 className="line-clamp-1 text-[15px] ![font-family:var(--sf-font)] !font-semibold !normal-case !tracking-normal" style={{ color: "var(--sf-ink)" }}>
          <Link href={`${storeBase}/products/${p.slug ?? p.id}`} className="after:absolute after:inset-0 after:rounded-2xl">{p.name}</Link>
        </h3>
        <p className="mt-0.5 text-[15px] font-bold" style={{ color: "var(--sf-ink)" }}>{formatCurrency(p.price)}</p>
        <div className="mt-1">
          <Stars id={p.id} />
        </div>
        {p.description && <p className="mt-1.5 line-clamp-2 text-xs opacity-60" style={{ color: "var(--sf-ink)" }}>{p.description}</p>}
        <div className="relative z-10 mt-auto pt-3">
          <AddButton product={p} variant="bar" />
        </div>
      </div>
    </article>
  );
}

/** Product chip that floats around the hero photo. */
export function FloatChip({ product: p, className = "", delay = 0 }: { product: Product; className?: string; delay?: number }) {
  const { storeBase } = useStore();
  const img = imageOf(p);
  return (
    <Link
      href={`${storeBase}/products/${p.slug ?? p.id}`}
      className={`absolute z-10 w-32 rounded-2xl bg-white p-2.5 text-zinc-900 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.04] transition-transform [animation:nova-float_6s_ease-in-out_infinite] hover:scale-105 motion-reduce:[animation:none] sm:w-36 ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <span className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">{img && <Image src={img} alt="" fill sizes="144px" className="object-cover" />}</span>
      <span className="mt-2 block truncate text-[11px] font-semibold">{p.name}</span>
      <span className="block text-[11px] font-bold" style={{ color: "var(--sf-accent-ink)" }}>{formatCurrency(p.price)}</span>
    </Link>
  );
}

/** Days-free countdown to midnight in frosted boxes. */
export function NovaClock() {
  const [h, m, s] = hms(useUntilMidnight());
  return (
    <div role="timer" aria-label="Time left on the flash sale" className="flex items-start gap-1.5 text-white">
      {[
        [h, "Hours"],
        [m, "Mins"],
        [s, "Secs"],
      ].map(([v, l], n) => (
        <span key={l} className="flex items-start gap-1.5">
          <span className="text-center">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/20 text-xl font-bold tabular-nums backdrop-blur">{v}</span>
            <span className="mt-1 block text-[10px] font-medium text-white/75">{l}</span>
          </span>
          {n < 2 && <span className="pt-2.5 text-xl font-bold text-white/70">:</span>}
        </span>
      ))}
    </div>
  );
}

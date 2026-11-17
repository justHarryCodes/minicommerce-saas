"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import HeartButton from "@/components/storefront/HeartButton";
import { useStore } from "@/lib/store-context";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";
import { AddButton } from "../shared";
import { imageOf } from "../utils";

/** Skincare card: photo on a soft tint, square tag, serif name, stars, price, add + save. */
export function DewCard({ product: p, tag }: { product: Product; tag?: string }) {
  const { storeBase, storeSlug, ratings } = useStore();
  const img = imageOf(p);
  const was = p.compare_price ?? p.comparePrice;
  const off = was && was > p.price ? Math.round((1 - p.price / was) * 100) : 0;
  const label = off > 0 ? "Sale" : tag;
  const r = ratings[p.id];
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.05] transition-shadow hover:shadow-[0_20px_44px_-28px_rgba(15,110,99,0.55)] dark:bg-white/[0.05] dark:ring-white/10">
      <div className="relative aspect-[4/3.6] overflow-hidden" style={{ backgroundColor: "color-mix(in srgb, var(--sf-accent) 8%, white)" }}>
        {img && <Image src={img} alt={p.name} fill sizes="(min-width: 1024px) 22vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
        {label && (
          <span className="absolute left-3 top-3 rounded px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white" style={{ backgroundColor: "var(--sf-accent)" }}>
            {label}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="line-clamp-2 text-[17px] !normal-case !leading-snug" style={{ color: "var(--sf-ink)" }}>
          <Link href={`${storeBase}/products/${p.slug ?? p.id}`} className="after:absolute after:inset-0">{p.name}</Link>
        </h3>
        {r && r[1] > 0 && (
          <p className="mt-1.5 flex items-center gap-0.5 text-[11px]" style={{ color: "var(--sf-ink)" }} aria-label={`${r[0].toFixed(1)} out of 5`}>
            {Array.from({ length: 5 }, (_, n) => (
              <Star key={n} className={`h-3 w-3 ${n < Math.round(r[0]) ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
            ))}
            <span className="ml-1 opacity-50">({r[1]})</span>
          </p>
        )}
        <p className="mt-1.5 text-[15px] font-semibold" style={{ color: "var(--sf-ink)" }}>
          {formatCurrency(p.price)}
          {off > 0 && <s className="ml-2 text-xs font-normal opacity-40">{formatCurrency(was!)}</s>}
        </p>
        <div className="relative z-10 mt-auto flex items-center gap-2 pt-3.5">
          <div className="min-w-0 flex-1 [&>*]:!rounded-full [&>*]:!px-2 [&>*]:!py-2 [&>*]:!text-[10px] [&>*]:uppercase [&>*]:tracking-[0.06em] [&>*]:whitespace-nowrap max-sm:[&_svg]:hidden sm:[&>*]:!text-[11px] sm:[&>*]:tracking-[0.12em]">
            <AddButton product={p} variant="bar" />
          </div>
          <HeartButton product={p} storeSlug={storeSlug} className="!shadow-none ring-1 ring-black/10 dark:ring-white/15" />
        </div>
      </div>
    </article>
  );
}

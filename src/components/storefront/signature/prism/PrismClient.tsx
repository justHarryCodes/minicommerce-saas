"use client";

import Image from "next/image";
import Link from "next/link";
import { useStore } from "@/lib/store-context";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";
import { AddButton } from "../shared";
import { imageOf } from "../utils";

/** Card on a soft wash of one of the block colours; the photo sits as an inset tile. */
export function PrismCard({ product: p, color, tag }: { product: Product; color: string; tag?: string }) {
  const { storeBase } = useStore();
  const img = imageOf(p);
  const was = p.compare_price ?? p.comparePrice;
  const off = was && was > p.price ? Math.round((1 - p.price / was) * 100) : 0;
  const label = off > 0 ? `-${off}%` : tag;
  return (
    <article className="group relative flex h-full flex-col rounded-3xl p-2.5 transition-transform duration-300 hover:-translate-y-1" style={{ backgroundColor: `color-mix(in srgb, ${color} 13%, var(--sf-page))` }}>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-white dark:bg-white/5">
        {img && <Image src={img} alt={p.name} fill sizes="(min-width: 1024px) 22vw, 50vw" className="object-cover transition-transform duration-500 group-hover:rotate-[-2deg] group-hover:scale-105" />}
        {label && (
          <span className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold text-white" style={{ backgroundColor: off > 0 ? "var(--sf-accent)" : color }}>
            {label}
          </span>
        )}
      </div>
      <div className="flex flex-1 items-end justify-between gap-2 px-1.5 pb-1 pt-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm sm:line-clamp-1 !font-semibold !normal-case !tracking-normal" style={{ color: "var(--sf-ink)" }}>
            <Link href={`${storeBase}/products/${p.slug ?? p.id}`} className="after:absolute after:inset-0 after:rounded-3xl">{p.name}</Link>
          </h3>
          <p className="mt-0.5 text-[15px] font-bold" style={{ color: "var(--sf-ink)" }}>
            {formatCurrency(p.price)}
            {off > 0 && <s className="block text-[11px] font-normal opacity-40 sm:ml-1.5 sm:inline">{formatCurrency(was!)}</s>}
          </p>
        </div>
        <span className="relative z-10">
          <AddButton product={p} size="sm" />
        </span>
      </div>
    </article>
  );
}

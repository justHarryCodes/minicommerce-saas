"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useStore } from "@/lib/store-context";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";
import { AddButton, useUntilMidnight } from "../shared";
import { hms, imageOf } from "../utils";

export { AddButton };

// Interactive pieces of the Ember homepage: the tabbed menu and the deal countdown.

/** The full menu, one tab per category. */
export function MenuTabs({ tabs, products }: { tabs: { id: string; name: string }[]; products: Product[] }) {
  const { storeBase } = useStore();
  const [active, setActive] = useState<string>("all");
  const shown = active === "all" ? products : products.filter((p) => p.category_id === active);
  const all = [{ id: "all", name: "All" }, ...tabs.filter((t) => products.some((p) => p.category_id === t.id))];

  return (
    <div>
      <div role="tablist" aria-label="Menu categories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:flex-wrap lg:px-0">
        {all.map((t) => {
          const on = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(t.id)}
              className="shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors"
              style={
                on
                  ? { backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)", borderColor: "transparent" }
                  : { borderColor: "color-mix(in srgb, var(--sf-ink) 14%, transparent)", color: "var(--sf-ink)" }
              }
            >
              {t.name}
            </button>
          );
        })}
      </div>

      <ul className="mt-8 grid gap-x-10 gap-y-2 md:grid-cols-2">
        {shown.map((p) => {
          const img = imageOf(p);
          const was = p.compare_price ?? p.comparePrice;
          return (
            <li key={p.id} className="ember-pop flex min-w-0 items-center gap-3 rounded-2xl pr-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--sf-ink)_6%,transparent)]">
              <Link href={`${storeBase}/products/${p.slug ?? p.id}`} className="group flex min-w-0 flex-1 items-center gap-4 p-2.5">
                <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--sf-ink)_8%,transparent)]">
                  {img && <Image src={img} alt={p.name} fill sizes="80px" className="object-cover transition-transform duration-500 group-hover:scale-110" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-[15px] font-semibold" style={{ color: "var(--sf-ink)" }}>{p.name}</span>
                    <span aria-hidden className="mb-1 hidden flex-1 border-b border-dotted opacity-30 sm:block" style={{ borderColor: "var(--sf-ink)" }} />
                    <span className="shrink-0 text-[15px] font-bold" style={{ color: "var(--sf-accent-ink)" }}>{formatCurrency(p.price)}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-1 text-[13px] opacity-60" style={{ color: "var(--sf-ink)" }}>
                    {was && was > p.price ? <s className="mr-1.5">{formatCurrency(was)}</s> : null}
                    {(p.short_description ?? p.shortDescription ?? "").replace(/<[^>]*>/g, " ")}
                  </span>
                </span>
              </Link>
              <AddButton product={p} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Counts down to midnight (local time): "the deal ends tonight". */
export function Countdown() {
  const parts = hms(useUntilMidnight());
  return (
    <div className="flex items-center gap-2" aria-label="Time left on this deal" role="timer">
      {parts.map((v, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="sf-display grid h-14 w-14 place-items-center rounded-xl bg-black/30 text-3xl tabular-nums text-white backdrop-blur">{v}</span>
          {i < 2 && <span className="text-2xl font-bold text-white/70">:</span>}
        </span>
      ))}
    </div>
  );
}

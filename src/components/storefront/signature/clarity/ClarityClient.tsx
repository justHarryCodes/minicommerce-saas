"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";
import { AddButton, useUntilMidnight } from "../shared";
import { hms, imageOf } from "../utils";

// Interactive pieces of the Clarity homepage: the sliding hero banner, the
// shop card and the deal countdown.

export interface Slide {
  eyebrow: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  image: string;
}

/** Main hero banner: slides every 5s (paused on hover / focus), dots to jump. */
export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  return (
    <div
      className="relative h-full min-h-[480px] overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#eef3ff,#dfe8ff)] dark:bg-[linear-gradient(120deg,#101a33,#0b1224)] sm:min-h-[420px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {slides.map((s, n) => (
        <div
          key={n}
          aria-hidden={n !== i}
          className={`absolute inset-0 grid grid-cols-1 content-between transition-all sm:content-normal sm:items-center duration-700 sm:grid-cols-[1fr_1fr] ${n === i ? "opacity-100" : "pointer-events-none translate-x-6 opacity-0"}`}
        >
          <div className="relative z-10 p-6 sm:p-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--sf-accent-ink)" }}>{s.eyebrow}</p>
            {n === 0 ? (
              <h1 className="mt-2 text-3xl !leading-[1.08] sm:text-5xl" style={{ color: "var(--sf-ink)" }}>{s.title}</h1>
            ) : (
              <p className="sf-display mt-2 text-3xl !leading-[1.08] sm:text-5xl" style={{ color: "var(--sf-ink)" }}>{s.title}</p>
            )}
            <p className="mt-3 line-clamp-2 max-w-sm text-sm opacity-65 sm:text-base" style={{ color: "var(--sf-ink)" }}>{s.text}</p>
            <Link href={s.href} tabIndex={n === i ? undefined : -1} className="sf-btn mt-6 px-6 py-3 text-sm" style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
              {s.cta} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {/* Phones: photo under the text. Wider screens: photo on the right. */}
          <div className="relative h-48 w-full self-end sm:h-full">
            <Image src={s.image} alt="" fill priority={n === 0} sizes="(min-width: 1024px) 30vw, 100vw" className="object-cover [mask-image:linear-gradient(to_bottom,transparent,black_30%)] sm:[mask-image:linear-gradient(to_right,transparent,black_35%)]" />
          </div>
        </div>
      ))}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-6 z-20 flex gap-1.5 sm:left-10">
          {slides.map((_, n) => (
            <button
              key={n}
              type="button"
              aria-label={`Show slide ${n + 1}`}
              aria-current={n === i}
              onClick={() => setI(n)}
              className="h-2 rounded-full transition-all"
              style={{ width: n === i ? 24 : 8, backgroundColor: n === i ? "var(--sf-accent)" : "color-mix(in srgb, var(--sf-ink) 25%, transparent)" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** White product card with stars and a full-width "Add to cart". */
export function ShopCard({ product: p, badge }: { product: Product; badge?: string }) {
  const { storeBase, ratings } = useStore();
  const img = imageOf(p);
  const was = p.compare_price ?? p.comparePrice;
  const off = was && was > p.price ? Math.round((1 - p.price / was) * 100) : 0;
  const rating = ratings[p.id];
  const tag = off > 0 ? `-${off}%` : badge;
  return (
    <article className="group relative flex h-full flex-col rounded-xl bg-white p-3 ring-1 ring-black/[0.06] transition-shadow hover:shadow-[0_14px_34px_-18px_rgba(37,99,235,0.45)] dark:bg-white/[0.05] dark:ring-white/10">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-[#f4f6fa] dark:bg-white/5">
        {img && <Image src={img} alt={p.name} fill sizes="(min-width: 1024px) 18vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
        {tag && (
          <span className={`absolute left-2 top-2 rounded px-2 py-0.5 text-[10px] font-bold uppercase text-white ${off > 0 ? "bg-rose-500" : ""}`} style={off > 0 ? undefined : { backgroundColor: "var(--sf-accent)" }}>
            {tag}
          </span>
        )}
      </div>
      <h3 className="mt-3 line-clamp-2 text-[13px] !font-semibold !normal-case !leading-snug !tracking-normal sm:text-sm" style={{ color: "var(--sf-ink)" }}>
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
      <p className="mt-auto pt-2">
        <span className="text-base font-extrabold" style={{ color: "var(--sf-ink)" }}>{formatCurrency(p.price)}</span>
        {off > 0 && <s className="ml-1.5 text-xs opacity-40" style={{ color: "var(--sf-ink)" }}>{formatCurrency(was!)}</s>}
      </p>
      <div className="relative z-10 mt-2.5">
        <AddButton product={p} variant="bar" />
      </div>
    </article>
  );
}

/** HRS / MINS / SECS boxes on the navy band. */
export function DealClock() {
  const [h, m, s] = hms(useUntilMidnight());
  return (
    <div role="timer" aria-label="Time left on these deals" className="flex items-start gap-2 text-white">
      {[
        [h, "Hrs"],
        [m, "Mins"],
        [s, "Secs"],
      ].map(([v, l], n) => (
        <span key={l} className="flex items-start gap-2">
          <span className="text-center">
            <span className="block text-4xl font-extrabold tabular-nums sm:text-5xl">{v}</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">{l}</span>
          </span>
          {n < 2 && <span className="text-3xl font-bold text-white/40 sm:text-4xl">:</span>}
        </span>
      ))}
    </div>
  );
}

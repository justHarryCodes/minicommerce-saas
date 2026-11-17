// Pulse: a Signature sports & fitness theme. A dark full-bleed hero with
// heavy italic type and a hand-tilted motto, numbered section headings,
// round category badges, a flash-sale countdown beside a "new arrivals"
// banner, a "why shop with us" row, "train your way" category cards and a
// "join the squad" band.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Dumbbell, HeartPulse, MessageCircle, Trophy, Zap } from "lucide-react";
import { HIGHLIGHT_ICON } from "@/components/storefront/ThemeSections";
import type { SectionId } from "@/lib/themes/types";
import type { Product } from "@/types";
import type { StorefrontHomeProps } from "../../StorefrontHome";
import { imageOf } from "../utils";
import { FlashClock, PulseCard } from "./PulseClient";

const DARK = "#0b0b0d";
const offOf = (p: Product) => {
  const was = p.compare_price ?? p.comparePrice;
  return was && was > p.price ? Math.round((1 - p.price / was) * 100) : 0;
};
const HEAVY = "italic !font-black !uppercase !tracking-tight";

/** "More than fitness. A better you." → "More than" / "FITNESS" (red, big) / "A better you". */
function Title({ text }: { text: string }) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const first = (sentences[0] ?? text).replace(/[.!?]$/, "").split(/\s+/);
  const lead = first.slice(0, -1).join(" ");
  const hot = first[first.length - 1];
  const rest = sentences.slice(1).join(" ").replace(/[.!?]$/, "");
  return (
    <>
      {lead && <span className="block">{lead}</span>}
      <span className="block pr-2 text-[1.35em] !leading-[0.9]" style={{ color: "var(--sf-accent)" }}>{hot}</span>
      {rest && <span className="block">{rest}</span>}
    </>
  );
}

/** Numbered heading: a slanted red tab counts sections automatically (CSS counter). */
function Heading({ title, sub, href }: { title: string; sub?: string; href?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-9 w-11 shrink-0 -skew-x-12 place-items-center text-sm font-black italic text-white [counter-increment:pulse] before:content-[counter(pulse,decimal-leading-zero)]"
          style={{ backgroundColor: "var(--sf-accent)" }}
        />
        <div>
          <h2 className={`text-xl sm:text-2xl ${HEAVY}`} style={{ color: "var(--sf-ink)" }}>{title}</h2>
          {sub && <p className="text-xs opacity-55" style={{ color: "var(--sf-ink)" }}>{sub}</p>}
        </div>
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-wide" style={{ color: "var(--sf-accent-ink)" }}>
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

const fill = (n: number, per: number) => (n >= per * 2 ? per * 2 : n >= per ? per : n);

export default function PulseHome(props: StorefrontHomeProps) {
  const { store, theme, storeBase, products, categoryTiles, testimonials } = props;
  const homeHref = storeBase || "/";
  const copy = theme.copy;
  const featured = props.featuredProducts.length > 0 ? props.featuredProducts : products.slice(0, 10);
  const banners = store.banner_images ?? [];
  const heroImage = banners[0] ?? imageOf(featured[0]);
  const tiles = categoryTiles.filter((c) => c.product_count > 0);
  const featuredIds = new Set(featured.map((p) => p.id));
  const others = products.filter((p) => !featuredIds.has(p.id));
  const bestSellers = (others.length >= 4 ? others : products).slice(0, 10);
  const discounted = products.filter((p) => offOf(p) > 0).sort((a, b) => offOf(b) - offOf(a));
  const maxOff = discounted.length ? offOf(discounted[0]) : 0;
  const flashImage = banners[1] ?? imageOf(discounted[0] ?? featured[1]);
  const newest = [...products].sort((a, b) => +new Date(String(b.created_at)) - +new Date(String(a.created_at)));
  const arrivalsImage = banners[2] ?? imageOf(newest[0]);
  const whatsappHref = store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}` : props.demoContact ? "#" : null;
  const ext = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {});

  const sections: Partial<Record<SectionId, React.ReactNode>> = {
    /* ─────────────── Full-bleed hero ─────────────── */
    hero: (
      <section className="relative isolate overflow-hidden text-white" style={{ backgroundColor: DARK }}>
        {heroImage && (
          <div className="absolute inset-y-0 right-0 -z-10 w-full lg:w-[72%]">
            <Image src={heroImage} alt="" fill priority sizes="(min-width: 1024px) 72vw, 100vw" className="sf-hero-zoom object-cover object-[60%_30%] opacity-55 lg:opacity-100 lg:[mask-image:linear-gradient(to_right,transparent,black_40%)]" />
          </div>
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/20 to-transparent lg:hidden" />
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="sf-hero-in relative max-w-2xl py-14 sm:py-20 lg:py-24">
            {copy.heroEyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/80">{copy.heroEyebrow}</p>}
            <h1 className={`mt-4 text-5xl !leading-[0.95] sm:text-6xl lg:text-7xl ${HEAVY}`}>
              <Title text={copy.heroTitle || store.name} />
            </h1>
            <p className="mt-5 max-w-md text-[15px] text-white/80">{copy.heroSubtitle || store.description}</p>
            <a href="#shop" className="sf-btn mt-7 px-7 py-3.5 text-sm font-black uppercase italic tracking-wide text-white" style={{ backgroundColor: "var(--sf-accent)" }}>
              <span className="inline-flex items-center gap-2">
                {copy.heroCta || "Shop now"} <ArrowRight className="h-4 w-4" />
              </span>
            </a>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[13px] font-semibold text-white/85">
              {[
                [Dumbbell, "Train harder"],
                [HeartPulse, "Live healthier"],
                [Zap, "Be stronger"],
              ].map(([Icon, label]) => {
                const I = Icon as typeof Dumbbell;
                return (
                  <li key={label as string} className="flex items-center gap-2">
                    <I className="h-4 w-4" style={{ color: "var(--sf-accent)" }} /> {label as string}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <p aria-hidden className={`pointer-events-none absolute bottom-16 right-8 hidden -rotate-[8deg] text-right text-5xl !leading-[0.95] text-white/85 xl:block ${HEAVY}`}>
          Good sweat
          <br />
          great things
          <span className="mt-2 block h-1.5 w-40 -skew-x-12 rounded-sm ml-auto" style={{ backgroundColor: "var(--sf-accent)" }} />
        </p>
      </section>
    ),

    /* ─────────────── Round category badges ─────────────── */
    categories: tiles.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.categoriesTitle} href="#shop" />
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:justify-between lg:px-0">
          {tiles.slice(0, 10).map((c) => (
            <Link key={c.id} href={`${homeHref}?category=${c.slug}`} className="group flex w-24 shrink-0 flex-col items-center text-center sm:w-28">
              <span className="relative block h-20 w-20 overflow-hidden rounded-full bg-white ring-2 ring-black/[0.06] transition-all group-hover:ring-[3px] group-hover:ring-[var(--sf-accent)] dark:bg-white/5 dark:ring-white/10 sm:h-24 sm:w-24">
                {c.cover_image && <Image src={c.cover_image} alt="" fill sizes="96px" className="object-cover transition-transform duration-500 group-hover:scale-110" />}
              </span>
              <span className="mt-2.5 text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--sf-ink)" }}>{c.name}</span>
              <span className="text-[11px] font-semibold" style={{ color: "var(--sf-accent-ink)" }}>{c.product_count} {c.product_count === 1 ? "item" : "items"}</span>
            </Link>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Featured ─────────────── */
    featured: featured.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.featuredTitle} sub="Top picks to power your fitness journey." href="#shop" />
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
          {featured.slice(0, fill(featured.length, 5)).map((p, i, shown) => (
            // An odd count leaves one card alone on two-column screens; hide it there.
            <div key={p.id} className={shown.length % 2 === 1 && i === shown.length - 1 && shown.length > 1 ? "max-lg:hidden" : ""}>
              <PulseCard product={p} badge={i === 0 ? "Bestseller" : undefined} />
            </div>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Flash sale + new arrivals ─────────────── */
    promo: (
      <section className="grid gap-3 px-4 md:grid-cols-2 lg:px-8">
        {maxOff > 0 && (
          <a href="#shop" className="group relative isolate flex min-h-[250px] overflow-hidden rounded-md p-6 text-white sm:p-8" style={{ backgroundColor: "var(--sf-accent)" }}>
            {flashImage && (
              <div className="absolute inset-y-0 right-0 -z-10 w-[58%]">
                <Image src={flashImage} alt="" fill sizes="(min-width: 768px) 28vw, 58vw" className="object-cover transition-transform duration-700 [mask-image:linear-gradient(to_right,transparent,black_40%)] group-hover:scale-105" />
              </div>
            )}
            <div className="flex max-w-[78%] flex-col sm:max-w-[62%]">
              <p className={`flex items-center gap-1.5 text-lg ${HEAVY}`}>
                <Zap className="h-5 w-5 fill-current" /> {copy.promoEyebrow || "Flash sale"}
              </p>
              <p className={`mt-2 text-xl !leading-none ${HEAVY}`}>Up to</p>
              <p className={`text-6xl !leading-[0.9] sm:text-7xl ${HEAVY}`}>{maxOff}% off</p>
              <p className="mt-2 text-sm text-white/85">{copy.promoText || copy.promoTitle}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="sf-btn bg-zinc-950 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white">
                  {copy.promoCta || "Shop the deals"}
                </span>
                <FlashClock />
              </div>
            </div>
          </a>
        )}
        <a href="#drops" className={`group relative isolate flex min-h-[250px] overflow-hidden rounded-md p-6 text-white sm:p-8 ${maxOff > 0 ? "" : "md:col-span-2"}`} style={{ backgroundColor: DARK }}>
          {arrivalsImage && (
            <div className="absolute inset-0 -z-10">
              <Image src={arrivalsImage} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover opacity-55 transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
            </div>
          )}
          <div className="flex max-w-[70%] flex-col justify-center">
            <h2 className={`text-4xl !leading-[0.95] sm:text-5xl ${HEAVY}`}>New arrivals</h2>
            <p className="mt-2 text-sm text-white/75">Fresh gear for a stronger tomorrow.</p>
            <span className="sf-btn mt-5 w-fit bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-950">
              Shop new <ArrowRight className="h-4 w-4" />
            </span>
          </div>
          <p aria-hidden className={`absolute bottom-6 right-6 hidden -rotate-[8deg] text-right text-3xl !leading-[0.95] text-white/70 sm:block ${HEAVY}`}>
            Gear higher
            <br />
            go further
          </p>
        </a>
      </section>
    ),

    /* ─────────────── Best sellers rail ─────────────── */
    newArrivals: bestSellers.length >= 4 && (
      <section id="drops" className="scroll-mt-28 px-4 lg:px-8">
        <Heading title={copy.newArrivalsTitle || "Best sellers"} sub="Loved by athletes. Trusted by thousands." href="#shop" />
        <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0">
          {bestSellers.map((p) => (
            <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-[19.2%]">
              <PulseCard product={p} />
            </div>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Why shop with us ─────────────── */
    highlights: copy.highlights.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={`Why shop with ${store.name}?`} />
        <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {copy.highlights.map((h) => {
            const Icon = HIGHLIGHT_ICON[h.icon];
            return (
              <li key={h.title} className="flex flex-col items-center rounded-md bg-white px-4 py-6 text-center ring-1 ring-black/[0.06] dark:bg-white/[0.05] dark:ring-white/10">
                <span style={{ color: "var(--sf-accent-ink)" }}>
                  <Icon className="h-8 w-8" />
                </span>
                <span className="mt-3 text-[12px] font-black uppercase tracking-wide" style={{ color: "var(--sf-ink)" }}>{h.title}</span>
                <span className="mt-1 text-[12px] opacity-60" style={{ color: "var(--sf-ink)" }}>{h.text}</span>
              </li>
            );
          })}
        </ul>
      </section>
    ),

    /* ─────────────── Train your way (category cards) ─────────────── */
    categoryRails: tiles.length >= 2 && (
      <section className="px-4 lg:px-8">
        <Heading title="Train your way" sub="Everything you need for every kind of workout." />
        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0">
          {tiles.slice(0, 4).map((c) => (
            <Link key={c.id} href={`${homeHref}?category=${c.slug}`} className="group relative isolate flex aspect-[4/3] w-[72%] shrink-0 flex-col justify-end overflow-hidden rounded-md p-5 text-white sm:w-[45%] lg:w-auto" style={{ backgroundColor: DARK }}>
              {c.cover_image && <Image src={c.cover_image} alt="" fill sizes="(min-width: 1024px) 24vw, 72vw" className="-z-10 object-cover opacity-70 transition-transform duration-700 group-hover:scale-110" />}
              <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <span className={`text-2xl !leading-none ${HEAVY}`}>{c.name}</span>
              <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-white/80">
                {c.product_count} {c.product_count === 1 ? "item" : "items"} · Shop now <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── All ─────────────── */
    allProducts: products.length > 0 && (
      <section id="shop" className="scroll-mt-28 px-4 lg:px-8">
        <Heading title={copy.allProductsTitle} />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((p) => (
            <PulseCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Reviews ─────────────── */
    testimonials: testimonials.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.testimonialsTitle} sub="Real people. Real progress." />
        <div className="grid gap-2.5 md:grid-cols-3">
          {testimonials.slice(0, 3).map((t) => (
            <figure key={t.id} className="flex gap-4 rounded-md bg-white p-5 ring-1 ring-black/[0.06] dark:bg-white/[0.05] dark:ring-white/10">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-black italic text-white" style={{ backgroundColor: DARK }}>
                {t.customer_name.trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-sm tracking-wider" style={{ color: "var(--sf-accent)" }}>{"★".repeat(Math.max(1, Math.min(5, t.rating)))}</p>
                <blockquote className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--sf-ink)" }}>“{t.body}”</blockquote>
                <figcaption className="mt-2 flex items-center gap-1.5 text-xs font-bold" style={{ color: "var(--sf-ink)" }}>
                  {t.customer_name}
                  <span className="inline-flex items-center gap-0.5 font-medium text-emerald-600">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified buyer
                  </span>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Join the squad ─────────────── */
    ctaBand: (
      <section className="px-4 lg:px-8">
        <div className="flex flex-col gap-5 rounded-md px-6 py-7 text-white lg:flex-row lg:items-center lg:justify-between lg:px-8" style={{ backgroundColor: DARK }}>
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full" style={{ backgroundColor: "var(--sf-accent)" }}>
              <Trophy className="h-7 w-7" />
            </span>
            <div>
              <h2 className={`text-3xl !leading-none ${HEAVY}`}>{copy.ctaTitle || "Join the squad"}</h2>
              {copy.ctaText && <p className="mt-1 max-w-md text-[13px] text-white/70">{copy.ctaText}</p>}
            </div>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white/85">
            {["Early access to sales", "Training tips", "New gear first"].map((perk) => (
              <li key={perk} className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 fill-current" style={{ color: "var(--sf-accent)" }} /> {perk}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2.5">
            {whatsappHref ? (
              <a href={whatsappHref} {...ext(whatsappHref)} className="sf-btn px-6 py-3 text-xs font-black uppercase italic tracking-wider text-white" style={{ backgroundColor: "var(--sf-accent)" }}>
                <span className="inline-flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" /> Join now
                </span>
              </a>
            ) : (
              <a href="#shop" className="sf-btn px-6 py-3 text-xs font-black uppercase italic tracking-wider text-white" style={{ backgroundColor: "var(--sf-accent)" }}>
                <span className="inline-flex items-center gap-2">
                  {copy.heroCta || "Shop now"} <ArrowRight className="h-4 w-4" />
                </span>
              </a>
            )}
          </div>
        </div>
      </section>
    ),
  };

  return (
    <div className="pb-4 [counter-reset:pulse]">
      {theme.layout.sections.map((id, i) =>
        sections[id] ? (
          id === "hero" ? (
            <div key={id} className={i === 0 ? "" : "sf-section"}>
              {sections[id]}
            </div>
          ) : (
            <div key={id} className="sf-section mx-auto max-w-7xl">
              {sections[id]}
            </div>
          )
        ) : null,
      )}
    </div>
  );
}

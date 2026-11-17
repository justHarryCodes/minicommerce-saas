// Blitz: a Signature e-commerce theme for deal-driven stores. Cream page,
// deep purple and electric lime: a headline with a lime highlight over a
// collage of discounted products, pastel category tiles, a purple daily-deals
// band with a countdown, limited drops ("only N left") on a dark band and a
// "never miss a deal" call. Deals and drops come from real data: discounted
// products and low stock.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Flame, MessageCircle, Rocket, Star, Zap } from "lucide-react";
import { HIGHLIGHT_ICON } from "@/components/storefront/ThemeSections";
import { formatCurrency } from "@/lib/utils";
import type { SectionId } from "@/lib/themes/types";
import type { Product } from "@/types";
import type { StorefrontHomeProps } from "../../StorefrontHome";
import { DealClock, ShopCard } from "../clarity/ClarityClient";
import { imageOf } from "../utils";

const LIME = "#c6f432";
const INK = "#16112a";
const TILE_TINTS = ["#ede4ff", "#e0f2fe", "#dcfce7", "#ffe4ec", "#fef3c7", "#ecfccb", "#e0e7ff", "#fae8ff"];

const offOf = (p: Product) => {
  const was = p.compare_price ?? p.comparePrice;
  return was && was > p.price ? Math.round((1 - p.price / was) * 100) : 0;
};
const stockOf = (p: Product) => Number(p.stock_quantity ?? p.stockQuantity ?? 0);

/** "Great finds. Better prices." -> second sentence on a lime highlight; else the last word. */
function Title({ text }: { text: string }) {
  const hi = (t: string) => (
    <span className="relative inline-block">
      <span aria-hidden className="absolute -inset-x-2 bottom-[0.06em] top-[0.18em] -z-10 -rotate-1 rounded-md" style={{ backgroundColor: LIME }} />
      {t}
    </span>
  );
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 1)
    return (
      <>
        {sentences[0]}
        <br />
        {hi(sentences.slice(1).join(" "))}
      </>
    );
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return hi(text);
  return (
    <>
      {words.slice(0, -1).join(" ")} {hi(words[words.length - 1])}
    </>
  );
}

function Heading({ title, sub, href, icon: Icon }: { title: string; sub?: string; href?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ backgroundColor: "var(--sf-accent)" }}>
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div>
          <h2 className="text-xl sm:text-2xl" style={{ color: "var(--sf-ink)" }}>{title}</h2>
          {sub && <p className="text-xs opacity-55" style={{ color: "var(--sf-ink)" }}>{sub}</p>}
        </div>
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold" style={{ color: "var(--sf-accent-ink)" }}>
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

const rows = (n: number, per: number) => (n >= per * 2 ? per * 2 : n >= per ? per : n);

export default function BlitzHome(props: StorefrontHomeProps) {
  const { store, theme, storeBase, products, categoryTiles, testimonials } = props;
  const homeHref = storeBase || "/";
  const copy = theme.copy;
  const featured = props.featuredProducts.length > 0 ? props.featuredProducts : products.slice(0, 8);
  const tiles = categoryTiles.filter((c) => c.product_count > 0);
  const byNewest = [...products].sort((a, b) => +new Date(String(b.created_at)) - +new Date(String(a.created_at)));
  // Deals: biggest discounts first, topped up with the newest products
  const discounted = products.filter((p) => offOf(p) > 0).sort((a, b) => offOf(b) - offOf(a));
  const deals = [...discounted, ...byNewest.filter((p) => !discounted.includes(p))].slice(0, 4);
  // Limited drops: low stock (but not sold out)
  const drops = products.filter((p) => stockOf(p) > 0 && stockOf(p) <= 10).sort((a, b) => stockOf(a) - stockOf(b)).slice(0, 4);
  const collage = (discounted.length >= 3 ? discounted : [...discounted, ...featured.filter((p) => !discounted.includes(p))]).filter((p) => imageOf(p)).slice(0, 4);
  const maxOff = discounted.length ? offOf(discounted[0]) : 0;
  const productHref = (p: { slug?: string; id: string }) => `${storeBase}/products/${p.slug ?? p.id}`;
  const whatsappHref = store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}` : props.demoContact ? "#" : null;
  const ext = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {});

  // Collage positions (desktop): tilted cards around a centre
  const SPOTS = [
    "left-[4%] top-[6%] w-[44%] -rotate-6",
    "right-[2%] top-[0%] w-[40%] rotate-6",
    "left-[18%] bottom-[2%] w-[38%] rotate-3",
    "right-[8%] bottom-[8%] w-[34%] -rotate-3",
  ];

  const sections: Partial<Record<SectionId, React.ReactNode>> = {
    /* ─────────────── Hero ─────────────── */
    hero: (
      <section className="relative isolate overflow-hidden px-4 pb-10 pt-8 lg:px-8 lg:pb-14 lg:pt-12">
        {/* confetti */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          {[["8%", "18%", LIME], ["46%", "8%", "var(--sf-accent)"], ["92%", "30%", LIME], ["58%", "86%", "var(--sf-accent)"], ["30%", "72%", LIME], ["80%", "64%", "var(--sf-accent)"]].map(([l, t, c], i) => (
            <span key={i} className="absolute h-3 w-3 rounded-sm opacity-70" style={{ left: l, top: t, backgroundColor: c, transform: `rotate(${i * 27}deg)` }} />
          ))}
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
          <div className="sf-hero-in">
            <h1 className="text-[2.6rem] !leading-[1.02] sm:text-6xl lg:text-7xl" style={{ color: INK, fontWeight: 900 }}>
              <Title text={copy.heroTitle || store.name} />
            </h1>
            <p className="mt-4 text-lg font-semibold" style={{ color: INK }}>{copy.heroEyebrow}</p>
            <p className="mt-1 max-w-md text-[15px] text-zinc-600">{copy.heroSubtitle || store.description}</p>
            {copy.highlights.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {copy.highlights.slice(0, 3).map((h) => {
                  const Icon = HIGHLIGHT_ICON[h.icon];
                  return (
                    <li key={h.title} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: "#ecfccb", color: "#3f6212" }}>
                      <Icon className="h-3.5 w-3.5" /> {h.title}
                    </li>
                  );
                })}
              </ul>
            )}
            <a href="#deals" className="sf-btn mt-7 px-7 py-4 text-base text-white" style={{ backgroundColor: "var(--sf-accent)", boxShadow: "0 16px 34px -14px var(--sf-accent)" }}>
              {copy.heroCta || "Shop deals"} <ArrowRight className="h-5 w-5" />
            </a>
          </div>

          {collage.length > 0 && (
            <div className="relative mx-auto aspect-[5/4] w-full max-w-[560px]">
              <div aria-hidden className="absolute inset-[10%] rounded-full blur-3xl" style={{ backgroundColor: "color-mix(in srgb, var(--sf-accent) 22%, transparent)" }} />
              {collage.map((p, i) => {
                const off = offOf(p);
                return (
                  <Link key={p.id} href={productHref(p)} className={`absolute block overflow-hidden rounded-3xl bg-white p-2 shadow-[0_24px_50px_-24px_rgba(40,20,90,0.45)] transition-transform hover:z-10 hover:scale-105 ${SPOTS[i]}`}>
                    <span className="relative block aspect-square overflow-hidden rounded-2xl">
                      <Image src={imageOf(p)!} alt={p.name} fill priority={i === 0} sizes="(min-width: 1024px) 240px, 45vw" className="object-cover" />
                    </span>
                    <span
                      className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-black shadow"
                      style={off > 0 ? { backgroundColor: LIME, color: INK } : { backgroundColor: "var(--sf-accent)", color: "#fff" }}
                    >
                      {off > 0 ? `-${off}%` : formatCurrency(p.price)}
                    </span>
                  </Link>
                );
              })}
              {maxOff > 0 && (
                <span className="absolute -left-1 top-1/2 z-10 grid h-24 w-24 -translate-y-1/2 -rotate-12 place-items-center rounded-full text-center text-white shadow-xl sm:-left-4" style={{ backgroundColor: "var(--sf-accent)" }}>
                  <span className="text-[11px] font-bold leading-tight">
                    up to
                    <br />
                    <span className="text-2xl font-black">{maxOff}%</span>
                    <br />
                    off
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
      </section>
    ),

    /* ─────────────── Pastel category tiles ─────────────── */
    categories: tiles.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.categoriesTitle} href="#shop" />
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0">
          {tiles.slice(0, 8).map((c, i) => (
            <Link key={c.id} href={`${homeHref}?category=${c.slug}`} className="group flex w-28 shrink-0 flex-col items-center gap-2 rounded-2xl p-3 text-center transition-transform hover:-translate-y-1 lg:w-36" style={{ backgroundColor: TILE_TINTS[i % TILE_TINTS.length] }}>
              <span className="relative block aspect-square w-full overflow-hidden rounded-xl">
                {c.cover_image && <Image src={c.cover_image} alt="" fill sizes="120px" className="object-cover transition-transform duration-500 group-hover:scale-110" />}
              </span>
              <span className="line-clamp-1 text-[13px] font-bold" style={{ color: INK }}>{c.name}</span>
            </Link>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Daily deals (purple band) ─────────────── */
    newArrivals: deals.length > 0 && (
      <section id="deals" className="scroll-mt-28 px-4 lg:px-8">
        <div className="overflow-hidden rounded-[1.75rem] p-5 sm:p-7" style={{ background: `linear-gradient(120deg, var(--sf-accent), color-mix(in srgb, var(--sf-accent) 70%, #1e0b4a))` }}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 text-white">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8" style={{ color: LIME, fill: LIME }} />
              <div>
                <h2 className="text-2xl sm:text-3xl">{copy.newArrivalsTitle || "Daily deals"}</h2>
                <p className="text-sm text-white/70">Fresh deals every 24 hours</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <DealClock />
              <a href="#shop" className="sf-btn px-5 py-2.5 text-sm" style={{ backgroundColor: LIME, color: INK }}>
                View all deals <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-7 sm:px-7 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
            {deals.map((p) => (
              <div key={p.id} className="w-[46%] shrink-0 sm:w-[31%] lg:w-auto">
                <ShopCard product={p} />
              </div>
            ))}
          </div>
        </div>
      </section>
    ),

    /* ─────────────── Two promo tiles ─────────────── */
    promo: (
      <section className="grid gap-4 px-4 md:grid-cols-2 lg:px-8">
        {copy.promoTitle && (
          <div className="relative isolate flex min-h-[210px] overflow-hidden rounded-[1.75rem] p-7" style={{ backgroundColor: LIME }}>
            <div className="relative z-10 max-w-[56%]">
              {copy.promoEyebrow && <p className="text-xs font-black uppercase tracking-[0.15em]" style={{ color: INK }}>{copy.promoEyebrow}</p>}
              <h2 className="mt-1 text-3xl !leading-tight sm:text-4xl" style={{ color: INK }}>{copy.promoTitle}</h2>
              {copy.promoText && <p className="mt-2 text-sm" style={{ color: "#3f4a1a" }}>{copy.promoText}</p>}
              <a href="#shop" className="sf-btn mt-5 px-5 py-2.5 text-sm text-white" style={{ backgroundColor: INK }}>
                {copy.promoCta || "Shop now"} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            {imageOf(featured[1] ?? featured[0]) && (
              <div className="absolute -bottom-6 -right-6 aspect-square w-[40%] rotate-6 overflow-hidden rounded-3xl border-4 border-white shadow-2xl">
                <Image src={imageOf(featured[1] ?? featured[0])!} alt="" fill sizes="(min-width: 768px) 22vw, 46vw" className="object-cover" />
              </div>
            )}
          </div>
        )}
        <div className="relative isolate flex min-h-[210px] flex-col justify-between overflow-hidden rounded-[1.75rem] p-7 text-white" style={{ background: "linear-gradient(140deg, color-mix(in srgb, var(--sf-accent) 85%, #000), #1e0b4a)" }}>
          <div aria-hidden className="absolute -right-10 -top-10 h-44 w-44 rounded-full" style={{ backgroundColor: "color-mix(in srgb, #c6f432 25%, transparent)" }} />
          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.15em]" style={{ color: LIME }}>Deal alerts</p>
            <h2 className="mt-1 text-3xl !leading-tight sm:text-4xl">First to know, first to save</h2>
            <ul className="mt-3 space-y-1 text-sm text-white/80">
              <li>✓ Flash sales before anyone else</li>
              <li>✓ Restocks of sold-out favourites</li>
              <li>✓ New drops every week</li>
            </ul>
          </div>
          {whatsappHref && (
            <a href={whatsappHref} {...ext(whatsappHref)} className="sf-btn relative mt-5 w-fit px-5 py-2.5 text-sm" style={{ backgroundColor: LIME, color: INK }}>
              <MessageCircle className="h-4 w-4" /> Get alerts on WhatsApp
            </a>
          )}
        </div>
      </section>
    ),

    /* ─────────────── Popular ─────────────── */
    featured: featured.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.featuredTitle} sub="Customer favourites" icon={Flame} href="#shop" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {featured.slice(0, rows(featured.length, 4)).map((p, i) => (
            <ShopCard key={p.id} product={p} badge={i === 0 ? "Best seller" : undefined} />
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Limited drops (low stock) ─────────────── */
    categoryRails: drops.length > 0 && (
      <section className="px-4 lg:px-8">
        <div className="grid items-center gap-5 rounded-[1.75rem] p-5 text-white sm:p-7 lg:grid-cols-[220px_1fr]" style={{ backgroundColor: INK }}>
          <div>
            <Rocket className="h-8 w-8" style={{ color: LIME }} />
            <h2 className="mt-2 text-2xl sm:text-3xl">Limited drops</h2>
            <p className="mt-1 text-sm text-white/60">Rare finds. Limited stock.</p>
          </div>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-7 sm:px-7 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
            {drops.map((p) => (
              <Link key={p.id} href={productHref(p)} className="group w-[42%] shrink-0 rounded-2xl bg-white/[0.06] p-2.5 ring-1 ring-white/10 transition-colors hover:bg-white/10 sm:w-[30%] lg:w-auto">
                <span className="relative block aspect-square overflow-hidden rounded-xl bg-white/5">
                  {imageOf(p) && <Image src={imageOf(p)!} alt={p.name} fill sizes="(min-width: 1024px) 18vw, 42vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
                </span>
                <span className="mt-2 line-clamp-1 block text-sm font-semibold">{p.name}</span>
                <span className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-black">{formatCurrency(p.price)}</span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ backgroundColor: LIME, color: INK }}>Only {stockOf(p)} left</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    ),

    /* ─────────────── Everything ─────────────── */
    allProducts: products.length > 0 && (
      <section id="shop" className="scroll-mt-28 px-4 lg:px-8">
        <Heading title={copy.allProductsTitle} sub={`${products.length} products`} />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {products.map((p) => (
            <ShopCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Reviews ─────────────── */
    testimonials: testimonials.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.testimonialsTitle} icon={Star} />
        <div className="grid gap-3 md:grid-cols-3">
          {testimonials.slice(0, 3).map((t, i) => (
            <figure key={t.id} className="rounded-2xl p-5" style={{ backgroundColor: TILE_TINTS[i % TILE_TINTS.length] }}>
              <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, n) => (
                  <Star key={n} className={`h-4 w-4 ${n < t.rating ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
                ))}
              </div>
              <blockquote className="mt-3 text-sm leading-relaxed" style={{ color: INK }}>“{t.body}”</blockquote>
              <figcaption className="mt-3 text-sm font-bold" style={{ color: INK }}>
                {t.customer_name}
                {t.product_name && <span className="font-normal opacity-60"> · {t.product_name}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Never miss a deal ─────────────── */
    ctaBand: (
      <section className="px-4 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-5 rounded-[1.75rem] p-7 text-white sm:flex-row sm:items-center sm:p-10" style={{ background: "linear-gradient(120deg, var(--sf-accent), #1e0b4a)" }}>
          <div>
            <h2 className="text-3xl sm:text-4xl">{copy.ctaTitle || "Never miss a deal"}</h2>
            {copy.ctaText && <p className="mt-2 max-w-lg text-sm text-white/75">{copy.ctaText}</p>}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <a href="#deals" className="sf-btn px-6 py-3.5" style={{ backgroundColor: LIME, color: INK }}>
              {copy.heroCta || "Shop deals"} <ArrowRight className="h-5 w-5" />
            </a>
            {whatsappHref && (
              <a href={whatsappHref} {...ext(whatsappHref)} className="sf-btn border border-white/30 px-6 py-3.5 hover:bg-white/10">
                <MessageCircle className="h-5 w-5" /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>
    ),
  };

  return (
    <div className="mx-auto max-w-7xl pb-4">
      {theme.layout.sections.map((id, i) =>
        sections[id] ? (
          <div key={id} className={id === "hero" && i === 0 ? "" : "sf-section"}>
            {sections[id]}
          </div>
        ) : null,
      )}
    </div>
  );
}

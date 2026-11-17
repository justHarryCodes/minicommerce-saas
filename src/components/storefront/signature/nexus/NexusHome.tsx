// Nexus: a Signature gadgets theme. Deep navy, electric blue and violet
// neon. The hero product floats over a lit podium; tall showcase tiles,
// glass product cards, sale banners and live flash deals follow.
// Section order and copy come from the theme, editable in the studio.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MessageCircle, Quote, Star, Zap } from "lucide-react";
import { HIGHLIGHT_ICON } from "@/components/storefront/ThemeSections";
import { formatCurrency } from "@/lib/utils";
import type { SectionId } from "@/lib/themes/types";
import type { StorefrontHomeProps } from "../../StorefrontHome";
import { AddButton } from "../shared";
import { imageOf } from "../utils";
import { FlashTimer, TechCard } from "./NexusClient";

const VIOLET = "#8b5cf6";
const glowText = { backgroundImage: `linear-gradient(90deg, var(--sf-accent), ${VIOLET})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } as const;

/** "Power up your world." → last two words glow; "A. B." → second sentence glows. */
function Title({ text }: { text: string }) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 1)
    return (
      <>
        {sentences[0]}
        <br />
        <span style={glowText}>{sentences.slice(1).join(" ")}</span>
      </>
    );
  const words = text.trim().split(/\s+/);
  if (words.length < 3) return <span style={glowText}>{text}</span>;
  return (
    <>
      {words.slice(0, -2).join(" ")}
      <br />
      <span style={glowText}>{words.slice(-2).join(" ")}</span>
    </>
  );
}

function Heading({ title, eyebrow, href, link, extra }: { title: string; eyebrow?: string; href?: string; link?: string; extra?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div>
        {eyebrow && <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--sf-accent-ink)" }}>{eyebrow}</p>}
        <h2 className="text-2xl sm:text-4xl" style={{ color: "var(--sf-ink)" }}>{title}</h2>
      </div>
      <div className="flex items-center gap-4">
        {extra}
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--sf-accent-ink)" }}>
            {link ?? "View all"} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

const rows = (n: number, per: number) => (n >= per * 2 ? per * 2 : n >= per ? per : n);

export default function NexusHome(props: StorefrontHomeProps) {
  const { store, theme, storeBase, products, categoryTiles, testimonials } = props;
  const homeHref = storeBase || "/";
  const copy = theme.copy;
  const featured = props.featuredProducts.length > 0 ? props.featuredProducts : products.slice(0, 10);
  const hero = featured[0] ?? products[0];
  const banners = store.banner_images ?? [];
  const heroImage = imageOf(hero) ?? banners[0] ?? null;
  const tiles = categoryTiles.filter((c) => c.product_count > 0);
  const byNewest = [...products].sort((a, b) => +new Date(String(b.created_at)) - +new Date(String(a.created_at)));
  const discounted = products.filter((p) => (p.compare_price ?? p.comparePrice ?? 0) > p.price);
  const deals = (discounted.length >= 4 ? discounted : [...discounted, ...byNewest.filter((p) => !discounted.includes(p))]).slice(0, 10);
  const newest = byNewest[0];
  const promoImage = banners[1] ?? banners[0] ?? imageOf(products[1]);
  const whatsappHref = store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}` : props.demoContact ? "#" : null;
  const ext = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {});
  const catName = (id?: string | null) => props.topCategories.find((c) => c.id === id)?.name;

  const sections: Partial<Record<SectionId, React.ReactNode>> = {
    /* ─────────────── Hero: product on a lit podium ─────────────── */
    hero: (
      <section className="relative isolate overflow-hidden bg-[#060914] text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_72%_55%,color-mix(in_srgb,var(--sf-accent)_40%,transparent),transparent_55%),radial-gradient(ellipse_at_95%_10%,rgba(139,92,246,0.35),transparent_45%)]" />
        <div className="nexus-grid absolute inset-0 -z-10 opacity-40" aria-hidden />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-10 lg:grid-cols-[1fr_1.05fr] lg:px-8 lg:pb-20 lg:pt-16">
          <div className="sf-hero-in">
            {copy.heroEyebrow && (
              <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--sf-accent) 70%, #fff)" }}>
                <Zap className="h-3.5 w-3.5" /> {copy.heroEyebrow}
              </p>
            )}
            <h1 className="text-[2.9rem] !leading-[1] sm:text-6xl lg:text-7xl">
              <Title text={copy.heroTitle || store.name} />
            </h1>
            <p className="mt-5 max-w-md text-base text-white/65 sm:text-lg">{copy.heroSubtitle || store.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#shop" className="sf-btn px-7 py-3.5 text-white" style={{ backgroundColor: "var(--sf-accent)", boxShadow: "0 0 32px -6px var(--sf-accent)" }}>
                {copy.heroCta || "Shop now"} <ArrowRight className="h-5 w-5" />
              </a>
              <a href="#deals" className="sf-btn border border-white/20 bg-white/5 px-7 py-3.5 text-white backdrop-blur hover:bg-white/10">
                Explore deals
              </a>
            </div>
            {copy.highlights.length > 0 && (
              <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3">
                {copy.highlights.slice(0, 3).map((h) => {
                  const Icon = HIGHLIGHT_ICON[h.icon];
                  return (
                    <li key={h.title} className="flex items-center gap-2 text-[13px] text-white/75">
                      <span style={{ color: "color-mix(in srgb, var(--sf-accent) 70%, #fff)" }}>
                        <Icon className="h-5 w-5" />
                      </span>
                      {h.title}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {heroImage && (
            <div className="relative mx-auto w-full max-w-[560px] pb-14">
              <div className="ember-float relative z-10 mx-auto aspect-[5/4] w-[86%] overflow-hidden rounded-3xl ring-1 ring-white/15" style={{ boxShadow: "0 30px 80px -20px color-mix(in srgb, var(--sf-accent) 70%, transparent)" }}>
                <Image src={heroImage} alt={hero?.name ?? store.name} fill priority sizes="(min-width: 1024px) 480px, 86vw" className="sf-hero-zoom object-cover" />
              </div>
              {/* The lit podium */}
              <div aria-hidden className="absolute inset-x-0 bottom-0 mx-auto h-24 w-full">
                <div className="absolute inset-x-[4%] bottom-2 h-16 rounded-[50%] bg-gradient-to-b from-[#1b2340] to-[#0a0f1f] ring-1 ring-white/10" />
                <div className="absolute inset-x-[4%] bottom-6 h-14 rounded-[50%] border-2" style={{ borderColor: "var(--sf-accent)", boxShadow: "0 0 30px 4px var(--sf-accent), inset 0 0 22px var(--sf-accent)" }} />
                <div className="absolute inset-x-[16%] bottom-9 h-8 rounded-[50%] bg-[#0b1226]" />
              </div>
              {hero && (
                <div className="absolute -right-1 top-6 z-20 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1226]/80 p-2.5 pl-4 backdrop-blur-xl sm:right-0">
                  <Link href={`${storeBase}/products/${hero.slug ?? hero.id}`}>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">Featured</span>
                    <span className="block max-w-[150px] truncate text-sm font-semibold">{hero.name}</span>
                    <span className="block text-lg font-bold">{formatCurrency(hero.price)}</span>
                  </Link>
                  <AddButton product={hero} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Category ticker */}
        {tiles.length > 0 && (
          <div className="overflow-hidden border-y border-white/10 bg-white/[0.03] py-4">
            <div className="nexus-marquee flex w-max gap-12 whitespace-nowrap">
              {[0, 1].map((dup) => (
                <div key={dup} className="flex gap-12" aria-hidden={dup === 1}>
                  {[...tiles, ...tiles, ...tiles].map((c, i) => (
                    <Link key={`${dup}-${i}`} href={`${homeHref}?category=${c.slug}`} tabIndex={dup === 1 ? -1 : undefined} className="sf-display text-lg uppercase tracking-[0.3em] text-white/45 transition-colors hover:text-white">
                      {c.name}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    ),

    /* ─────────────── Trust strip ─────────────── */
    highlights: copy.highlights.length > 0 && (
      <section className="px-4 lg:px-8">
        <ul className="nexus-card grid grid-cols-2 gap-x-4 gap-y-6 rounded-2xl p-5 sm:p-6 lg:grid-cols-4">
          {copy.highlights.map((h) => {
            const Icon = HIGHLIGHT_ICON[h.icon];
            return (
              <li key={h.title} className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, var(--sf-accent), ${VIOLET})`, boxShadow: "0 0 22px -6px var(--sf-accent)" }}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold" style={{ color: "var(--sf-ink)" }}>{h.title}</span>
                  <span className="block text-xs opacity-55" style={{ color: "var(--sf-ink)" }}>{h.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    ),

    /* ─────────────── Showcase tiles ─────────────── */
    categories: tiles.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.categoriesTitle} eyebrow="Explore" />
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
          {tiles.slice(0, 8).map((c) => {
            const top = products.find((p) => p.category_id === c.id);
            return (
              <Link key={c.id} href={`${homeHref}?category=${c.slug}`} className="group relative isolate block aspect-[3/4] w-[62%] shrink-0 snap-start overflow-hidden rounded-2xl ring-1 ring-white/10 sm:w-[40%] lg:w-auto">
                {c.cover_image && <Image src={c.cover_image} alt="" fill sizes="(min-width: 1024px) 25vw, 62vw" className="-z-10 object-cover transition-transform duration-700 group-hover:scale-105" />}
                {/* Dark at both ends: the title (top) and count (bottom) stay readable on light product photos */}
                <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(6,9,20,0.88)_0%,rgba(6,9,20,0.15)_38%,rgba(6,9,20,0.15)_62%,rgba(6,9,20,0.9)_100%)]" />
                <div className="flex h-full flex-col justify-between p-5 text-white">
                  <span>
                    <span className="sf-display block text-2xl uppercase !leading-[1.05] sm:text-3xl">{c.name}</span>
                    {top && <span className="mt-1.5 block text-xs text-white/60">{top.name}</span>}
                  </span>
                  <span className="flex items-center justify-between">
                    <span className="text-xs text-white/60">{c.product_count} products</span>
                    <span className="grid h-10 w-10 place-items-center rounded-full border border-white/30 transition-colors group-hover:border-transparent group-hover:bg-[color:var(--sf-accent)]">
                      <ArrowUpRight className="h-5 w-5" />
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    ),

    /* ─────────────── Featured ─────────────── */
    featured: featured.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.featuredTitle} eyebrow="Top picks" href="#shop" link="View all" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {featured.slice(0, rows(featured.length, 5)).map((p, i) => (
            <TechCard key={p.id} product={p} eyebrow={catName(p.category_id)} badge={i === 0 ? "Bestseller" : i === 1 ? "Trending" : undefined} />
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Sale + just landed ─────────────── */
    promo: (copy.promoTitle || newest) && (
      <section className="grid gap-4 px-4 md:grid-cols-2 lg:px-8">
        {copy.promoTitle && (
          <div className="relative isolate flex min-h-[230px] overflow-hidden rounded-2xl p-7 text-white sm:p-9" style={{ background: "linear-gradient(120deg, color-mix(in srgb, var(--sf-accent) 85%, #000), #0b1226 75%)" }}>
            {promoImage && <Image src={promoImage} alt="" fill sizes="(min-width: 768px) 45vw, 100vw" className="-z-10 object-cover opacity-30 mix-blend-luminosity" />}
            <div className="max-w-[75%]">
              {copy.promoEyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">{copy.promoEyebrow}</p>}
              <h2 className="mt-2 text-4xl sm:text-5xl">{copy.promoTitle}</h2>
              {copy.promoText && <p className="mt-2 text-sm text-white/70">{copy.promoText}</p>}
              <a href="#deals" className="sf-btn mt-5 bg-white px-5 py-2.5 text-sm text-black">
                {copy.promoCta || "Shop the sale"} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
        {newest && (
          <Link href={`${storeBase}/products/${newest.slug ?? newest.id}`} className="group relative isolate flex min-h-[230px] overflow-hidden rounded-2xl p-7 text-white sm:p-9" style={{ background: `linear-gradient(120deg, ${VIOLET}, #1a1035 70%)` }}>
            {imageOf(newest) && (
              <div className="absolute -right-6 bottom-0 top-0 -z-10 w-[55%]">
                <Image src={imageOf(newest)!} alt="" fill sizes="(min-width: 768px) 25vw, 55vw" className="object-cover opacity-80 transition-transform duration-700 [mask-image:linear-gradient(to_right,transparent,black_40%)] group-hover:scale-105" />
              </div>
            )}
            <div className="max-w-[60%]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">New arrival</p>
              <h2 className="mt-2 text-3xl sm:text-4xl">Just landed</h2>
              <p className="mt-2 line-clamp-2 text-sm text-white/75">{newest.name} · {formatCurrency(newest.price)}</p>
              <span className="sf-btn mt-5 border border-white/40 px-5 py-2.5 text-sm">Discover now <ArrowRight className="h-4 w-4" /></span>
            </div>
          </Link>
        )}
      </section>
    ),

    /* ─────────────── Flash deals ─────────────── */
    newArrivals: deals.length > 0 && (
      <section id="deals" className="scroll-mt-28 px-4 lg:px-8">
        <Heading title={copy.newArrivalsTitle || "Flash deals"} eyebrow="Ends tonight" extra={<FlashTimer />} />
        <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4 lg:mx-0 lg:px-0">
          {deals.map((p) => (
            <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-[19%]">
              <TechCard product={p} eyebrow={catName(p.category_id)} />
            </div>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Everything ─────────────── */
    allProducts: products.length > 0 && (
      <section id="shop" className="scroll-mt-28 px-4 lg:px-8">
        <Heading title={copy.allProductsTitle} eyebrow={`${products.length} products`} />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {products.map((p) => (
            <TechCard key={p.id} product={p} eyebrow={catName(p.category_id)} />
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Reviews ─────────────── */
    testimonials: testimonials.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.testimonialsTitle} eyebrow="Reviews" />
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.slice(0, 3).map((t) => (
            <figure key={t.id} className="nexus-card relative rounded-2xl p-6">
              <Quote className="absolute right-5 top-5 h-7 w-7" style={{ color: "color-mix(in srgb, var(--sf-accent) 45%, transparent)" }} />
              <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < t.rating ? "fill-amber-400 text-amber-400" : "opacity-25"}`} />
                ))}
              </div>
              <blockquote className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--sf-ink)" }}>“{t.body}”</blockquote>
              <figcaption className="mt-4 text-sm">
                <span className="font-semibold" style={{ color: "var(--sf-ink)" }}>{t.customer_name}</span>
                {t.product_name && <span className="opacity-50" style={{ color: "var(--sf-ink)" }}> · {t.product_name}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Stay ahead ─────────────── */
    ctaBand: (
      <section className="px-4 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl p-[1.5px]" style={{ background: `linear-gradient(120deg, var(--sf-accent), ${VIOLET}, var(--sf-accent))` }}>
          <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[calc(1.5rem-1.5px)] bg-[#070b18] px-7 py-10 text-white sm:flex-row sm:items-center sm:px-12">
            <div className="pointer-events-none absolute -right-10 -top-20 h-60 w-60 rounded-full blur-3xl" style={{ backgroundColor: "color-mix(in srgb, var(--sf-accent) 35%, transparent)" }} />
            <div className="relative">
              <h2 className="text-3xl sm:text-5xl">{copy.ctaTitle || `Stay ahead with ${store.name}`}</h2>
              {copy.ctaText && <p className="mt-2 max-w-lg text-white/65">{copy.ctaText}</p>}
            </div>
            <div className="relative flex flex-wrap gap-3">
              <a href="#shop" className="sf-btn px-6 py-3.5 text-white" style={{ backgroundColor: "var(--sf-accent)", boxShadow: "0 0 28px -6px var(--sf-accent)" }}>
                {copy.heroCta || "Shop now"} <ArrowRight className="h-5 w-5" />
              </a>
              {whatsappHref && (
                <a href={whatsappHref} {...ext(whatsappHref)} className="sf-btn border border-white/25 px-6 py-3.5 hover:bg-white/10">
                  <MessageCircle className="h-5 w-5" /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    ),
  };

  return (
    <div className="pb-4">
      {theme.layout.sections.map((id, i) =>
        sections[id] ? (
          <div key={id} className={id === "hero" && i === 0 ? "" : "sf-section mx-auto max-w-7xl"}>
            {sections[id]}
          </div>
        ) : null,
      )}
    </div>
  );
}

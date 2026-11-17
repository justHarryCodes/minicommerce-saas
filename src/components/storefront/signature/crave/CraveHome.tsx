// Crave: a Signature food theme. Warm cream pages, red and sunny yellow,
// big appetite photos and app-like ordering: round category photos, deal
// cards, ratings and a "+" on every dish. On phones the hero becomes an
// app-style deal card (the theme ships with the bottom-tab-bar nav).
// Section order and copy come from the theme, editable in the studio.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LayoutGrid, MessageCircle, Quote, Sparkles, Star } from "lucide-react";
import { HIGHLIGHT_ICON } from "@/components/storefront/ThemeSections";
import { formatCurrency } from "@/lib/utils";
import type { SectionId } from "@/lib/themes/types";
import type { StorefrontHomeProps } from "../../StorefrontHome";
import { AddButton } from "../shared";
import { imageOf } from "../utils";
import { CraveCard, DealTimer, MenuGrid } from "./CraveClient";

const SUN = "#fbbf24";

/** "Crave it. Love it." → second sentence highlighted; otherwise the last word. */
function Title({ text }: { text: string }) {
  const hi = { color: "var(--crave-hi)" };
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 1)
    return (
      <>
        {sentences[0]}
        <br />
        <span style={hi}>{sentences.slice(1).join(" ")}</span>
      </>
    );
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return <span style={hi}>{text}</span>;
  return (
    <>
      {words.slice(0, -1).join(" ")} <span style={hi}>{words[words.length - 1]}</span>
    </>
  );
}

function Heading({ eyebrow, title, href, link, center }: { eyebrow?: string; title: string; href?: string; link?: string; center?: boolean }) {
  return (
    <div className={`mb-7 flex items-end gap-4 sm:mb-9 ${center ? "flex-col items-center text-center" : "justify-between"}`}>
      <div>
        {eyebrow && <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--sf-accent-ink)" }}>{eyebrow}</p>}
        <h2 className="text-3xl sm:text-5xl" style={{ color: "var(--sf-ink)" }}>{title}</h2>
      </div>
      {href && !center && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold" style={{ color: "var(--sf-accent-ink)" }}>
          {link ?? "View all"} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export default function CraveHome(props: StorefrontHomeProps) {
  const { store, theme, storeBase, products, categoryTiles, testimonials } = props;
  const homeHref = storeBase || "/";
  const copy = theme.copy;
  const featured = props.featuredProducts.length > 0 ? props.featuredProducts : products.slice(0, 8);
  const heroDish = featured[0] ?? products[0];
  const banners = store.banner_images ?? [];
  const heroImage = imageOf(heroDish) ?? banners[0] ?? null;
  const promoImage = banners[1] ?? banners[0] ?? imageOf(products[2]);
  const newest = [...products].sort((a, b) => +new Date(String(b.created_at)) - +new Date(String(a.created_at)))[0];
  const whatsappHref = store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}` : props.demoContact ? "#" : null;
  const tiles = categoryTiles.filter((c) => c.product_count > 0);
  const avg = testimonials.length ? testimonials.reduce((s, t) => s + t.rating, 0) / testimonials.length : 0;
  const ext = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {});

  const sections: Partial<Record<SectionId, React.ReactNode>> = {
    /* ─────────────── Hero ─────────────── */
    hero: (
      <section className="px-4 pt-3 lg:px-8 lg:pt-12">
        {/* Phones: a red deal card. Desktop: a warm split layout on the page colour. */}
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-[color:var(--sf-accent)] px-6 pt-7 text-[color:var(--sf-on-accent)] [--crave-hi:#fde047] lg:overflow-visible lg:rounded-none lg:bg-transparent lg:p-0 lg:text-[color:var(--sf-ink)] lg:[--crave-hi:var(--sf-accent)]">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 lg:hidden" />
          <div className="grid items-center gap-4 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
            <div className="sf-hero-in relative z-10">
              {copy.heroEyebrow && (
                <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] lg:bg-[color-mix(in_srgb,var(--sf-accent)_12%,transparent)] lg:text-[color:var(--sf-accent-ink)]">
                  <Sparkles className="h-3.5 w-3.5" /> {copy.heroEyebrow}
                </p>
              )}
              <h1 className="text-[2.7rem] uppercase !leading-[0.95] sm:text-6xl lg:text-[5.6rem]" style={{ fontWeight: 900 }}>
                <Title text={copy.heroTitle || store.name} />
              </h1>
              <p className="mt-4 max-w-md text-sm opacity-85 sm:text-lg lg:opacity-70">{copy.heroSubtitle || store.description}</p>
              <div className="mt-6 flex flex-wrap gap-2.5 lg:mt-8 lg:gap-3">
                <a href="#menu" className="sf-btn bg-white px-6 py-3.5 text-[color:var(--sf-accent)] shadow-lg lg:bg-[color:var(--sf-accent)] lg:px-7 lg:py-4 lg:text-[color:var(--sf-on-accent)] lg:shadow-[0_18px_40px_-16px_var(--sf-accent)]">
                  {copy.heroCta || "Order now"} <ArrowRight className="h-5 w-5" />
                </a>
                {/* Wrapped: .sf-btn sets its own display, which would beat `hidden` */}
                <span className="hidden lg:inline-flex">
                  <a href="#menu" className="sf-btn border-2 border-current px-7 py-4">
                    View menu
                  </a>
                </span>
              </div>
              {copy.highlights.length > 0 && (
                <ul className="mt-10 hidden gap-8 lg:flex">
                  {copy.highlights.slice(0, 3).map((h) => {
                    const Icon = HIGHLIGHT_ICON[h.icon];
                    return (
                      <li key={h.title} className="flex items-center gap-2.5">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-[color-mix(in_srgb,var(--sf-accent)_12%,transparent)]" style={{ color: "var(--sf-accent-ink)" }}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="text-[13px] font-semibold leading-tight">{h.title}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {heroImage && (
              <div className="relative -mx-2 lg:mx-0">
                {/* Sun disc behind the dish (desktop) */}
                <div className="absolute inset-[6%] hidden translate-x-[9%] translate-y-[5%] rounded-full lg:block" style={{ backgroundColor: SUN }} />
                <div className="relative aspect-[4/3] overflow-hidden rounded-t-[1.5rem] lg:mx-auto lg:aspect-square lg:w-[88%] lg:rounded-full lg:shadow-[0_40px_70px_-30px_rgba(120,30,0,0.55)]">
                  <Image src={heroImage} alt={heroDish?.name ?? store.name} fill priority sizes="(min-width: 1024px) 520px, 100vw" className="sf-hero-zoom object-cover" />
                </div>
                {/* Spinning "made fresh" stamp */}
                <svg viewBox="0 0 120 120" className="ember-spin absolute left-0 top-[4%] hidden h-28 w-28 lg:block" aria-hidden>
                  <circle cx="60" cy="60" r="58" fill="var(--sf-page)" />
                  <defs>
                    <path id="crave-ring" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
                  </defs>
                  <text fontSize="11" letterSpacing="2.4" fontWeight="800" fill="var(--sf-accent)">
                    <textPath href="#crave-ring">{(copy.heroEyebrow || "Made fresh · made for you").toUpperCase()} ·</textPath>
                  </text>
                  <circle cx="60" cy="60" r="20" fill="var(--sf-accent)" />
                </svg>
                {avg > 0 && (
                  <div className="absolute right-0 top-[10%] hidden items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-xl dark:bg-zinc-900 lg:flex">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    <span>
                      <span className="block text-lg font-extrabold leading-none">{avg.toFixed(1)}</span>
                      <span className="text-[11px] opacity-60">{testimonials.length} reviews</span>
                    </span>
                  </div>
                )}
                {heroDish && (
                  <div className="absolute bottom-[6%] left-[4%] hidden items-center gap-3 rounded-2xl bg-white p-2.5 pl-4 shadow-xl dark:bg-zinc-900 lg:flex">
                    <Link href={`${storeBase}/products/${heroDish.slug ?? heroDish.id}`}>
                      <span className="block max-w-[170px] truncate text-sm font-semibold">{heroDish.name}</span>
                      <span className="block text-xl font-extrabold" style={{ color: "var(--sf-accent-ink)" }}>{formatCurrency(heroDish.price)}</span>
                    </Link>
                    <AddButton product={heroDish} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    ),

    /* ─────────────── Categories ─────────────── */
    categories: tiles.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.categoriesTitle} href="#menu" link="Full menu" />
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 lg:mx-0 lg:px-0">
          <a href="#menu" className="flex w-[76px] shrink-0 flex-col items-center gap-2 text-center sm:w-28">
            <span className="grid aspect-square w-full place-items-center rounded-full shadow-lg" style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)", boxShadow: "0 12px 26px -14px var(--sf-accent)" }}>
              <LayoutGrid className="h-7 w-7 sm:h-9 sm:w-9" />
            </span>
            <span className="text-[13px] font-semibold" style={{ color: "var(--sf-ink)" }}>All</span>
          </a>
          {tiles.map((c) => (
            <Link key={c.id} href={`${homeHref}?category=${c.slug}`} className="group flex w-[76px] shrink-0 flex-col items-center gap-2 text-center sm:w-28">
              <span className="relative block aspect-square w-full overflow-hidden rounded-full bg-white p-1 shadow-md ring-1 ring-black/5 transition-transform group-hover:-translate-y-1 dark:bg-white/10">
                <span className="relative block h-full w-full overflow-hidden rounded-full">
                  {c.cover_image && <Image src={c.cover_image} alt="" fill sizes="112px" className="object-cover" />}
                </span>
              </span>
              <span className="line-clamp-1 text-[13px] font-semibold" style={{ color: "var(--sf-ink)" }}>{c.name}</span>
            </Link>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Perks strip ─────────────── */
    highlights: copy.highlights.length > 0 && (
      <section className="px-4 lg:px-8">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-[1.75rem] bg-white p-5 shadow-[0_10px_30px_-20px_rgba(120,40,10,0.35)] ring-1 ring-black/[0.04] dark:bg-white/[0.05] dark:ring-white/10 sm:p-7 lg:grid-cols-4">
          {copy.highlights.map((h) => {
            const Icon = HIGHLIGHT_ICON[h.icon];
            return (
              <li key={h.title} className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--sf-accent)_12%,transparent)]" style={{ color: "var(--sf-accent-ink)" }}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold" style={{ color: "var(--sf-ink)" }}>{h.title}</span>
                  <span className="block text-xs opacity-55" style={{ color: "var(--sf-ink)" }}>{h.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    ),

    /* ─────────────── Most loved ─────────────── */
    featured: featured.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading eyebrow="Popular picks" title={copy.featuredTitle} href="#menu" link="See all" />
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
          {featured.slice(0, featured.length >= 8 ? 8 : featured.length >= 4 ? 4 : featured.length).map((p, i) => (
            <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-auto">
              <CraveCard product={p} badge={i === 0 ? "Bestseller" : i === 1 ? "Popular" : undefined} />
            </div>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Two deal tiles ─────────────── */
    promo: (copy.promoTitle || newest) && (
      <section className="grid gap-4 px-4 md:grid-cols-[1.35fr_1fr] lg:px-8">
        {copy.promoTitle && (
          <div className="relative isolate flex min-h-[260px] overflow-hidden rounded-[2rem] p-7 text-zinc-900 sm:p-9" style={{ backgroundColor: SUN }}>
            <div className="relative z-10 max-w-[58%]">
              {copy.promoEyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-70">{copy.promoEyebrow}</p>}
              <h2 className="mt-2 text-4xl uppercase !leading-[0.95] sm:text-5xl" style={{ fontWeight: 900, color: "var(--sf-accent)" }}>{copy.promoTitle}</h2>
              {copy.promoText && <p className="mt-2 text-sm opacity-75">{copy.promoText}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <a href="#menu" className="sf-btn px-5 py-2.5 text-sm" style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
                  {copy.promoCta || "Order now"} <ArrowRight className="h-4 w-4" />
                </a>
                <DealTimer />
              </div>
            </div>
            {promoImage && (
              <div className="absolute -bottom-6 -right-8 aspect-square w-[55%] overflow-hidden rounded-full border-[6px] border-white/60 shadow-2xl">
                <Image src={promoImage} alt="" fill sizes="(min-width: 768px) 30vw, 55vw" className="object-cover" />
              </div>
            )}
          </div>
        )}
        {newest && (
          <Link href={`${storeBase}/products/${newest.slug ?? newest.id}`} className="group relative isolate flex min-h-[260px] overflow-hidden rounded-[2rem] p-7 text-white sm:p-9" style={{ backgroundColor: "var(--sf-accent-dark)" }}>
            {imageOf(newest) && <Image src={imageOf(newest)!} alt="" fill sizes="(min-width: 768px) 35vw, 100vw" className="-z-10 object-cover opacity-55 transition-transform duration-700 group-hover:scale-105" />}
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
            <div className="mt-auto">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">{copy.newArrivalsTitle || "New on the menu"}</p>
              <h2 className="mt-1.5 text-3xl !leading-tight sm:text-4xl" style={{ fontWeight: 900 }}>{newest.name}</h2>
              <p className="mt-2 inline-flex items-center gap-2 text-lg font-extrabold">
                {formatCurrency(newest.price)} <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-zinc-900">Try it →</span>
              </p>
            </div>
          </Link>
        )}
      </section>
    ),

    /* ─────────────── Full menu ─────────────── */
    allProducts: products.length > 0 && (
      <section id="menu" className="scroll-mt-28 px-4 lg:px-8">
        <Heading eyebrow="Our signature" title={copy.allProductsTitle} center />
        <MenuGrid tabs={props.topCategories.map((c) => ({ id: c.id, name: c.name }))} products={products} bestIds={featured.slice(0, 2).map((p) => p.id)} />
      </section>
    ),

    /* ─────────────── Why choose us ─────────────── */
    about: (
      <section className="px-4 lg:px-8">
        <div className="grid items-center gap-8 overflow-hidden rounded-[2rem] bg-white p-4 shadow-[0_10px_30px_-20px_rgba(120,40,10,0.35)] ring-1 ring-black/[0.04] dark:bg-white/[0.05] dark:ring-white/10 sm:p-6 lg:grid-cols-2 lg:gap-12">
          {(banners[2] ?? promoImage) && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem]">
              <Image src={(banners[2] ?? promoImage)!} alt="" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
              <span className="absolute bottom-4 left-4 rounded-full px-4 py-2 text-sm font-extrabold text-zinc-900 shadow-lg" style={{ backgroundColor: SUN }}>
                {copy.highlights[0]?.title ?? "Made fresh"}
              </span>
            </div>
          )}
          <div className="px-2 pb-4 sm:px-4 lg:py-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--sf-accent-ink)" }}>Why choose us?</p>
            <h2 className="mt-2 text-3xl sm:text-5xl" style={{ color: "var(--sf-ink)" }}>{store.name}</h2>
            <p className="mt-4 max-w-lg opacity-65" style={{ color: "var(--sf-ink)" }}>{store.description}</p>
            <dl className="mt-8 grid grid-cols-3 gap-4">
              {[
                { k: "Menu items", v: `${products.length}+` },
                ...(avg > 0 ? [{ k: "Average rating", v: avg.toFixed(1) }] : []),
                { k: "Categories", v: String(tiles.length) },
              ].map((s) => (
                <div key={s.k}>
                  <dd className="text-3xl font-black sm:text-4xl" style={{ color: "var(--sf-accent-ink)" }}>{s.v}</dd>
                  <dt className="mt-1 text-xs font-semibold opacity-55" style={{ color: "var(--sf-ink)" }}>{s.k}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    ),

    /* ─────────────── Reviews ─────────────── */
    testimonials: testimonials.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading eyebrow="What our customers say" title={copy.testimonialsTitle} center />
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:grid lg:grid-cols-3 lg:px-0">
          {testimonials.slice(0, 3).map((t) => (
            <figure key={t.id} className="relative w-[85%] shrink-0 snap-start rounded-[1.75rem] bg-white p-6 shadow-[0_10px_30px_-20px_rgba(120,40,10,0.35)] ring-1 ring-black/[0.04] dark:bg-white/[0.05] dark:ring-white/10 sm:w-[60%] lg:w-auto">
              <Quote className="absolute right-5 top-5 h-8 w-8" style={{ color: "color-mix(in srgb, var(--sf-accent) 25%, transparent)" }} />
              <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < t.rating ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
                ))}
              </div>
              <blockquote className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--sf-ink)" }}>“{t.body}”</blockquote>
              <figcaption className="mt-4 text-sm">
                <span className="font-bold" style={{ color: "var(--sf-ink)" }}>{t.customer_name}</span>
                {t.product_name && <span className="opacity-50" style={{ color: "var(--sf-ink)" }}> · {t.product_name}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Hungry? band ─────────────── */
    ctaBand: (
      <section className="px-4 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-5 rounded-[2rem] p-7 text-zinc-900 sm:flex-row sm:items-center sm:p-10" style={{ backgroundColor: SUN }}>
          <div>
            <h2 className="text-3xl uppercase sm:text-5xl" style={{ fontWeight: 900, color: "var(--sf-accent)" }}>{copy.ctaTitle || "Hungry?"}</h2>
            {copy.ctaText && <p className="mt-1.5 max-w-lg text-sm opacity-75 sm:text-base">{copy.ctaText}</p>}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <a href="#menu" className="sf-btn px-6 py-3.5" style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
              {copy.heroCta || "Order now"} <ArrowRight className="h-5 w-5" />
            </a>
            {whatsappHref && (
              <a href={whatsappHref} {...ext(whatsappHref)} className="sf-btn bg-white px-6 py-3.5 text-zinc-900">
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

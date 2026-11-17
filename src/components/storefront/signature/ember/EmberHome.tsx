// Ember: a Signature food theme. Dark, fiery and bold. The hero puts one
// dish in the spotlight, the menu is tabbed by category, and the deal block
// counts down to midnight. Section order and copy still come from the
// theme (editable in the studio), so a vendor can hide or reorder blocks.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Flame, MessageCircle, Quote, Star } from "lucide-react";
import { HIGHLIGHT_ICON } from "@/components/storefront/ThemeSections";
import { formatCurrency } from "@/lib/utils";
import type { SectionId } from "@/lib/themes/types";
import type { Product } from "@/types";
import type { StorefrontHomeProps } from "../../StorefrontHome";
import { AddButton, Countdown, MenuTabs } from "./EmberClient";

const imageOf = (p?: Product) => (p ? (p.images?.[0] ?? p.image_url ?? null) : null);
const plain = (s?: string) => (s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const ink = (pct: number) => `color-mix(in srgb, var(--sf-ink) ${pct}%, transparent)`;

/** "Crafted for flavour." → last word in the accent colour; "A. B." → second sentence in accent. */
function Title({ text }: { text: string }) {
  const sentences = text.split(/(?<=\.)\s+/).filter(Boolean);
  if (sentences.length > 1) {
    return (
      <>
        {sentences[0]}
        <br />
        <span style={{ color: "var(--sf-accent)" }}>{sentences.slice(1).join(" ")}</span>
      </>
    );
  }
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return <span style={{ color: "var(--sf-accent)" }}>{text}</span>;
  return (
    <>
      {words.slice(0, -1).join(" ")} <span style={{ color: "var(--sf-accent)" }}>{words[words.length - 1]}</span>
    </>
  );
}

function Heading({ eyebrow, title, href, link }: { eyebrow?: string; title: string; href?: string; link?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
      <div>
        {eyebrow && (
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: "var(--sf-accent-ink)" }}>
            <Flame className="h-3.5 w-3.5" /> {eyebrow}
          </p>
        )}
        <h2 className="text-5xl sm:text-7xl" style={{ color: "var(--sf-ink)" }}>{title}</h2>
      </div>
      {href && (
        <Link href={href} className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold sm:inline-flex" style={{ color: "var(--sf-accent-ink)" }}>
          {link ?? "View all"} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

// Rising embers in the hero (fixed positions so server and browser agree)
const SPARKS = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${(i * 0.7) % 6}s`,
  dur: `${5 + (i % 5)}s`,
  size: 2 + (i % 3),
}));

export default function EmberHome(props: StorefrontHomeProps) {
  const { store, theme, storeBase, products, categoryTiles, testimonials } = props;
  const homeHref = storeBase || "/";
  const copy = theme.copy;
  const featured = props.featuredProducts.length > 0 ? props.featuredProducts : products.slice(0, 8);
  const heroDish = featured[0] ?? products[0];
  const heroImage = imageOf(heroDish) ?? store.banner_images?.[0] ?? null;
  const banners = store.banner_images ?? [];
  const promoImage = banners[1] ?? banners[0] ?? imageOf(products[2]);
  const whatsappHref = store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}` : props.demoContact ? "#" : null;
  const tiles = categoryTiles.filter((c) => c.product_count > 0);
  const avgRating = testimonials.length ? testimonials.reduce((s, t) => s + t.rating, 0) / testimonials.length : 0;

  const sections: Partial<Record<SectionId, React.ReactNode>> = {
    /* ─────────────── Hero ─────────────── */
    hero: (
      <section className="relative isolate overflow-hidden bg-[#0d0907] text-white">
        {banners[0] && <Image src={banners[0]} alt="" fill priority sizes="100vw" className="-z-20 object-cover opacity-[0.18] blur-[2px]" />}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_45%,color-mix(in_srgb,var(--sf-accent)_45%,transparent),transparent_55%),linear-gradient(to_bottom,rgba(13,9,7,0.4),#0d0907)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          {SPARKS.map((s, i) => (
            <span key={i} className="ember-spark absolute bottom-0 rounded-full" style={{ left: s.left, width: s.size, height: s.size, animationDelay: s.delay, animationDuration: s.dur, backgroundColor: "var(--sf-accent)" }} />
          ))}
        </div>

        <div className="mx-auto grid min-h-[100svh] max-w-7xl items-center gap-10 px-4 pb-16 pt-36 lg:max-h-[960px] lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:pt-28">
          <div className="sf-hero-in">
            {copy.heroEyebrow && (
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white/85 backdrop-blur">
                <Flame className="h-3.5 w-3.5" style={{ color: "var(--sf-accent)" }} /> {copy.heroEyebrow}
              </p>
            )}
            <h1 className="text-[4.2rem] sm:text-8xl lg:text-[8.5rem]" style={{ lineHeight: 0.86 }}>
              <Title text={copy.heroTitle || store.name} />
            </h1>
            <p className="mt-6 max-w-md text-base text-white/70 sm:text-lg">{copy.heroSubtitle || store.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#menu" className="sf-btn px-7 py-4 text-base" style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)", boxShadow: "0 18px 40px -14px var(--sf-accent)" }}>
                {copy.heroCta || "Order now"} <ArrowRight className="h-5 w-5" />
              </a>
              {whatsappHref && (
                <a href={whatsappHref} {...(whatsappHref.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="sf-btn border border-white/25 px-6 py-4 text-base text-white hover:bg-white/10">
                  <MessageCircle className="h-5 w-5" /> Order on WhatsApp
                </a>
              )}
            </div>
            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
              {avgRating > 0 && (
                <div>
                  <dt className="text-xs uppercase tracking-widest text-white/50">Rated</dt>
                  <dd className="sf-display mt-1 flex items-center gap-1.5 text-3xl">
                    <Star className="h-5 w-5 fill-current" style={{ color: "var(--sf-accent)" }} /> {avgRating.toFixed(1)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase tracking-widest text-white/50">On the menu</dt>
                <dd className="sf-display mt-1 text-3xl">{products.length}+ dishes</dd>
              </div>
              {copy.highlights[1] && (
                <div>
                  <dt className="text-xs uppercase tracking-widest text-white/50">Delivery</dt>
                  <dd className="sf-display mt-1 text-3xl">{copy.highlights[1].title}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* The dish in the spotlight */}
          {heroImage && (
            <div className="relative mx-auto aspect-square w-full max-w-[520px]">
              <div className="absolute inset-[8%] rounded-full blur-3xl" style={{ backgroundColor: "color-mix(in srgb, var(--sf-accent) 55%, transparent)" }} />
              <svg viewBox="0 0 200 200" className="ember-spin absolute inset-0 h-full w-full text-white/60" aria-hidden>
                <defs>
                  <path id="ember-ring" d="M100,100 m-92,0 a92,92 0 1,1 184,0 a92,92 0 1,1 -184,0" />
                </defs>
                <text fontSize="8.5" letterSpacing="4" fill="currentColor" fontWeight="700">
                  <textPath href="#ember-ring">{`${(copy.heroEyebrow || "Hot · Fresh · Made to order").toUpperCase()} · ${store.name.toUpperCase()} · `}</textPath>
                </text>
              </svg>
              <div className="ember-float absolute inset-[12%] overflow-hidden rounded-full shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] ring-4 ring-white/10">
                <Image src={heroImage} alt={heroDish?.name ?? store.name} fill priority sizes="(min-width: 1024px) 420px, 80vw" className="sf-hero-zoom object-cover" />
              </div>
              {heroDish && (
                <div className="absolute bottom-[4%] left-0 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/60 p-2.5 pr-3 backdrop-blur-xl sm:left-[-4%]">
                  <Link href={`${storeBase}/products/${heroDish.slug ?? heroDish.id}`} className="min-w-0 pl-1.5">
                    <span className="block text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--sf-accent)" }}>Bestseller</span>
                    <span className="block max-w-[180px] truncate text-sm font-semibold">{heroDish.name}</span>
                    <span className="sf-display block text-2xl">{formatCurrency(heroDish.price)}</span>
                  </Link>
                  <AddButton product={heroDish} size="lg" />
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    ),

    /* ─────────────── Categories ─────────────── */
    categories: tiles.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading eyebrow="Pick a craving" title={copy.categoriesTitle} />
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-6 lg:mx-0 lg:px-0">
          {tiles.map((c) => (
            <Link key={c.id} href={`${homeHref}?category=${c.slug}`} className="group flex w-24 shrink-0 flex-col items-center text-center sm:w-32">
              <span className="relative block aspect-square w-full overflow-hidden rounded-full ring-2 ring-transparent ring-offset-4 transition-all group-hover:ring-[color:var(--sf-accent)]" style={{ ["--tw-ring-offset-color" as string]: "var(--sf-page)" }}>
                {c.cover_image && <Image src={c.cover_image} alt="" fill sizes="128px" className="object-cover transition-transform duration-500 group-hover:scale-110" />}
              </span>
              <span className="mt-3 text-sm font-semibold" style={{ color: "var(--sf-ink)" }}>{c.name}</span>
              <span className="text-xs opacity-50" style={{ color: "var(--sf-ink)" }}>{c.product_count} items</span>
            </Link>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Signature dishes ─────────────── */
    featured: featured.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading eyebrow="Chef's picks" title={copy.featuredTitle} href="#menu" link="Full menu" />
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {/* Whole rows of 4 on desktop (8, 4, or whatever there is) */}
          {featured.slice(0, featured.length >= 8 ? 8 : featured.length >= 4 ? 4 : featured.length).map((p) => {
            const img = imageOf(p);
            const was = p.compare_price ?? p.comparePrice;
            const off = was && was > p.price ? Math.round((1 - p.price / was) * 100) : 0;
            return (
              <article key={p.id} className="group relative flex flex-col rounded-3xl p-2.5 transition-transform duration-300 hover:-translate-y-1 sm:p-3" style={{ backgroundColor: ink(5), border: `1px solid ${ink(8)}` }}>
                <div className="relative aspect-square overflow-hidden rounded-2xl">
                  {img && <Image src={img} alt={p.name} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />}
                  {off > 0 && (
                    <span className="absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>-{off}%</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
                  <h3 className="text-2xl sm:text-3xl" style={{ color: "var(--sf-ink)" }}>
                    {/* Stretched link: the whole card opens the dish */}
                    <Link href={`${storeBase}/products/${p.slug ?? p.id}`} className="after:absolute after:inset-0 after:rounded-3xl">{p.name}</Link>
                  </h3>
                  <p className="mt-1 line-clamp-2 hidden text-[13px] opacity-60 sm:block" style={{ color: "var(--sf-ink)" }}>{plain(p.short_description ?? p.shortDescription)}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <span>
                      <span className="sf-display block text-2xl sm:text-3xl" style={{ color: "var(--sf-accent-ink)" }}>{formatCurrency(p.price)}</span>
                      {off > 0 && <s className="text-xs opacity-50" style={{ color: "var(--sf-ink)" }}>{formatCurrency(was!)}</s>}
                    </span>
                    <span className="relative z-10">
                      <AddButton product={p} />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    ),

    /* ─────────────── Deal of the day ─────────────── */
    promo: copy.promoTitle && (
      <section className="px-4 lg:px-8">
        <div className="relative isolate grid overflow-hidden rounded-[2rem] bg-[#140b06] text-white lg:grid-cols-2">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_srgb,var(--sf-accent)_55%,transparent),transparent_60%)]" />
          <div className="p-8 sm:p-12 lg:p-16">
            {copy.promoEyebrow && <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">{copy.promoEyebrow}</p>}
            <h2 className="mt-3 text-6xl sm:text-8xl">{copy.promoTitle}</h2>
            {copy.promoText && <p className="mt-4 max-w-md text-white/70">{copy.promoText}</p>}
            <div className="mt-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">Ends in</p>
              <Countdown />
            </div>
            <a href="#menu" className="sf-btn mt-9 bg-white px-7 py-4 text-base text-black">
              {copy.promoCta || "Order now"} <ArrowRight className="h-5 w-5" />
            </a>
          </div>
          {promoImage && (
            <div className="relative min-h-[300px]">
              <Image src={promoImage} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#140b06] via-transparent to-transparent lg:bg-gradient-to-r" />
            </div>
          )}
        </div>
      </section>
    ),

    /* ─────────────── Full menu ─────────────── */
    allProducts: products.length > 0 && (
      <section id="menu" className="scroll-mt-28 px-4 lg:px-8">
        <Heading eyebrow={`${products.length} dishes`} title={copy.allProductsTitle} />
        <MenuTabs tabs={props.topCategories.map((c) => ({ id: c.id, name: c.name }))} products={products} />
      </section>
    ),

    /* ─────────────── Why us ─────────────── */
    highlights: copy.highlights.length > 0 && (
      <section className="px-4 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {copy.highlights.map((h) => {
            const Icon = HIGHLIGHT_ICON[h.icon];
            return (
              <div key={h.title} className="rounded-3xl p-6" style={{ backgroundColor: ink(5), border: `1px solid ${ink(8)}` }}>
                <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)", boxShadow: "0 12px 28px -12px var(--sf-accent)" }}>
                  <Icon className="h-6 w-6" />
                </span>
                <p className="sf-display mt-5 text-3xl" style={{ color: "var(--sf-ink)" }}>{h.title}</p>
                <p className="mt-1 text-sm opacity-60" style={{ color: "var(--sf-ink)" }}>{h.text}</p>
              </div>
            );
          })}
        </div>
      </section>
    ),

    /* ─────────────── Reviews ─────────────── */
    testimonials: testimonials.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading eyebrow="Reviews" title={copy.testimonialsTitle} />
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.slice(0, 3).map((t) => (
            <figure key={t.id} className="relative rounded-3xl p-7" style={{ backgroundColor: ink(5), border: `1px solid ${ink(8)}` }}>
              <Quote className="absolute right-6 top-6 h-8 w-8 opacity-15" style={{ color: "var(--sf-ink)" }} />
              <div className="flex gap-0.5" style={{ color: "var(--sf-accent)" }} aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < t.rating ? "fill-current" : "opacity-30"}`} />
                ))}
              </div>
              <blockquote className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--sf-ink)" }}>“{t.body}”</blockquote>
              <figcaption className="mt-5 text-sm">
                <span className="font-semibold" style={{ color: "var(--sf-ink)" }}>{t.customer_name}</span>
                {t.product_name && <span className="opacity-50" style={{ color: "var(--sf-ink)" }}> · {t.product_name}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Final call ─────────────── */
    ctaBand: (
      <section className="px-4 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] px-8 py-14 text-center sm:py-20" style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
          <Flame aria-hidden className="pointer-events-none absolute -bottom-10 -left-6 h-56 w-56 opacity-15" />
          <Flame aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-48 w-48 rotate-12 opacity-15" />
          <h2 className="relative text-6xl sm:text-8xl">{copy.ctaTitle || "Hungry?"}</h2>
          {copy.ctaText && <p className="relative mx-auto mt-3 max-w-lg text-base opacity-80 sm:text-lg">{copy.ctaText}</p>}
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <a href="#menu" className="sf-btn px-7 py-4 text-base" style={{ backgroundColor: "var(--sf-on-accent)", color: "var(--sf-accent)" }}>
              {copy.heroCta || "Order now"} <ArrowRight className="h-5 w-5" />
            </a>
            {whatsappHref && (
              <a href={whatsappHref} {...(whatsappHref.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="sf-btn border-2 border-current px-6 py-4 text-base">
                <MessageCircle className="h-5 w-5" /> WhatsApp us
              </a>
            )}
          </div>
        </div>
      </section>
    ),
  };

  const order = theme.layout.sections;
  return (
    <div className="pb-4">
      {order.map((id, i) =>
        sections[id] ? (
          // The hero sits flush under the see-through nav; everything else gets the theme's rhythm
          <div key={id} className={id === "hero" && i === 0 ? "" : "sf-section mx-auto max-w-7xl"}>
            {sections[id]}
          </div>
        ) : null,
      )}
    </div>
  );
}

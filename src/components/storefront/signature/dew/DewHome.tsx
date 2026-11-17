// Dew: a Signature skincare & beauty theme. A teal full-bleed hero with the
// model fading in from the right, soft bubbles and serif type; a benefits card
// floating over the hero's edge; ornament headings; round category badges on
// tinted discs; a numbered "ritual" built from the store's categories; a
// special-offer banner; reviews in serif and a "glow club" band.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf, Mail, MessageCircle, Quote } from "lucide-react";
import { HIGHLIGHT_ICON } from "@/components/storefront/ThemeSections";
import type { SectionId } from "@/lib/themes/types";
import type { StorefrontHomeProps } from "../../StorefrontHome";
import { imageOf } from "../utils";
import { DewCard } from "./DewClient";

const DEEP = "#0b4f47";
const SERIF = "!normal-case !tracking-normal";

/** "— SHOP BY CATEGORY —" with a little leaf. */
function Ornament({ title, align = "center" }: { title: string; align?: "center" | "left" }) {
  return (
    <p className={`flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] ${align === "center" ? "justify-center" : ""}`} style={{ color: "var(--sf-accent-ink)" }}>
      <span className="h-px w-10 bg-current opacity-40" />
      {title}
      <Leaf className="h-3.5 w-3.5 opacity-60" />
    </p>
  );
}

function Heading({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl !uppercase !tracking-[0.06em] sm:text-[26px]" style={{ color: "var(--sf-accent-ink)" }}>{title}</h2>
        <span className="hidden h-px w-16 sm:block" style={{ backgroundColor: "var(--sf-accent)", opacity: 0.35 }} />
      </div>
      {href && (
        <Link href={href} className="shrink-0 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors hover:bg-[var(--sf-accent)] hover:text-white" style={{ borderColor: "var(--sf-accent)", color: "var(--sf-accent-ink)" }}>
          View all
        </Link>
      )}
    </div>
  );
}

const fill = (n: number, per: number) => (n >= per * 2 ? per * 2 : n >= per ? per : n);
const TAGS = ["Best seller", "New", "Limited"];

export default function DewHome(props: StorefrontHomeProps) {
  const { store, theme, storeBase, products, categoryTiles, testimonials } = props;
  const homeHref = storeBase || "/";
  const copy = theme.copy;
  const featured = props.featuredProducts.length > 0 ? props.featuredProducts : products.slice(0, 8);
  const banners = store.banner_images ?? [];
  const heroImage = banners[0] ?? imageOf(featured[0]);
  const tiles = categoryTiles.filter((c) => c.product_count > 0);
  const newest = [...products].sort((a, b) => +new Date(String(b.created_at)) - +new Date(String(a.created_at)));
  const setProduct = products.find((p) => /set|kit|box|bundle|trio/i.test(p.name)) ?? featured[1];
  const offerImage = banners[1] ?? imageOf(setProduct);
  const whatsappHref = store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}` : props.demoContact ? "#" : null;
  const ext = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {});

  const sections: Partial<Record<SectionId, React.ReactNode>> = {
    /* ─────────────── Teal hero ─────────────── */
    hero: (
      <section className="relative isolate overflow-hidden text-white" style={{ background: `linear-gradient(115deg, ${DEEP} 0%, var(--sf-accent) 45%, color-mix(in srgb, var(--sf-accent) 45%, #bfe7e1) 100%)` }}>
        {heroImage && (
          <div className="absolute inset-y-0 right-0 -z-10 w-full md:w-[58%]">
            <Image src={heroImage} alt="" fill priority sizes="(min-width: 768px) 58vw, 100vw" className="sf-hero-zoom object-cover object-top opacity-40 md:opacity-100 md:[mask-image:linear-gradient(to_right,transparent,black_35%)]" />
          </div>
        )}
        {/* soft bubbles */}
        {[
          "left-[46%] top-[18%] h-6 w-6",
          "left-[40%] top-[62%] h-10 w-10",
          "left-[52%] top-[78%] h-4 w-4",
        ].map((c) => (
          <span key={c} aria-hidden className={`absolute -z-10 hidden rounded-full border border-white/40 bg-white/10 backdrop-blur-sm md:block ${c}`} />
        ))}
        <div className="mx-auto max-w-7xl px-5 pb-28 pt-14 sm:pt-20 lg:px-8 lg:pb-36">
          <div className="sf-hero-in max-w-lg">
            {copy.heroEyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/80">{copy.heroEyebrow}</p>}
            <h1 className={`mt-4 text-[2.7rem] !leading-[1.08] sm:text-6xl ${SERIF}`}>{copy.heroTitle || store.name}</h1>
            <div className="my-6 flex items-center gap-3 text-white/60">
              <span className="h-px w-24 bg-current" />
              <Leaf className="h-4 w-4" />
              <span className="h-px w-24 bg-current" />
            </div>
            <p className="max-w-sm text-[15px] leading-relaxed text-white/85">{copy.heroSubtitle || store.description}</p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <a href="#shop" className="sf-btn rounded-full px-7 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-lg" style={{ backgroundColor: DEEP }}>
                {copy.heroCta || "Shop now"} <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#ritual" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 hover:text-white">
                <span className="grid h-8 w-8 place-items-center rounded-full border border-white/60">
                  <Leaf className="h-3.5 w-3.5" />
                </span>
                Build your routine
              </a>
            </div>
          </div>
        </div>
      </section>
    ),

    /* ─────────────── Floating benefits card ─────────────── */
    highlights: copy.highlights.length > 0 && (
      <section className="relative z-10 -mt-20 px-4 lg:-mt-24 lg:px-8">
        <ul className="grid grid-cols-2 gap-y-6 rounded-3xl bg-white px-5 py-7 shadow-[0_24px_60px_-30px_rgba(11,79,71,0.45)] ring-1 ring-black/[0.04] dark:bg-zinc-900 dark:ring-white/10 lg:grid-cols-4 lg:divide-x lg:divide-black/[0.06] dark:lg:divide-white/10">
          {copy.highlights.map((h) => {
            const Icon = HIGHLIGHT_ICON[h.icon];
            return (
              <li key={h.title} className="flex items-center gap-3 px-2 lg:justify-center lg:px-5">
                <span style={{ color: "var(--sf-accent-ink)" }}>
                  <Icon className="h-8 w-8 stroke-[1.25]" />
                </span>
                <span>
                  <span className="block text-[17px] !leading-tight ![font-family:var(--sf-heading-font)]" style={{ color: "var(--sf-ink)" }}>{h.title}</span>
                  <span className="mt-0.5 block text-[11px] opacity-55" style={{ color: "var(--sf-ink)" }}>{h.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    ),

    /* ─────────────── Round category badges ─────────────── */
    categories: tiles.length > 0 && (
      <section className="px-4 lg:px-8">
        <Ornament title={copy.categoriesTitle} />
        <div className="-mx-4 mt-7 flex gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:justify-center lg:gap-8 lg:px-0">
          {tiles.slice(0, 8).map((c) => (
            <Link key={c.id} href={`${homeHref}?category=${c.slug}`} className="group flex w-24 shrink-0 flex-col items-center text-center sm:w-28">
              <span className="relative block h-24 w-24 overflow-hidden rounded-full p-1.5 transition-transform duration-500 group-hover:-translate-y-1 sm:h-28 sm:w-28" style={{ backgroundColor: "color-mix(in srgb, var(--sf-accent) 12%, white)" }}>
                <span className="relative block h-full w-full overflow-hidden rounded-full">
                  {c.cover_image && <Image src={c.cover_image} alt="" fill sizes="112px" className="object-cover transition-transform duration-700 group-hover:scale-110" />}
                </span>
              </span>
              <span className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--sf-ink)" }}>{c.name}</span>
              <span className="mt-0.5 text-[11px]" style={{ color: "var(--sf-accent-ink)" }}>Explore</span>
            </Link>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Featured ─────────────── */
    featured: featured.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.featuredTitle} href="#shop" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {featured.slice(0, fill(featured.length, 4)).map((p, i) => (
            <DewCard key={p.id} product={p} tag={TAGS[i]} />
          ))}
        </div>
      </section>
    ),

    /* ─────────────── The ritual (numbered steps from categories) ─────────────── */
    categoryRails: tiles.length >= 3 && (
      <section id="ritual" className="scroll-mt-28 px-4 lg:px-8">
        <div className="rounded-3xl px-5 py-10 sm:px-10" style={{ backgroundColor: "color-mix(in srgb, var(--sf-accent) 7%, var(--sf-page))" }}>
          <Ornament title="Your daily ritual" />
          <h2 className={`mx-auto mt-3 max-w-xl text-center text-3xl sm:text-4xl ${SERIF}`} style={{ color: "var(--sf-ink)" }}>Three simple steps to your best skin</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {tiles.slice(0, 3).map((c, i) => (
              <li key={c.id}>
                <Link href={`${homeHref}?category=${c.slug}`} className="group flex items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-black/[0.04] transition-shadow hover:shadow-lg dark:bg-white/[0.05] dark:ring-white/10">
                  <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                    {c.cover_image && <Image src={c.cover_image} alt="" fill sizes="80px" className="object-cover transition-transform duration-500 group-hover:scale-110" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--sf-accent-ink)" }}>Step {String(i + 1).padStart(2, "0")}</span>
                    <span className="mt-0.5 block text-xl ![font-family:var(--sf-heading-font)]" style={{ color: "var(--sf-ink)" }}>{c.name}</span>
                    <span className="text-[11px] opacity-55" style={{ color: "var(--sf-ink)" }}>
                      {c.product_count} {c.product_count === 1 ? "product" : "products"}
                    </span>
                  </span>
                  <ArrowRight className="mr-2 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" style={{ color: "var(--sf-accent-ink)" }} />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>
    ),

    /* ─────────────── Special offer ─────────────── */
    promo: copy.promoTitle && (
      <section className="px-4 lg:px-8">
        <div className="grid overflow-hidden rounded-3xl text-white md:grid-cols-[1.1fr_1.3fr_0.8fr]" style={{ background: `linear-gradient(110deg, ${DEEP}, var(--sf-accent))` }}>
          <div className="relative min-h-[200px]">
            {offerImage && <Image src={offerImage} alt="" fill sizes="(min-width: 768px) 34vw, 100vw" className="object-cover md:[mask-image:linear-gradient(to_right,black_60%,transparent)]" />}
          </div>
          <div className="flex flex-col justify-center px-7 py-8 sm:px-10">
            {copy.promoEyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/75">{copy.promoEyebrow}</p>}
            <h2 className={`mt-2 text-3xl !leading-tight sm:text-4xl ${SERIF}`}>{copy.promoTitle}</h2>
            {copy.promoText && <p className="mt-2 max-w-md text-sm text-white/80">{copy.promoText}</p>}
            <a href="#shop" className="sf-btn mt-5 w-fit rounded-full bg-white px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: DEEP }}>
              {copy.promoCta || "Shop the offer"} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="flex flex-col justify-center border-t border-white/15 px-7 py-8 md:border-l md:border-t-0">
            <Mail className="h-7 w-7 stroke-[1.25]" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em]">Join now</p>
            <p className="mt-1 text-xs text-white/75">Be the first to know about new arrivals and exclusive deals.</p>
          </div>
        </div>
      </section>
    ),

    /* ─────────────── Just in ─────────────── */
    newArrivals: newest.length >= 4 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.newArrivalsTitle || "Just in"} href="#shop" />
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4 lg:mx-0 lg:px-0">
          {newest.slice(0, 8).map((p) => (
            <div key={p.id} className="w-[62%] shrink-0 snap-start sm:w-[36%] lg:w-[calc((100%-48px)/4)]">
              <DewCard product={p} tag="New" />
            </div>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── All ─────────────── */
    allProducts: products.length > 0 && (
      <section id="shop" className="scroll-mt-28 px-4 lg:px-8">
        <Heading title={copy.allProductsTitle} />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {products.map((p) => (
            <DewCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Reviews ─────────────── */
    testimonials: testimonials.length > 0 && (
      <section className="px-4 lg:px-8">
        <Ornament title={copy.testimonialsTitle} />
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {testimonials.slice(0, 3).map((t) => (
            <figure key={t.id} className="rounded-3xl bg-white p-7 text-center ring-1 ring-black/[0.04] dark:bg-white/[0.05] dark:ring-white/10">
              <Quote className="mx-auto h-7 w-7" style={{ color: "var(--sf-accent)", opacity: 0.5 }} />
              <blockquote className="mt-3 text-lg !leading-relaxed ![font-family:var(--sf-heading-font)] italic" style={{ color: "var(--sf-ink)" }}>“{t.body}”</blockquote>
              <p className="mt-3 text-sm tracking-[0.2em] text-amber-400">{"★".repeat(Math.max(1, Math.min(5, t.rating)))}</p>
              <figcaption className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--sf-ink)" }}>
                {t.customer_name}
                {t.product_name && <span className="mt-0.5 block font-normal normal-case tracking-normal opacity-50">{t.product_name}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Glow club ─────────────── */
    ctaBand: (
      <section className="px-4 lg:px-8">
        <div className="flex flex-col items-center gap-5 rounded-3xl px-7 py-10 text-center ring-1 sm:px-12 md:flex-row md:justify-between md:text-left" style={{ backgroundColor: "color-mix(in srgb, var(--sf-accent) 7%, var(--sf-page))", ["--tw-ring-color" as string]: "color-mix(in srgb, var(--sf-accent) 18%, transparent)" }}>
          <div className="flex flex-col items-center gap-4 md:flex-row">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: "var(--sf-accent)" }}>
              <Leaf className="h-6 w-6" />
            </span>
            <div>
              <h2 className={`text-3xl ${SERIF}`} style={{ color: "var(--sf-ink)" }}>{copy.ctaTitle || "Join the glow club"}</h2>
              {copy.ctaText && <p className="mt-1 max-w-lg text-sm opacity-65" style={{ color: "var(--sf-ink)" }}>{copy.ctaText}</p>}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {whatsappHref && (
              <a href={whatsappHref} {...ext(whatsappHref)} className="sf-btn rounded-full px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white" style={{ backgroundColor: "var(--sf-accent)" }}>
                <MessageCircle className="h-4 w-4" /> Join on WhatsApp
              </a>
            )}
            <a href="#shop" className="sf-btn rounded-full border px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: "var(--sf-accent)", color: "var(--sf-accent-ink)" }}>
              {copy.heroCta || "Shop now"}
            </a>
          </div>
        </div>
      </section>
    ),
  };

  return (
    <div className="pb-4">
      {theme.layout.sections.map((id, i) =>
        sections[id] ? (
          id === "hero" ? (
            <div key={id} className={i === 0 ? "" : "sf-section"}>
              {sections[id]}
            </div>
          ) : (
            <div key={id} className={`mx-auto max-w-7xl ${id === "highlights" && theme.layout.sections[i - 1] === "hero" ? "" : "sf-section"}`}>
              {sections[id]}
            </div>
          )
        ) : null,
      )}
    </div>
  );
}

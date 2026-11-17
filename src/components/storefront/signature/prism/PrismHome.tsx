// Prism: a Signature "colour block" theme for gadgets and fun brands. A soft
// grey spotlight hero with the hero product floating over a giant word, a
// grid of bright category blocks, a perks row, colour-washed product cards,
// a green deal banner with the product popping out of it, colourful reviews
// and a yellow "never miss a drop" band.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { HIGHLIGHT_ICON } from "@/components/storefront/ThemeSections";
import { formatCurrency } from "@/lib/utils";
import type { SectionId } from "@/lib/themes/types";
import type { Product } from "@/types";
import type { StorefrontHomeProps } from "../../StorefrontHome";
import { imageOf } from "../utils";
import { PrismCard } from "./PrismClient";

/** The block colours, in order: ink, red, yellow, blue, green, pink. */
const BLOCKS = ["#18181b", "#ef3349", "#f5b800", "#1d4ed8", "#15803d", "#ec4899"];
/** Wide (2-column) blocks in a 4-column grid: 1 · 1 · 2 / 2 · 1 · 1 */
const WIDE = new Set([2, 3]);
const offOf = (p: Product) => {
  const was = p.compare_price ?? p.comparePrice;
  return was && was > p.price ? Math.round((1 - p.price / was) * 100) : 0;
};
const B = "!font-extrabold !normal-case !tracking-tight";

function Heading({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className={`text-2xl sm:text-3xl ${B}`} style={{ color: "var(--sf-ink)" }}>
        {title}
        <span style={{ color: "var(--sf-accent)" }}>.</span>
      </h2>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: "var(--sf-ink)" }}>
          See all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export default function PrismHome(props: StorefrontHomeProps) {
  const { store, theme, storeBase, products, categoryTiles, testimonials } = props;
  const homeHref = storeBase || "/";
  const copy = theme.copy;
  const featured = props.featuredProducts.length > 0 ? props.featuredProducts : products.slice(0, 8);
  const banners = store.banner_images ?? [];
  const catName = (id?: string | null) => props.topCategories.find((c) => c.id === id)?.name;
  const heroProduct = featured.find((p) => imageOf(p)) ?? products[0];
  const heroImage = imageOf(heroProduct) ?? banners[0];
  const bigWord = (catName(heroProduct?.category_id) ?? store.name).toUpperCase();
  const tiles = categoryTiles.filter((c) => c.product_count > 0).slice(0, 6);
  const newest = [...products].sort((a, b) => +new Date(String(b.created_at)) - +new Date(String(a.created_at)));
  const discounted = products.filter((p) => offOf(p) > 0).sort((a, b) => offOf(b) - offOf(a));
  const deal = discounted.find((p) => p.id !== heroProduct?.id) ?? discounted[0];
  const dealWords = deal ? deal.name.replace(/\d+\s?(GB|TB)\b/i, "").trim().split(/\s+/).slice(0, 3) : [];
  const whatsappHref = store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}` : props.demoContact ? "#" : null;
  const ext = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {});

  const sections: Partial<Record<SectionId, React.ReactNode>> = {
    /* ─────────────── Spotlight hero ─────────────── */
    hero: (
      <section className="px-4 pt-4 lg:px-8 lg:pt-6">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-zinc-100 px-6 pb-8 pt-9 dark:bg-zinc-900 sm:px-12 sm:pb-12 sm:pt-12">
          <p className="sf-hero-in text-sm font-medium opacity-60 sm:text-base" style={{ color: "var(--sf-ink)" }}>{heroProduct?.name ?? copy.heroEyebrow}</p>
          <h1 className={`sf-hero-in mt-1 text-4xl sm:text-5xl ${B}`} style={{ color: "var(--sf-ink)" }}>{copy.heroTitle || store.name}</h1>
          {/* the giant word sits behind the product */}
          <p
            aria-hidden
            className="pointer-events-none mt-2 select-none overflow-hidden whitespace-nowrap text-center text-[19vw] font-black !leading-[0.85] tracking-tight sm:text-[14vw] lg:text-[12.5rem]"
            style={{ color: "color-mix(in srgb, #b9ab7a 80%, var(--sf-ink))", textShadow: "6px 6px 0 rgba(0,0,0,0.12)" }}
          >
            {bigWord}
          </p>
          {heroImage && heroProduct && (
            <Link
              href={`${storeBase}/products/${heroProduct.slug ?? heroProduct.id}`}
              className="group relative z-10 mx-auto -mt-[5vw] block w-[56%] max-w-[260px] sm:absolute sm:left-1/2 sm:top-1/2 sm:mt-0 sm:w-[24%] sm:-translate-x-1/2 sm:-translate-y-1/2"
            >
              <span className="relative block aspect-square -rotate-6 overflow-hidden rounded-[1.75rem] shadow-[0_30px_60px_-25px_rgba(0,0,0,0.55)] ring-4 ring-white transition-transform duration-500 group-hover:rotate-0 dark:ring-zinc-800">
                <Image src={heroImage} alt={heroProduct.name} fill priority sizes="260px" className="sf-hero-zoom object-cover" />
              </span>
              <span className="absolute -bottom-3 -right-3 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-lg sm:text-sm" style={{ backgroundColor: "var(--sf-accent)" }}>
                {formatCurrency(heroProduct.price)}
              </span>
            </Link>
          )}
          <div className="relative z-20 mt-8 flex flex-col items-start justify-between gap-6 sm:mt-10 sm:flex-row sm:items-end">
            <a href="#categories" className="sf-btn rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_var(--sf-accent)]" style={{ backgroundColor: "var(--sf-accent)" }}>
              {copy.heroCta || "Shop by category"}
            </a>
            <div className="max-w-xs sm:text-right">
              <p className="text-sm font-bold" style={{ color: "var(--sf-ink)" }}>Description</p>
              <p className="mt-1 line-clamp-3 text-[13px] opacity-60" style={{ color: "var(--sf-ink)" }}>{heroProduct?.description || copy.heroSubtitle || store.description}</p>
            </div>
          </div>
        </div>
      </section>
    ),

    /* ─────────────── Colour blocks ─────────────── */
    categories: tiles.length > 0 && (
      <section id="categories" className="scroll-mt-28 px-4 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {tiles.map((c, i) => {
            const color = BLOCKS[i % BLOCKS.length];
            const wide = WIDE.has(i) || (tiles.length % 2 === 1 && i === tiles.length - 1);
            return (
              <Link
                key={c.id}
                href={`${homeHref}?category=${c.slug}`}
                className={`group relative isolate flex min-h-[180px] overflow-hidden rounded-3xl p-5 text-white sm:min-h-[210px] sm:p-6 ${wide ? "col-span-2" : ""}`}
                style={{ backgroundColor: color, backgroundImage: "linear-gradient(135deg, transparent 52%, rgba(255,255,255,0.32))" }}
              >
                <div className="relative z-10 flex flex-col">
                  <span className="text-[11px] font-medium text-white/80">Shop</span>
                  <span className="text-sm font-bold">{c.product_count} {c.product_count === 1 ? "item" : "items"}</span>
                  <span className={`mt-1 text-2xl font-black uppercase !leading-none text-white/40 sm:text-3xl ${wide ? "lg:text-4xl" : ""}`}>{c.name}</span>
                  <span className="mt-auto w-fit rounded-full border-2 border-white/90 bg-white px-4 py-1.5 text-xs font-semibold transition-colors group-hover:bg-transparent group-hover:text-white" style={{ color }}>
                    browse
                  </span>
                </div>
                {c.cover_image && (
                  <span className={`absolute -bottom-3 -right-3 block aspect-square overflow-hidden rounded-2xl shadow-xl ring-4 ring-white/25 transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-105 ${wide ? "w-[36%] rotate-6" : "w-[58%] rotate-12"}`}>
                    <Image src={c.cover_image} alt="" fill sizes="(min-width: 1024px) 20vw, 45vw" className="object-cover" />
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    ),

    /* ─────────────── Perks ─────────────── */
    highlights: copy.highlights.length > 0 && (
      <section className="px-4 lg:px-8">
        <ul className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {copy.highlights.map((h) => {
            const Icon = HIGHLIGHT_ICON[h.icon];
            return (
              <li key={h.title} className="flex items-center gap-3">
                <span style={{ color: "var(--sf-accent)" }}>
                  <Icon className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-[13px] font-bold" style={{ color: "var(--sf-ink)" }}>{h.title}</span>
                  <span className="block text-[11px] opacity-55" style={{ color: "var(--sf-ink)" }}>{h.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    ),

    /* ─────────────── Hot picks ─────────────── */
    featured: featured.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.featuredTitle} href="#shop" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {featured.slice(0, featured.length >= 8 ? 8 : 4).map((p, i) => (
            <PrismCard key={p.id} product={p} color={BLOCKS[(i + 1) % BLOCKS.length]} tag={i === 0 ? "Hot" : undefined} />
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Deal banner with a pop-out product ─────────────── */
    promo: deal && (
      <section className="px-4 pt-10 lg:px-8 lg:pt-16">
        <Link href={`${storeBase}/products/${deal.slug ?? deal.id}`} className="group relative grid items-center gap-6 rounded-[2rem] px-7 py-9 text-white sm:px-12 md:grid-cols-[1fr_auto_1fr]" style={{ backgroundColor: "#15803d", backgroundImage: "linear-gradient(135deg, transparent 55%, rgba(255,255,255,0.18))" }}>
          <div>
            <p className="text-xs font-semibold text-white/85">{offOf(deal)}% OFF · {copy.promoEyebrow || "Deal of the week"}</p>
            <p className="mt-2 text-5xl font-black uppercase !leading-[0.92] sm:text-6xl">
              {dealWords.map((w) => (
                <span key={w} className="block">
                  {w}
                </span>
              ))}
            </p>
            <p className="mt-3 text-sm font-bold">
              {formatCurrency(deal.price)} <s className="ml-1 font-normal text-white/60">{formatCurrency((deal.compare_price ?? deal.comparePrice)!)}</s>
            </p>
          </div>
          {imageOf(deal) && (
            <span className="relative mx-auto block aspect-square w-56 -rotate-3 overflow-hidden rounded-[1.75rem] shadow-[0_40px_60px_-25px_rgba(0,0,0,0.6)] ring-8 ring-white transition-transform duration-500 group-hover:rotate-0 sm:w-64 md:-my-24">
              <Image src={imageOf(deal)!} alt={deal.name} fill sizes="256px" className="object-cover" />
            </span>
          )}
          <div className="md:pl-6">
            <p className="text-2xl font-bold">“{copy.promoTitle || "Power your dream"}”</p>
            {copy.promoText && <p className="mt-2 max-w-xs text-sm text-white/80">{copy.promoText}</p>}
            <span className="sf-btn mt-5 rounded-full border-2 border-white px-6 py-2 text-sm font-semibold transition-colors group-hover:bg-white group-hover:text-green-800">{copy.promoCta || "Shop"}</span>
          </div>
        </Link>
      </section>
    ),

    /* ─────────────── Fresh drops ─────────────── */
    newArrivals: newest.length >= 4 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.newArrivalsTitle || "Fresh drops"} href="#shop" />
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4 lg:mx-0 lg:px-0">
          {newest.slice(0, 8).map((p, i) => (
            <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[calc((100%-48px)/4)]">
              <PrismCard product={p} color={BLOCKS[(i + 3) % BLOCKS.length]} tag="New" />
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
          {products.map((p, i) => (
            <PrismCard key={p.id} product={p} color={BLOCKS[i % BLOCKS.length]} />
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Colourful reviews ─────────────── */
    testimonials: testimonials.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.testimonialsTitle} />
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {testimonials.slice(0, 3).map((t, i) => {
            const color = [BLOCKS[3], BLOCKS[5], BLOCKS[0]][i % 3];
            return (
              <figure key={t.id} className="flex flex-col rounded-3xl p-6 text-white" style={{ backgroundColor: color, backgroundImage: "linear-gradient(135deg, transparent 55%, rgba(255,255,255,0.2))" }}>
                <p className="text-base tracking-wider text-amber-300">{"★".repeat(Math.max(1, Math.min(5, t.rating)))}</p>
                <blockquote className="mt-3 flex-1 text-[15px] font-medium leading-relaxed">“{t.body}”</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-black" style={{ color }}>
                    {t.customer_name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold">
                    {t.customer_name}
                    {t.product_name && <span className="block text-[11px] font-normal text-white/70">{t.product_name}</span>}
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </section>
    ),

    /* ─────────────── Never miss a drop ─────────────── */
    ctaBand: (
      <section className="px-4 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-5 rounded-[2rem] px-7 py-9 text-zinc-950 sm:flex-row sm:items-center sm:px-12" style={{ backgroundColor: BLOCKS[2], backgroundImage: "linear-gradient(135deg, transparent 55%, rgba(255,255,255,0.35))" }}>
          <div>
            <h2 className={`text-3xl sm:text-4xl ${B}`}>{copy.ctaTitle || "Never miss a drop"}</h2>
            {copy.ctaText && <p className="mt-1 max-w-lg text-sm text-zinc-900/75">{copy.ctaText}</p>}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {whatsappHref && (
              <a href={whatsappHref} {...ext(whatsappHref)} className="sf-btn rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white">
                <MessageCircle className="h-4 w-4" /> WhatsApp us
              </a>
            )}
            <a href="#shop" className="sf-btn rounded-full border-2 border-zinc-950 px-6 py-2.5 text-sm font-semibold">
              Shop all <ArrowRight className="h-4 w-4" />
            </a>
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

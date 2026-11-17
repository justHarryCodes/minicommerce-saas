// Clarity: a Signature gadgets theme. Clean white and royal blue with navy
// bands: a sliding hero beside two promo tiles, a category bar, flash deals
// on navy, featured collections and full-width add-to-cart buttons.
// Section order and copy come from the theme, editable in the studio.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, MessageCircle, Star } from "lucide-react";
import { HIGHLIGHT_ICON } from "@/components/storefront/ThemeSections";
import { formatCurrency } from "@/lib/utils";
import type { SectionId } from "@/lib/themes/types";
import type { StorefrontHomeProps } from "../../StorefrontHome";
import { imageOf } from "../utils";
import { DealClock, HeroCarousel, ShopCard, type Slide } from "./ClarityClient";

const NAVY = "#0b1530";
const panel = "rounded-2xl bg-white ring-1 ring-black/[0.06] dark:bg-white/[0.05] dark:ring-white/10";
const plain = (s?: string) => (s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const rows = (n: number, per: number) => (n >= per * 2 ? per * 2 : n >= per ? per : n);

function Heading({ title, href, link }: { title: string; href?: string; link?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="text-xl sm:text-2xl" style={{ color: "var(--sf-ink)" }}>{title}</h2>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold" style={{ color: "var(--sf-accent-ink)" }}>
          {link ?? "View all"} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export default function ClarityHome(props: StorefrontHomeProps) {
  const { store, theme, storeBase, products, categoryTiles, testimonials } = props;
  const homeHref = storeBase || "/";
  const copy = theme.copy;
  const featured = props.featuredProducts.length > 0 ? props.featuredProducts : products.slice(0, 10);
  const banners = store.banner_images ?? [];
  const tiles = categoryTiles.filter((c) => c.product_count > 0);
  const byNewest = [...products].sort((a, b) => +new Date(String(b.created_at)) - +new Date(String(a.created_at)));
  const newest = byNewest[0];
  const discounted = products.filter((p) => (p.compare_price ?? p.comparePrice ?? 0) > p.price);
  const deals = [...discounted, ...byNewest.filter((p) => !discounted.includes(p))].slice(0, 4);
  const catName = (id?: string | null) => props.topCategories.find((c) => c.id === id)?.name;
  const productHref = (p: { slug?: string; id: string }) => `${storeBase}/products/${p.slug ?? p.id}`;
  const whatsappHref = store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}` : props.demoContact ? "#" : null;
  const ext = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {});

  // Hero slides: the store's own message first, then two featured products
  const firstImage = banners[0] ?? imageOf(featured[0]);
  const slides: Slide[] = [
    ...(firstImage
      ? [{ eyebrow: copy.heroEyebrow || "Welcome", title: copy.heroTitle || store.name, text: copy.heroSubtitle || store.description || "", cta: copy.heroCta || "Shop now", href: "#shop", image: firstImage }]
      : []),
    ...featured
      .slice(0, 2)
      .filter((p) => imageOf(p))
      .map((p) => ({ eyebrow: catName(p.category_id) ?? "Featured", title: p.name, text: plain(p.short_description ?? p.shortDescription) || formatCurrency(p.price), cta: `Shop · ${formatCurrency(p.price)}`, href: productHref(p), image: imageOf(p)! })),
  ];
  const promoImage = banners[1] ?? imageOf(products[2]);

  const sections: Partial<Record<SectionId, React.ReactNode>> = {
    /* ─────────────── Hero: carousel + two tiles ─────────────── */
    hero: slides.length > 0 && (
      <section className="px-4 pt-4 lg:px-6 lg:pt-6">
        <div className="grid gap-3 lg:grid-cols-[2.1fr_1fr] lg:gap-4">
          <HeroCarousel slides={slides} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
            {copy.promoTitle && (
              <a href="#deals" className="group relative isolate flex min-h-[180px] flex-col justify-end overflow-hidden rounded-2xl p-5 text-white" style={{ backgroundColor: NAVY }}>
                {promoImage && <Image src={promoImage} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="-z-10 object-cover opacity-45 transition-transform duration-700 group-hover:scale-105" />}
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b1530] via-[#0b1530]/50 to-transparent" />
                {copy.promoEyebrow && <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">{copy.promoEyebrow}</span>}
                <span className="sf-display mt-1 text-xl !leading-tight sm:text-2xl">{copy.promoTitle}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-white/85">
                  {copy.promoCta || "Shop deals"} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </a>
            )}
            {newest && (
              <Link href={productHref(newest)} className={`group relative isolate flex min-h-[180px] flex-col justify-end overflow-hidden p-5 ${panel}`}>
                {imageOf(newest) && (
                  <span className="absolute right-0 top-0 -z-10 h-[62%] w-full">
                    <Image src={imageOf(newest)!} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition-transform duration-700 [mask-image:linear-gradient(to_bottom,black_55%,transparent)] group-hover:scale-105" />
                  </span>
                )}
                <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--sf-accent-ink)" }}>New in</span>
                <span className="mt-0.5 line-clamp-1 text-sm font-bold" style={{ color: "var(--sf-ink)" }}>{newest.name}</span>
                <span className="text-sm font-extrabold" style={{ color: "var(--sf-ink)" }}>{formatCurrency(newest.price)}</span>
              </Link>
            )}
          </div>
        </div>
      </section>
    ),

    /* ─────────────── Category bar ─────────────── */
    categories: tiles.length > 0 && (
      <section className="px-4 lg:px-6">
        <Heading title={copy.categoriesTitle} href="#shop" link="All products" />
        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0">
          {tiles.map((c) => (
            <Link key={c.id} href={`${homeHref}?category=${c.slug}`} className={`group flex w-[104px] shrink-0 flex-col items-center gap-2 p-3 text-center transition-shadow hover:shadow-md sm:w-32 ${panel}`}>
              <span className="relative block aspect-square w-full overflow-hidden rounded-full bg-[#f4f6fa] dark:bg-white/5">
                {c.cover_image && <Image src={c.cover_image} alt="" fill sizes="112px" className="object-cover transition-transform duration-500 group-hover:scale-110" />}
              </span>
              <span className="line-clamp-1 text-[13px] font-semibold" style={{ color: "var(--sf-ink)" }}>{c.name}</span>
            </Link>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Perks ─────────────── */
    highlights: copy.highlights.length > 0 && (
      <section className="px-4 lg:px-6">
        <ul className={`grid grid-cols-2 lg:grid-cols-4 ${panel} divide-black/[0.06] dark:divide-white/10 lg:divide-x`}>
          {copy.highlights.map((h) => {
            const Icon = HIGHLIGHT_ICON[h.icon];
            return (
              <li key={h.title} className="flex items-center gap-3 p-4 sm:p-5">
                <span style={{ color: "var(--sf-accent-ink)" }}>
                  <Icon className="h-7 w-7" />
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

    /* ─────────────── Flash deals on navy ─────────────── */
    newArrivals: deals.length > 0 && (
      <section id="deals" className="scroll-mt-28 px-4 lg:px-6">
        <div className="grid gap-6 overflow-hidden rounded-2xl p-5 sm:p-8 lg:grid-cols-[280px_1fr] lg:items-center" style={{ backgroundColor: NAVY }}>
          <div className="text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "color-mix(in srgb, var(--sf-accent) 55%, #fff)" }}>Flash deals</p>
            <h2 className="mt-2 text-3xl !leading-tight">{copy.newArrivalsTitle || "Limited time."}</h2>
            <div className="mt-5">
              <DealClock />
            </div>
            <a href="#shop" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white/85 hover:text-white">
              View all deals <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
            {deals.map((p) => (
              <div key={p.id} className="w-[46%] shrink-0 sm:w-[32%] lg:w-auto">
                <ShopCard product={p} />
              </div>
            ))}
          </div>
        </div>
      </section>
    ),

    /* ─────────────── Featured collections ─────────────── */
    categoryRails: tiles.length > 0 && (
      <section className="px-4 lg:px-6">
        <Heading title="Featured collections" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.slice(0, 4).map((c) => {
            const top = products.find((p) => p.category_id === c.id);
            return (
              <Link key={c.id} href={`${homeHref}?category=${c.slug}`} className={`group flex min-h-[130px] items-center gap-3 overflow-hidden p-5 transition-shadow hover:shadow-md ${panel}`}>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold" style={{ color: "var(--sf-ink)" }}>{c.name}</span>
                  {top && <span className="mt-0.5 line-clamp-1 block text-xs opacity-55" style={{ color: "var(--sf-ink)" }}>{top.name}</span>}
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--sf-accent-ink)" }}>
                    Explore now <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
                {c.cover_image && (
                  <span className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
                    <Image src={c.cover_image} alt="" fill sizes="96px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    ),

    /* ─────────────── Top rated ─────────────── */
    featured: featured.length > 0 && (
      <section className="px-4 lg:px-6">
        <Heading title={copy.featuredTitle} href="#shop" link="View all" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          {featured.slice(0, rows(featured.length, 5)).map((p, i) => (
            <ShopCard key={p.id} product={p} badge={i === 0 ? "Best seller" : undefined} />
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Wide deal banner ─────────────── */
    promo: copy.promoTitle && (
      <section className="px-4 lg:px-6">
        <div className="relative isolate grid min-h-[220px] overflow-hidden rounded-2xl text-white sm:grid-cols-2" style={{ background: `linear-gradient(115deg, var(--sf-accent), ${NAVY} 80%)` }}>
          <div className="p-7 sm:p-10">
            {copy.promoEyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">{copy.promoEyebrow}</p>}
            <h2 className="mt-2 text-4xl sm:text-5xl">{copy.promoTitle}</h2>
            {copy.promoText && <p className="mt-2 max-w-sm text-sm text-white/75">{copy.promoText}</p>}
            <a href="#deals" className="sf-btn mt-5 bg-white px-6 py-3 text-sm text-zinc-900">
              {copy.promoCta || "Shop deals"} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          {(banners[2] ?? promoImage) && (
            <div className="relative hidden sm:block">
              <Image src={(banners[2] ?? promoImage)!} alt="" fill sizes="50vw" className="object-cover [mask-image:linear-gradient(to_right,transparent,black_40%)]" />
            </div>
          )}
        </div>
      </section>
    ),

    /* ─────────────── All products ─────────────── */
    allProducts: products.length > 0 && (
      <section id="shop" className="scroll-mt-28 px-4 lg:px-6">
        <Heading title={copy.allProductsTitle} />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          {products.map((p) => (
            <ShopCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Reviews ─────────────── */
    testimonials: testimonials.length > 0 && (
      <section className="px-4 lg:px-6">
        <Heading title={copy.testimonialsTitle} />
        <div className="grid gap-3 md:grid-cols-3">
          {testimonials.slice(0, 3).map((t) => (
            <figure key={t.id} className={`p-5 ${panel}`}>
              <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < t.rating ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
                ))}
              </div>
              <blockquote className="mt-3 text-sm leading-relaxed" style={{ color: "var(--sf-ink)" }}>“{t.body}”</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold" style={{ backgroundColor: "color-mix(in srgb, var(--sf-accent) 14%, transparent)", color: "var(--sf-accent-ink)" }}>
                  {t.customer_name.trim().charAt(0).toUpperCase()}
                </span>
                <span>
                  <span className="block text-sm font-bold" style={{ color: "var(--sf-ink)" }}>{t.customer_name}</span>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified buyer
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Stay in the loop ─────────────── */
    ctaBand: (
      <section className="px-4 lg:px-6">
        <div className="flex flex-col items-start justify-between gap-5 rounded-2xl p-7 text-white sm:flex-row sm:items-center sm:p-9" style={{ backgroundColor: "var(--sf-accent)" }}>
          <div>
            <h2 className="text-2xl sm:text-3xl">{copy.ctaTitle || "Stay in the loop"}</h2>
            {copy.ctaText && <p className="mt-1.5 max-w-lg text-sm text-white/80">{copy.ctaText}</p>}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <a href="#shop" className="sf-btn bg-white px-6 py-3 text-sm text-zinc-900">
              {copy.heroCta || "Shop now"} <ArrowRight className="h-4 w-4" />
            </a>
            {whatsappHref && (
              <a href={whatsappHref} {...ext(whatsappHref)} className="sf-btn border border-white/40 px-6 py-3 text-sm hover:bg-white/10">
                <MessageCircle className="h-4 w-4" /> WhatsApp
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

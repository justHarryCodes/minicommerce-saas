// Stride: a Signature streetwear / sneaker theme. A dark hero with the
// featured pair melting in from the right, bold condensed uppercase type and
// red accents; a perks bar, category tiles, featured sneakers, two promo
// banners, new drops, a big black sale banner (from real discounts) and a
// "stay in the loop" band.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { HIGHLIGHT_ICON } from "@/components/storefront/ThemeSections";
import type { SectionId } from "@/lib/themes/types";
import type { Product } from "@/types";
import type { StorefrontHomeProps } from "../../StorefrontHome";
import { imageOf } from "../utils";
import { KickCard } from "./StrideClient";

const BLACK = "#0a0a0a";
const offOf = (p: Product) => {
  const was = p.compare_price ?? p.comparePrice;
  return was && was > p.price ? Math.round((1 - p.price / was) * 100) : 0;
};

/** "Step up your style" → two lines, the last word in red. */
function Title({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return <span style={{ color: "var(--sf-accent)" }}>{text}</span>;
  const mid = Math.ceil((words.length - 1) / 2);
  return (
    <>
      {words.slice(0, mid).join(" ")}
      <br />
      {words.slice(mid, -1).join(" ")} <span style={{ color: "var(--sf-accent)" }}>{words[words.length - 1]}</span>
    </>
  );
}

function Heading({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="text-3xl uppercase sm:text-4xl" style={{ color: "var(--sf-ink)" }}>{title}</h2>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--sf-ink)" }}>
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

const rows = (n: number, per: number) => (n >= per * 2 ? per * 2 : n >= per ? per : n);

export default function StrideHome(props: StorefrontHomeProps) {
  const { store, theme, storeBase, products, categoryTiles, testimonials } = props;
  const homeHref = storeBase || "/";
  const copy = theme.copy;
  const featured = props.featuredProducts.length > 0 ? props.featuredProducts : products.slice(0, 8);
  const banners = store.banner_images ?? [];
  const heroImage = banners[0] ?? imageOf(featured[0]);
  const tiles = categoryTiles.filter((c) => c.product_count > 0);
  const byNewest = [...products].sort((a, b) => +new Date(String(b.created_at)) - +new Date(String(a.created_at)));
  const discounted = products.filter((p) => offOf(p) > 0).sort((a, b) => offOf(b) - offOf(a));
  const maxOff = discounted.length ? offOf(discounted[0]) : 0;
  const saleItem = discounted[0] ?? featured[1];
  const saleBanner = banners[1] ?? imageOf(saleItem);
  const dropItem = byNewest.find((p) => p.id !== saleItem?.id && imageOf(p) && imageOf(p)!.split("?")[0] !== saleBanner?.split("?")[0]) ?? byNewest[0];
  const catName = (id?: string | null) => props.topCategories.find((c) => c.id === id)?.name;
  const whatsappHref = store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}` : props.demoContact ? "#" : null;
  const ext = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {});

  const sections: Partial<Record<SectionId, React.ReactNode>> = {
    /* ─────────────── Dark hero ─────────────── */
    hero: (
      <section className="px-4 pt-4 lg:px-8 lg:pt-6">
        <div className="relative isolate overflow-hidden rounded-2xl text-white" style={{ backgroundColor: BLACK }}>
          {heroImage && (
            <div className="absolute inset-y-0 right-0 -z-10 w-full sm:w-[64%]">
              <Image src={heroImage} alt="" fill priority sizes="(min-width: 640px) 64vw, 100vw" className="sf-hero-zoom object-cover opacity-60 sm:opacity-100 sm:[mask-image:linear-gradient(to_right,transparent,black_38%)]" />
            </div>
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent sm:hidden" />
          <div className="sf-hero-in relative max-w-xl px-6 py-14 sm:px-12 sm:py-20 lg:py-24">
            {copy.heroEyebrow && <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: "var(--sf-accent)" }}>{copy.heroEyebrow}</p>}
            <h1 className="mt-3 text-6xl uppercase !leading-[0.88] sm:text-7xl lg:text-8xl">
              <Title text={copy.heroTitle || store.name} />
            </h1>
            <p className="mt-5 max-w-sm text-[15px] text-white/75">{copy.heroSubtitle || store.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#shop" className="sf-btn px-6 py-3.5 text-sm font-black uppercase tracking-wider text-white" style={{ backgroundColor: "var(--sf-accent)" }}>
                {copy.heroCta || "Shop now"} <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#drops" className="sf-btn border-2 border-white/80 px-6 py-3 text-sm font-black uppercase tracking-wider text-white hover:bg-white hover:text-black">
                Explore collection
              </a>
            </div>
          </div>
          {maxOff > 0 && (
            <div className="absolute right-5 top-5 hidden h-28 w-28 place-items-center rounded-full border-2 border-dashed text-center sm:grid lg:right-8 lg:top-8" style={{ borderColor: "var(--sf-accent)" }}>
              <span className="leading-none">
                <span className="block text-[11px] font-bold uppercase">Up to</span>
                <span className="sf-display block text-5xl" style={{ color: "var(--sf-accent)" }}>{maxOff}%</span>
                <span className="block text-[11px] font-bold uppercase">Off</span>
              </span>
            </div>
          )}
        </div>
      </section>
    ),

    /* ─────────────── Perks bar ─────────────── */
    highlights: copy.highlights.length > 0 && (
      <section className="px-4 lg:px-8">
        <ul className="grid grid-cols-2 gap-y-4 rounded-xl bg-white px-4 py-5 ring-1 ring-black/[0.06] dark:bg-white/[0.05] dark:ring-white/10 lg:grid-cols-4 lg:divide-x lg:divide-black/[0.06] dark:lg:divide-white/10">
          {copy.highlights.map((h) => {
            const Icon = HIGHLIGHT_ICON[h.icon];
            return (
              <li key={h.title} className="flex items-center gap-3 px-2 lg:justify-center">
                <span style={{ color: "var(--sf-ink)" }}>
                  <Icon className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-xs font-black uppercase tracking-wide" style={{ color: "var(--sf-ink)" }}>{h.title}</span>
                  <span className="block text-[11px] opacity-55" style={{ color: "var(--sf-ink)" }}>{h.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    ),

    /* ─────────────── Category tiles ─────────────── */
    categories: tiles.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.categoriesTitle} href="#shop" />
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:grid lg:grid-cols-5 lg:px-0">
          {tiles.slice(0, 10).map((c) => (
            <Link key={c.id} href={`${homeHref}?category=${c.slug}`} className="group relative flex w-40 shrink-0 flex-col overflow-hidden rounded-xl bg-white p-4 ring-1 ring-black/[0.06] transition-shadow hover:shadow-lg dark:bg-white/[0.05] dark:ring-white/10 lg:w-auto">
              <span className="text-base font-black uppercase" style={{ color: "var(--sf-ink)" }}>{c.name}</span>
              <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold opacity-55" style={{ color: "var(--sf-ink)" }}>
                Shop now <ArrowRight className="h-3 w-3" />
              </span>
              <span className="relative mt-3 block aspect-[4/3] overflow-hidden rounded-lg">
                {c.cover_image && <Image src={c.cover_image} alt="" fill sizes="(min-width: 1024px) 18vw, 160px" className="object-cover transition-transform duration-500 group-hover:scale-110" />}
              </span>
            </Link>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Featured ─────────────── */
    featured: featured.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.featuredTitle} href="#shop" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {featured.slice(0, rows(featured.length, 4)).map((p, i) => (
            <KickCard key={p.id} product={p} label={catName(p.category_id)} badge={i === 0 ? "Best seller" : undefined} />
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Two banners ─────────────── */
    promo: (
      <section className="grid gap-3 px-4 md:grid-cols-2 lg:px-8">
        {copy.promoTitle && (
          <a href="#shop" className="group relative isolate flex min-h-[220px] overflow-hidden rounded-xl p-7 text-white" style={{ backgroundColor: BLACK }}>
            {saleBanner && (
              <div className="absolute inset-y-0 right-0 -z-10 w-[60%]">
                <Image src={saleBanner} alt="" fill sizes="(min-width: 768px) 30vw, 60vw" className="object-cover transition-transform duration-700 [mask-image:linear-gradient(to_right,transparent,black_45%)] group-hover:scale-105" />
              </div>
            )}
            <div className="max-w-[55%]">
              {copy.promoEyebrow && <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--sf-accent)" }}>{copy.promoEyebrow}</p>}
              <h2 className="mt-2 text-4xl uppercase !leading-[0.95]">{copy.promoTitle}</h2>
              {copy.promoText && <p className="mt-2 text-sm text-white/65">{copy.promoText}</p>}
              <span className="sf-btn mt-5 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black">
                {copy.promoCta || "Shop the sale"} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </a>
        )}
        {dropItem && (
          <a href="#drops" className="group relative isolate flex min-h-[220px] overflow-hidden rounded-xl bg-white p-7 ring-1 ring-black/[0.06] dark:bg-white/[0.05] dark:ring-white/10">
            {imageOf(dropItem) && (
              <div className="absolute inset-y-0 right-0 -z-10 w-[55%]">
                <Image src={imageOf(dropItem)!} alt="" fill sizes="(min-width: 768px) 28vw, 55vw" className="object-cover transition-transform duration-700 [mask-image:linear-gradient(to_right,transparent,black_45%)] group-hover:scale-105" />
              </div>
            )}
            <div className="max-w-[55%]">
              <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--sf-accent-ink)" }}>Exclusive collection</p>
              <h2 className="mt-2 text-4xl uppercase !leading-[0.95]" style={{ color: "var(--sf-ink)" }}>New drops every week</h2>
              <p className="mt-2 text-sm opacity-60" style={{ color: "var(--sf-ink)" }}>Don&apos;t miss the heat.</p>
              <span className="sf-btn mt-5 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white" style={{ backgroundColor: BLACK }}>
                Explore now <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </a>
        )}
      </section>
    ),

    /* ─────────────── New drops ─────────────── */
    newArrivals: byNewest.length >= 4 && (
      <section id="drops" className="scroll-mt-28 px-4 lg:px-8">
        <Heading title={copy.newArrivalsTitle || "New drops"} href="#shop" />
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0">
          {byNewest.slice(0, 8).map((p) => (
            <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-[23.6%]">
              <KickCard product={p} label={catName(p.category_id)} badge="New" />
            </div>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Big sale banner ─────────────── */
    categoryRails: maxOff > 0 && (
      <section className="px-4 lg:px-8">
        <a href="#shop" className="group relative isolate grid min-h-[230px] items-center overflow-hidden rounded-xl px-7 py-10 text-white sm:grid-cols-[1fr_auto] sm:px-12" style={{ backgroundColor: BLACK }}>
          {imageOf(discounted[1] ?? discounted[0]) && (
            <div className="absolute inset-y-0 left-1/3 right-0 -z-10 opacity-50 sm:opacity-80">
              <Image src={imageOf(discounted[1] ?? discounted[0])!} alt="" fill sizes="66vw" className="object-cover [mask-image:linear-gradient(to_right,transparent,black_40%,black_60%,transparent)]" />
            </div>
          )}
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--sf-accent)" }}>Limited time only</p>
            <h2 className="mt-2 text-5xl uppercase sm:text-6xl">The big sale</h2>
            <p className="mt-1 text-sm text-white/65">Up to {maxOff}% off selected pairs</p>
            <span className="sf-btn mt-5 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black">
              Shop the sale <ArrowRight className="h-4 w-4" />
            </span>
          </div>
          <p className="sf-display mt-6 text-[7rem] leading-none sm:mt-0 sm:text-[11rem]" style={{ WebkitTextStroke: "2px var(--sf-accent)", color: "transparent" }}>
            {maxOff}%
          </p>
        </a>
      </section>
    ),

    /* ─────────────── All ─────────────── */
    allProducts: products.length > 0 && (
      <section id="shop" className="scroll-mt-28 px-4 lg:px-8">
        <Heading title={copy.allProductsTitle} />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {products.map((p) => (
            <KickCard key={p.id} product={p} label={catName(p.category_id)} />
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Reviews ─────────────── */
    testimonials: testimonials.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.testimonialsTitle} />
        <div className="grid gap-3 md:grid-cols-3">
          {testimonials.slice(0, 3).map((t) => (
            <figure key={t.id} className="rounded-xl bg-white p-6 ring-1 ring-black/[0.06] dark:bg-white/[0.05] dark:ring-white/10">
              <p className="sf-display text-2xl" style={{ color: "var(--sf-accent)" }}>{"★".repeat(Math.max(1, Math.min(5, t.rating)))}</p>
              <blockquote className="mt-2 text-sm leading-relaxed" style={{ color: "var(--sf-ink)" }}>“{t.body}”</blockquote>
              <figcaption className="mt-3 text-xs font-black uppercase tracking-wide" style={{ color: "var(--sf-ink)" }}>
                {t.customer_name}
                {t.product_name && <span className="font-semibold normal-case tracking-normal opacity-50"> · {t.product_name}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Stay in the loop ─────────────── */
    ctaBand: (
      <section className="px-4 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-5 rounded-xl px-7 py-9 text-white sm:flex-row sm:items-center sm:px-12" style={{ backgroundColor: BLACK }}>
          <div>
            <h2 className="text-4xl uppercase sm:text-5xl">
              {(copy.ctaTitle || "Stay in the loop").split(" ").slice(0, -1).join(" ")}{" "}
              <span style={{ color: "var(--sf-accent)" }}>{(copy.ctaTitle || "Stay in the loop").split(" ").slice(-1)}</span>
            </h2>
            {copy.ctaText && <p className="mt-1 max-w-lg text-sm text-white/65">{copy.ctaText}</p>}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <a href="#shop" className="sf-btn px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white" style={{ backgroundColor: "var(--sf-accent)" }}>
              {copy.heroCta || "Shop now"} <ArrowRight className="h-4 w-4" />
            </a>
            {whatsappHref && (
              <a href={whatsappHref} {...ext(whatsappHref)} className="sf-btn border-2 border-white/40 px-6 py-3 text-xs font-black uppercase tracking-wider hover:bg-white/10">
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

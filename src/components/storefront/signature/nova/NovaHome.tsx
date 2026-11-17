// Nova: a Signature fashion & lifestyle theme. A bright split hero with the
// model framed in an arch over a warm orange blob and product chips floating
// around her; a perks row, photo category cards, a new-arrivals rail, wide
// best-seller cards, a flash-sale countdown beside a dark "new collection"
// banner, reviews and a community band.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, MessageCircle, Star } from "lucide-react";
import { HIGHLIGHT_ICON } from "@/components/storefront/ThemeSections";
import type { SectionId } from "@/lib/themes/types";
import type { Product } from "@/types";
import type { StorefrontHomeProps } from "../../StorefrontHome";
import { imageOf } from "../utils";
import { BestCard, FloatChip, NovaCard, NovaClock } from "./NovaClient";

const offOf = (p: Product) => {
  const was = p.compare_price ?? p.comparePrice;
  return was && was > p.price ? Math.round((1 - p.price / was) * 100) : 0;
};
const H = "![font-family:var(--sf-heading-font)] !font-bold !normal-case !tracking-tight";

function Heading({ title, href, label = "View all" }: { title: string; href?: string; label?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className={`text-2xl sm:text-[28px] ${H}`} style={{ color: "var(--sf-ink)" }}>{title}</h2>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium opacity-70 hover:opacity-100" style={{ color: "var(--sf-ink)" }}>
          {label} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export default function NovaHome(props: StorefrontHomeProps) {
  const { store, theme, storeBase, products, categoryTiles, testimonials } = props;
  const homeHref = storeBase || "/";
  const copy = theme.copy;
  const featured = props.featuredProducts.length > 0 ? props.featuredProducts : products.slice(0, 6);
  const banners = store.banner_images ?? [];
  const heroImage = banners[0] ?? imageOf(featured[0]);
  const tiles = categoryTiles.filter((c) => c.product_count > 0);
  const newest = [...products].sort((a, b) => +new Date(String(b.created_at)) - +new Date(String(a.created_at)));
  const newIds = new Set(newest.slice(0, 4).map((p) => p.id));
  const chips = products.filter((p) => imageOf(p) && imageOf(p)!.split("?")[0] !== heroImage?.split("?")[0]).slice(0, 4);
  const discounted = products.filter((p) => offOf(p) > 0).sort((a, b) => offOf(b) - offOf(a));
  const maxOff = discounted.length ? offOf(discounted[0]) : 0;
  const flashImage = banners[1] ?? imageOf(discounted[0]);
  const collectionImage = banners[2] ?? imageOf(newest[0]);
  const reviewers = testimonials.slice(0, 4);
  const whatsappHref = store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}` : props.demoContact ? "#" : null;
  const ext = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {});

  const sections: Partial<Record<SectionId, React.ReactNode>> = {
    /* ─────────────── Split hero with floating chips ─────────────── */
    hero: (
      <section className="relative overflow-hidden px-4 lg:px-8">
        <style>{`@keyframes nova-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
        <div className="grid items-center gap-8 pb-4 pt-8 lg:grid-cols-[1fr_1.1fr] lg:pt-12">
          <div className="sf-hero-in">
            {copy.heroEyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--sf-accent-ink)" }}>{copy.heroEyebrow}</p>}
            <h1 className={`mt-3 max-w-xl text-[2.6rem] !leading-[1.05] sm:text-6xl ${H}`} style={{ color: "var(--sf-ink)" }}>
              {copy.heroTitle || store.name}
            </h1>
            <p className="mt-4 max-w-md text-[15px] opacity-65" style={{ color: "var(--sf-ink)" }}>{copy.heroSubtitle || store.description}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#shop" className="sf-btn px-6 py-3 text-sm font-semibold" style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
                {copy.heroCta || "Shop now"} <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#new" className="sf-btn border border-black/15 px-6 py-3 text-sm font-semibold hover:bg-black/[0.04] dark:border-white/20 dark:hover:bg-white/10" style={{ color: "var(--sf-ink)" }}>
                Explore collection
              </a>
            </div>
            {reviewers.length > 0 && (
              <div className="mt-8 flex items-center gap-3">
                <span className="flex -space-x-2">
                  {reviewers.map((t, i) => (
                    <span key={t.id} className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white ring-2 ring-[var(--sf-page)]" style={{ backgroundColor: ["#ff5a1f", "#111", "#f59e0b", "#6b7280"][i % 4] }}>
                      {t.customer_name.trim().charAt(0).toUpperCase()}
                    </span>
                  ))}
                </span>
                <span className="text-xs" style={{ color: "var(--sf-ink)" }}>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, n) => (
                      <Star key={n} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                  </span>
                  <span className="opacity-60">Loved by our customers</span>
                </span>
              </div>
            )}
          </div>

          <div className="relative mx-auto h-[400px] w-full max-w-[560px] sm:h-[500px]">
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 h-[78%] w-[86%] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] rounded-[42%_58%_60%_40%/45%_40%_60%_55%]"
              style={{ background: "linear-gradient(140deg, var(--sf-accent), color-mix(in srgb, var(--sf-accent) 55%, #ffd6c2))" }}
            />
            {heroImage && (
              <div className="absolute bottom-0 left-1/2 h-[92%] w-[58%] -translate-x-1/2 overflow-hidden rounded-t-full shadow-2xl">
                <Image src={heroImage} alt="" fill priority sizes="(min-width: 1024px) 330px, 58vw" className="sf-hero-zoom object-cover" />
              </div>
            )}
            {chips[0] && <FloatChip product={chips[0]} className="left-0 top-6" />}
            {chips[1] && <FloatChip product={chips[1]} className="right-0 top-0" delay={1.2} />}
            {chips[2] && <FloatChip product={chips[2]} className="bottom-24 left-0 hidden sm:block" delay={2.4} />}
            {chips[3] && <FloatChip product={chips[3]} className="bottom-4 right-0" delay={0.6} />}
          </div>
        </div>
      </section>
    ),

    /* ─────────────── Perks ─────────────── */
    highlights: copy.highlights.length > 0 && (
      <section className="px-4 lg:px-8">
        <ul className="grid grid-cols-2 gap-y-5 border-y border-black/[0.07] py-6 dark:border-white/10 lg:grid-cols-4 lg:divide-x lg:divide-black/[0.07] dark:lg:divide-white/10">
          {copy.highlights.map((h) => {
            const Icon = HIGHLIGHT_ICON[h.icon];
            return (
              <li key={h.title} className="flex items-center gap-3 px-2 lg:justify-center">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: "color-mix(in srgb, var(--sf-accent) 12%, transparent)", color: "var(--sf-accent-ink)" }}>
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold" style={{ color: "var(--sf-ink)" }}>{h.title}</span>
                  <span className="block text-[11px] opacity-55" style={{ color: "var(--sf-ink)" }}>{h.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    ),

    /* ─────────────── Photo category cards ─────────────── */
    categories: tiles.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.categoriesTitle} href="#shop" label="View all categories" />
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:grid lg:grid-cols-6 lg:px-0">
          {tiles.slice(0, 6).map((c) => (
            <Link key={c.id} href={`${homeHref}?category=${c.slug}`} className="group w-36 shrink-0 overflow-hidden rounded-2xl bg-zinc-50 ring-1 ring-black/[0.05] transition-shadow hover:shadow-lg dark:bg-white/[0.05] dark:ring-white/10 lg:w-auto">
              <span className="relative block aspect-[4/3.4] overflow-hidden">
                {c.cover_image && <Image src={c.cover_image} alt="" fill sizes="(min-width: 1024px) 16vw, 144px" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
              </span>
              <span className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span>
                  <span className="block text-[13px] font-semibold" style={{ color: "var(--sf-ink)" }}>{c.name}</span>
                  <span className="block text-[11px] opacity-50" style={{ color: "var(--sf-ink)" }}>Shop now</span>
                </span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: "var(--sf-ink)" }} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── New arrivals rail ─────────────── */
    newArrivals: newest.length >= 4 && (
      <section id="new" className="scroll-mt-28 px-4 lg:px-8">
        <Heading title={copy.newArrivalsTitle || "New arrivals"} href="#shop" label="View all new arrivals" />
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0">
          {newest.slice(0, 10).map((p) => (
            <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[calc((100%-60px)/6)]">
              <NovaCard product={p} isNew={newIds.has(p.id)} />
            </div>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Best sellers ─────────────── */
    featured: featured.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.featuredTitle} href="#shop" label="View all best sellers" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {featured.slice(0, 3).map((p) => (
            <BestCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Flash sale + new collection ─────────────── */
    promo: (
      <section className="grid gap-3 px-4 md:grid-cols-2 lg:px-8">
        {maxOff > 0 && (
          <a href="#shop" className="group relative isolate flex min-h-[230px] overflow-hidden rounded-3xl p-7 text-white" style={{ background: "linear-gradient(120deg, var(--sf-accent), color-mix(in srgb, var(--sf-accent) 60%, #ffb38a))" }}>
            {flashImage && (
              <div className="absolute inset-y-0 right-0 -z-10 w-1/2">
                <Image src={flashImage} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover transition-transform duration-700 [mask-image:linear-gradient(to_right,transparent,black_45%)] group-hover:scale-105" />
              </div>
            )}
            <div className="flex flex-col">
              <p className="text-sm font-medium text-white/90">{copy.promoEyebrow || "Flash sale"}</p>
              <p className={`mt-1 text-3xl text-white sm:text-4xl ${H}`}>Up to {maxOff}% off</p>
              <div className="mt-4">
                <NovaClock />
              </div>
              <span className="sf-btn mt-5 w-fit bg-white px-5 py-2.5 text-xs font-semibold" style={{ color: "var(--sf-accent-ink)" }}>
                {copy.promoCta || "Shop sale now"}
              </span>
            </div>
          </a>
        )}
        <a href="#new" className={`group relative isolate flex min-h-[230px] overflow-hidden rounded-3xl bg-zinc-950 p-7 text-white ${maxOff > 0 ? "" : "md:col-span-2"}`}>
          {collectionImage && (
            <div className="absolute inset-y-0 right-0 -z-10 w-[55%]">
              <Image src={collectionImage} alt="" fill sizes="(min-width: 768px) 28vw, 55vw" className="object-cover transition-transform duration-700 [mask-image:linear-gradient(to_right,transparent,black_45%)] group-hover:scale-105" />
            </div>
          )}
          <div className="flex max-w-[55%] flex-col justify-center">
            <p className="text-sm font-medium text-white/70">New collection</p>
            <h2 className={`mt-1 text-3xl text-white sm:text-4xl ${H}`}>{copy.promoTitle || "New season"}</h2>
            {copy.promoText && <p className="mt-2 text-sm text-white/70">{copy.promoText}</p>}
            <span className="sf-btn mt-5 w-fit bg-white px-5 py-2.5 text-xs font-semibold text-zinc-900">Shop collection</span>
          </div>
        </a>
      </section>
    ),

    /* ─────────────── Everything ─────────────── */
    allProducts: products.length > 0 && (
      <section id="shop" className="scroll-mt-28 px-4 lg:px-8">
        <Heading title={copy.allProductsTitle} />
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <NovaCard key={p.id} product={p} isNew={newIds.has(p.id)} />
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Reviews ─────────────── */
    testimonials: testimonials.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.testimonialsTitle} />
        <div className="grid gap-3 md:grid-cols-3">
          {testimonials.slice(0, 3).map((t, i) => (
            <figure key={t.id} className="rounded-2xl bg-zinc-50 p-6 ring-1 ring-black/[0.05] dark:bg-white/[0.05] dark:ring-white/10">
              <p className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, n) => (
                  <Star key={n} className={`h-4 w-4 ${n < t.rating ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
                ))}
              </p>
              <blockquote className="mt-3 text-sm leading-relaxed" style={{ color: "var(--sf-ink)" }}>“{t.body}”</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: ["var(--sf-accent)", "#111", "#f59e0b"][i % 3] }}>
                  {t.customer_name.trim().charAt(0).toUpperCase()}
                </span>
                <span>
                  <span className="block text-[13px] font-semibold" style={{ color: "var(--sf-ink)" }}>{t.customer_name}</span>
                  {t.product_name && <span className="block text-[11px] opacity-50" style={{ color: "var(--sf-ink)" }}>Bought {t.product_name}</span>}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Community band ─────────────── */
    ctaBand: (
      <section className="px-4 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-3xl px-7 py-10 text-center sm:px-12" style={{ backgroundColor: "color-mix(in srgb, var(--sf-accent) 10%, var(--sf-page))" }}>
          <span aria-hidden className="absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full opacity-25" style={{ backgroundColor: "var(--sf-accent)" }} />
          <span aria-hidden className="absolute -bottom-20 -left-12 -z-10 h-48 w-48 rounded-full opacity-15" style={{ backgroundColor: "var(--sf-accent)" }} />
          <h2 className={`text-3xl sm:text-4xl ${H}`} style={{ color: "var(--sf-ink)" }}>{copy.ctaTitle || "Join our community"}</h2>
          {copy.ctaText && <p className="mx-auto mt-2 max-w-lg text-sm opacity-65" style={{ color: "var(--sf-ink)" }}>{copy.ctaText}</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {whatsappHref && (
              <a href={whatsappHref} {...ext(whatsappHref)} className="sf-btn px-6 py-3 text-sm font-semibold" style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
                <MessageCircle className="h-4 w-4" /> Join on WhatsApp
              </a>
            )}
            <a href="#shop" className="sf-btn border border-black/15 px-6 py-3 text-sm font-semibold dark:border-white/20" style={{ color: "var(--sf-ink)" }}>
              {copy.heroCta || "Shop now"} <ArrowRight className="h-4 w-4" />
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

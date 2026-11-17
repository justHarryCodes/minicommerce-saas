// Terra: a Signature gadgets theme. Deep forest greens with a lime glow:
// a moody hero product that melts into the dark, a trust bar, three tall
// tinted showcase cards with a fact row, and colour-blocked product tiles.
// Section order and copy come from the theme, editable in the studio.

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Boxes, MessageCircle, Package, Quote, Star, Tag, Truck } from "lucide-react";
import { HIGHLIGHT_ICON } from "@/components/storefront/ThemeSections";
import { formatCurrency } from "@/lib/utils";
import type { SectionId } from "@/lib/themes/types";
import type { StorefrontHomeProps } from "../../StorefrontHome";
import { TechCard } from "../nexus/NexusClient";
import { imageOf } from "../utils";

const lime = { color: "var(--sf-accent)" };
// Card tints, as in the sample: olive, charcoal, slate · teal, plum, amber, moss
const TALL = ["linear-gradient(160deg,#4a5236,#23271a)", "linear-gradient(160deg,#26292a,#121414)", "linear-gradient(160deg,#2b3d52,#141d29)"];
const SMALL = ["linear-gradient(150deg,#1f4a46,#12292a)", "linear-gradient(150deg,#3a3256,#1d1a2e)", "linear-gradient(150deg,#6a4a1d,#2e200d)", "linear-gradient(150deg,#2f4a26,#172414)"];
// Product photos fade into the card instead of sitting in a box
const melt = "brightness-[.92] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]";

/** "Gear up for more" → last word lime; "A. B." → second sentence lime. */
function Title({ text }: { text: string }) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 1)
    return (
      <>
        {sentences[0]}
        <br />
        <span style={lime}>{sentences.slice(1).join(" ")}</span>
      </>
    );
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return <span style={lime}>{text}</span>;
  return (
    <>
      {words.slice(0, -1).join(" ")} <span style={lime}>{words[words.length - 1]}</span>
    </>
  );
}

function Heading({ title, href, link }: { title: string; href?: string; link?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
      <h2 className="text-2xl !uppercase sm:text-4xl" style={{ color: "var(--sf-ink)" }}>{title}</h2>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--sf-accent-ink)" }}>
          {link ?? "View all"} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function CircleArrow({ color = "var(--sf-accent)" }: { color?: string }) {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-full border-[1.5px] transition-colors group-hover:bg-[color:var(--sf-accent)] group-hover:text-black" style={{ borderColor: color, color }}>
      <ArrowRight className="h-4 w-4" />
    </span>
  );
}

const rows = (n: number, per: number) => (n >= per * 2 ? per * 2 : n >= per ? per : n);

export default function TerraHome(props: StorefrontHomeProps) {
  const { store, theme, storeBase, products, categoryTiles, testimonials } = props;
  const homeHref = storeBase || "/";
  const copy = theme.copy;
  const sectionsOn = theme.layout.sections;
  const featured = props.featuredProducts.length > 0 ? props.featuredProducts : products.slice(0, 8);
  const hero = featured[0] ?? products[0];
  const banners = store.banner_images ?? [];
  const heroImage = imageOf(hero) ?? banners[0] ?? null;
  const tiles = categoryTiles.filter((c) => c.product_count > 0);
  const byNewest = [...products].sort((a, b) => +new Date(String(b.created_at)) - +new Date(String(a.created_at)));
  const catName = (id?: string | null) => props.topCategories.find((c) => c.id === id)?.name;
  const productHref = (p: { slug?: string; id: string }) => `${storeBase}/products/${p.slug ?? p.id}`;
  const whatsappHref = store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}` : props.demoContact ? "#" : null;
  const ext = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {});

  // Real facts beside the hero product (no invented specs)
  const heroStock = hero ? (hero.stock_quantity ?? hero.stockQuantity ?? 0) : 0;
  const heroFacts = hero
    ? [
        { icon: Boxes, label: catName(hero.category_id) ?? "Featured" },
        { icon: Tag, label: formatCurrency(hero.price) },
        { icon: Package, label: heroStock > 0 ? (heroStock <= 5 ? `Only ${heroStock} left` : "In stock") : "Pre-order" },
      ]
    : [];

  const trustBar = copy.highlights.length > 0 && sectionsOn.includes("highlights") && (
    <ul className="grid grid-cols-2 gap-y-5 rounded-2xl border border-white/10 bg-[#121813]/90 px-4 py-5 backdrop-blur-xl sm:px-6 lg:grid-cols-4 lg:divide-x lg:divide-white/10">
      {copy.highlights.map((h) => {
        const Icon = HIGHLIGHT_ICON[h.icon];
        return (
          <li key={h.title} className="flex items-center justify-center gap-3 px-2">
            <span style={lime}>
              <Icon className="h-7 w-7" />
            </span>
            <span className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-white/85 sm:text-xs">{h.title}</span>
          </li>
        );
      })}
    </ul>
  );

  const sections: Partial<Record<SectionId, React.ReactNode>> = {
    /* ─────────────── Hero ─────────────── */
    hero: (
      <section className="relative isolate overflow-hidden bg-[#0b0f0c] text-white">
        {/* Forest glow + diagonal light streak */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_60%_40%,rgba(60,90,50,0.55),transparent_60%),linear-gradient(180deg,#101710,#0b0f0c)]" />
        <div aria-hidden className="absolute -right-[10%] -top-[30%] -z-10 h-[140%] w-[55%] rotate-[28deg] bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--sf-accent)_22%,transparent),transparent)] blur-2xl" />
        {banners[0] && <Image src={banners[0]} alt="" fill priority sizes="100vw" className="-z-20 object-cover opacity-[0.12] mix-blend-luminosity" />}

        <div className="mx-auto max-w-7xl px-4 pb-10 pt-36 lg:px-8 lg:pt-32">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr_auto]">
            <div className="sf-hero-in relative z-10">
              {copy.heroEyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em]" style={lime}>{copy.heroEyebrow}</p>}
              <h1 className="text-[2.8rem] !uppercase !leading-[0.98] sm:text-6xl lg:text-7xl" style={{ fontWeight: 800 }}>
                <Title text={copy.heroTitle || store.name} />
              </h1>
              <p className="mt-5 max-w-sm text-base text-white/70">{copy.heroSubtitle || store.description}</p>
              <a href="#shop" className="mt-7 inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-black transition-transform hover:-translate-y-0.5" style={{ backgroundColor: "var(--sf-accent)", boxShadow: "0 14px 34px -14px var(--sf-accent)" }}>
                {copy.heroCta || "Explore now"} <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {heroImage && (
              <div className="relative mx-auto aspect-square w-full max-w-[460px]">
                <div className="absolute inset-x-[12%] bottom-[6%] h-[16%] rounded-[50%] bg-black/60 blur-xl" />
                <Image src={heroImage} alt={hero?.name ?? store.name} fill priority sizes="(min-width: 1024px) 460px, 90vw" className={`sf-hero-zoom object-cover ${melt}`} />
              </div>
            )}

            {heroFacts.length > 0 && (
              <ul className="flex flex-wrap justify-center gap-x-6 gap-y-4 lg:flex-col lg:gap-7">
                {heroFacts.map((f) => (
                  <li key={f.label} className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-white/85">
                    <f.icon className="h-6 w-6 shrink-0" style={lime} />
                    <span className="max-w-[9rem] leading-tight">{f.label}</span>
                  </li>
                ))}
                {hero && (
                  <li>
                    <Link href={productHref(hero)} className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide" style={lime}>
                      {hero.name.length > 22 ? "View product" : hero.name} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </div>

          {trustBar && <div className="mt-10">{trustBar}</div>}
        </div>
      </section>
    ),

    // The trust bar sits inside the hero (above); nothing extra here
    highlights: null,

    /* ─────────────── Three tall showcase cards ─────────────── */
    categories: tiles.length > 0 && (
      <section className="px-4 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {tiles.slice(0, 3).map((c, i) => {
            const inCat = products.filter((p) => p.category_id === c.id);
            const top = inCat[0];
            const from = inCat.length ? Math.min(...inCat.map((p) => p.price)) : null;
            const img = top ? imageOf(top) : c.cover_image;
            const facts = [
              { icon: Package, label: `${c.product_count} products` },
              ...(from !== null ? [{ icon: Tag, label: `From ${formatCurrency(from)}` }] : []),
              { icon: Truck, label: copy.highlights[1]?.title ?? "Fast delivery" },
            ];
            return (
              <Link key={c.id} href={`${homeHref}?category=${c.slug}`} className="group relative isolate flex min-h-[460px] flex-col overflow-hidden rounded-2xl p-6 text-white ring-1 ring-white/5 sm:min-h-[520px]" style={{ background: TALL[i % TALL.length] }}>
                <span className="text-2xl font-bold !uppercase !leading-[1.05] sm:text-3xl">{c.name}</span>
                {top && <span className="mt-2 max-w-[70%] text-sm text-white/65">{top.name}</span>}
                <span className="mt-4 block h-px w-12 bg-white/40" />
                <span className="mt-5">
                  <CircleArrow />
                </span>
                {img && (
                  <span className="pointer-events-none absolute inset-x-0 bottom-20 top-32 -z-10">
                    <Image src={img} alt="" fill sizes="(min-width: 1024px) 30vw, 90vw" className={`object-cover transition-transform duration-700 group-hover:scale-105 ${melt}`} />
                  </span>
                )}
                <span className="mt-auto grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
                  {facts.map((f) => (
                    <span key={f.label} className="flex flex-col items-center gap-1.5">
                      <f.icon className="h-5 w-5 text-white/85" />
                      <span className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-white/70">{f.label}</span>
                    </span>
                  ))}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    ),

    /* ─────────────── Four colour-blocked tiles ─────────────── */
    featured: featured.length > 0 && (
      <section className="px-4 lg:px-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {featured.slice(0, 4).map((p, i) => {
            const img = imageOf(p);
            return (
              <Link key={p.id} href={productHref(p)} className="group relative isolate flex min-h-[200px] flex-col overflow-hidden rounded-2xl p-5 text-white ring-1 ring-white/5 sm:min-h-[220px]" style={{ background: SMALL[i % SMALL.length] }}>
                <span className="relative z-10 max-w-[62%] text-base font-bold uppercase !leading-tight sm:text-lg">{p.name}</span>
                <span className="relative z-10 mt-1 text-xs text-white/65">{formatCurrency(p.price)}</span>
                <span className="relative z-10 mt-auto">
                  <CircleArrow color="rgba(255,255,255,0.75)" />
                </span>
                {img && (
                  <span className="absolute -right-4 bottom-0 top-[22%] -z-10 w-[62%]">
                    <Image src={img} alt="" fill sizes="(min-width: 1024px) 15vw, 30vw" className={`object-cover transition-transform duration-700 group-hover:scale-110 ${melt}`} />
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    ),

    /* ─────────────── Offer banner ─────────────── */
    promo: copy.promoTitle && (
      <section className="px-4 lg:px-8">
        <div className="relative isolate grid min-h-[240px] items-center overflow-hidden rounded-2xl bg-[#101710] p-7 text-white ring-1 ring-white/5 sm:grid-cols-2 sm:p-10">
          <div aria-hidden className="absolute -left-[10%] -top-1/2 -z-10 h-[200%] w-1/2 rotate-[28deg] bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--sf-accent)_18%,transparent),transparent)] blur-2xl" />
          <div>
            {copy.promoEyebrow && <p className="text-xs font-bold uppercase tracking-[0.2em]" style={lime}>{copy.promoEyebrow}</p>}
            <h2 className="mt-2 text-3xl !uppercase sm:text-5xl">{copy.promoTitle}</h2>
            {copy.promoText && <p className="mt-3 max-w-sm text-sm text-white/65">{copy.promoText}</p>}
            <a href="#shop" className="mt-6 inline-flex items-center gap-2 rounded-md px-5 py-3 text-xs font-bold uppercase tracking-wide text-black" style={{ backgroundColor: "var(--sf-accent)" }}>
              {copy.promoCta || "Shop now"} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          {(banners[1] ?? imageOf(featured[1])) && (
            <div className="relative hidden h-full min-h-[220px] sm:block">
              <Image src={(banners[1] ?? imageOf(featured[1]))!} alt="" fill sizes="45vw" className={`object-cover ${melt}`} />
            </div>
          )}
        </div>
      </section>
    ),

    /* ─────────────── New arrivals rail ─────────────── */
    newArrivals: byNewest.length >= 4 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.newArrivalsTitle || "New arrivals"} href="#shop" />
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0">
          {byNewest.slice(0, 8).map((p) => (
            <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-[23.5%]">
              <TechCard product={p} eyebrow={catName(p.category_id)} />
            </div>
          ))}
        </div>
      </section>
    ),

    /* ─────────────── All products ─────────────── */
    allProducts: products.length > 0 && (
      <section id="shop" className="scroll-mt-28 px-4 lg:px-8">
        <Heading title={copy.allProductsTitle} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {products.slice(0, products.length > 8 ? products.length : rows(products.length, 4)).map((p) => (
            <TechCard key={p.id} product={p} eyebrow={catName(p.category_id)} />
          ))}
        </div>
      </section>
    ),

    /* ─────────────── Reviews ─────────────── */
    testimonials: testimonials.length > 0 && (
      <section className="px-4 lg:px-8">
        <Heading title={copy.testimonialsTitle} />
        <div className="grid gap-3 md:grid-cols-3 lg:gap-4">
          {testimonials.slice(0, 3).map((t) => (
            <figure key={t.id} className="nexus-card relative rounded-2xl p-6">
              <Quote className="absolute right-5 top-5 h-7 w-7 opacity-40" style={lime} />
              <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < t.rating ? "fill-current" : "opacity-25"}`} style={lime} />
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

    /* ─────────────── Final call ─────────────── */
    ctaBand: (
      <section className="px-4 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl p-7 sm:flex-row sm:items-center sm:p-10" style={{ backgroundColor: "var(--sf-accent)", color: "#0b0f0c" }}>
          <div>
            <h2 className="text-3xl !uppercase sm:text-4xl">{copy.ctaTitle || "Ready?"}</h2>
            {copy.ctaText && <p className="mt-2 max-w-lg text-sm opacity-75">{copy.ctaText}</p>}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <a href="#shop" className="inline-flex items-center gap-2 rounded-md bg-[#0b0f0c] px-6 py-3.5 text-xs font-bold uppercase tracking-wide text-white">
              {copy.heroCta || "Explore now"} <ArrowRight className="h-4 w-4" />
            </a>
            {whatsappHref && (
              <a href={whatsappHref} {...ext(whatsappHref)} className="inline-flex items-center gap-2 rounded-md border-2 border-[#0b0f0c] px-6 py-3 text-xs font-bold uppercase tracking-wide">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>
    ),
  };

  return (
    <div className="pb-4">
      {sectionsOn.map((id, i) =>
        sections[id] ? (
          <div key={id} className={id === "hero" && i === 0 ? "" : "sf-section mx-auto max-w-7xl"}>
            {sections[id]}
          </div>
        ) : null,
      )}
    </div>
  );
}

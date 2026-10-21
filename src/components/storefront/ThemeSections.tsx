// Server-rendered homepage building blocks. Each takes the resolved theme and
// renders the variant it asks for — StorefrontHome decides order/visibility.

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  CalendarCheck,
  Clock,
  Flame,
  Gift,
  Heart,
  LayoutGrid,
  Leaf,
  MessageCircle,
  Phone,
  Quote,
  RefreshCw,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import ProductCard from "@/components/storefront/ProductCard";
import HeroSlider from "@/components/storefront/HeroSlider";
import { clBanner, clLogo, isPreOptimized } from "@/lib/cloudinary";
import type { HighlightIcon, ResolvedTheme, Testimonial, ThemeLayout } from "@/lib/themes/types";
import type { Product, Store } from "@/types";

const onAccent = { backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" };
// Inverse of the accent — readable button on an accent-coloured panel.
const onAccentInverse = { backgroundColor: "var(--sf-on-accent)", color: "var(--sf-accent)" };
const accentTint = (pct: number) => ({ backgroundColor: `color-mix(in srgb, var(--sf-accent) ${pct}%, transparent)` });

export const scrollRow =
  "flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const isListCard = (layout: ThemeLayout) => layout.card === "menu" || layout.card === "service";

/** Product grid classes for the theme's card variant + column count. */
export function gridClass(layout: ThemeLayout): string {
  if (isListCard(layout)) return "grid grid-cols-1 gap-3 md:grid-cols-2 sm:gap-4";
  const gap = layout.card === "editorial" ? "gap-x-3 gap-y-9 sm:gap-x-5" : "gap-3 sm:gap-4";
  const cols: Record<ThemeLayout["columns"], string> = {
    2: "grid-cols-2",
    3: "grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  };
  return `grid ${cols[layout.columns]} ${gap}`;
}

/* ───────────────────────────── Headers ───────────────────────────── */

export function SectionHeader({
  title,
  eyebrow,
  subtitle,
  href,
  linkLabel = "See all",
  centered,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  centered?: boolean;
}) {
  if (centered) {
    return (
      <div className="mb-6 text-center sm:mb-8">
        {eyebrow && <p className="sf-eyebrow mb-2">{eyebrow}</p>}
        <h2 className="text-2xl text-surface-900 dark:text-white sm:text-4xl">{title}</h2>
        {subtitle && <p className="mx-auto mt-2 max-w-md text-sm text-surface-500 dark:text-surface-400">{subtitle}</p>}
        {href && (
          <Link
            href={href}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-surface-900 underline-offset-4 hover:underline dark:text-white"
          >
            {linkLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="sf-eyebrow mb-1.5">{eyebrow}</p>}
        <h2 className="text-xl text-surface-900 dark:text-white sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-surface-900 underline-offset-4 hover:underline dark:text-white"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

/* ───────────────────────────── Rails ───────────────────────────── */

const LG_COLS: Record<ThemeLayout["columns"], string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
};

/** Horizontal scroller on mobile, N-up grid on desktop; list cards render as a short grid. */
export function ProductRail({ products, slug, theme }: { products: Product[]; slug: string; theme: ResolvedTheme }) {
  const { layout } = theme;
  if (isListCard(layout)) {
    // Two-column list: keep an even count so the last row isn't half empty.
    const n = Math.min(6, products.length);
    const count = n > 1 && n % 2 === 1 ? n - 1 : n;
    return (
      <div className={gridClass(layout)}>
        {products.slice(0, count).map((p) => (
          <ProductCard key={p.id} product={p} storeSlug={slug} />
        ))}
      </div>
    );
  }
  const itemWidth = layout.card === "editorial" ? "w-[64%] sm:w-64" : "w-[44%] sm:w-52";
  return (
    <div className={`-mx-4 px-4 lg:mx-0 lg:grid ${LG_COLS[layout.columns]} lg:gap-5 lg:overflow-visible lg:px-0 ${scrollRow}`}>
      {products.map((product, i) => (
        <div key={product.id} className={`${itemWidth} shrink-0 snap-start lg:w-auto ${i >= layout.columns ? "lg:hidden" : ""}`}>
          <ProductCard product={product} storeSlug={slug} />
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────────── Hero ───────────────────────────── */

interface HeroProps {
  store: Store;
  theme: ResolvedTheme;
  bannerImages: string[];
  whatsappHref: string | null;
  ctaHref: string;
}

type Surface = "accent" | "image" | "plain";

function HeroButtons({ theme, whatsappHref, ctaHref, on, center }: Pick<HeroProps, "theme" | "whatsappHref" | "ctaHref"> & { on: Surface; center?: boolean }) {
  const primary = on === "accent" ? onAccentInverse : on === "image" ? { backgroundColor: "#fff", color: "#000" } : onAccent;
  const secondary =
    on === "accent"
      ? "border border-current/30 hover:bg-black/5"
      : on === "image"
        ? "border border-white/40 text-white hover:bg-white/10 backdrop-blur"
        : "border border-surface-300 text-surface-900 hover:bg-surface-100 dark:border-surface-600 dark:text-white dark:hover:bg-surface-800";
  return (
    <div className={`mt-7 flex flex-wrap gap-2.5 ${center ? "justify-center" : ""}`}>
      <a href={ctaHref} className="sf-btn px-7 py-3.5 text-sm" style={primary}>
        {theme.copy.heroCta} <ArrowRight className="h-4 w-4" />
      </a>
      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`sf-btn px-6 py-3.5 text-sm ${secondary}`}
          style={on === "accent" ? { color: "var(--sf-on-accent)", borderColor: "color-mix(in srgb, var(--sf-on-accent) 35%, transparent)" } : undefined}
        >
          <MessageCircle className="h-4 w-4" />
          Chat with us
        </a>
      )}
    </div>
  );
}

function LogoBadge({ store }: { store: Store }) {
  if (!store.logo_url) return null;
  return (
    <div className="w-fit rounded-[var(--sf-radius)] bg-white/90 p-2.5 shadow-sm">
      <Image src={clLogo(store.logo_url)} alt="" width={168} height={56} priority className="h-10 w-auto object-contain sm:h-12" />
    </div>
  );
}

function Eyebrow({ text, className = "", style }: { text: string; className?: string; style?: React.CSSProperties }) {
  if (!text) return null;
  return (
    <p className={`sf-eyebrow ${className}`} style={style}>
      {text}
    </p>
  );
}

function BrandPanel({ store, theme, whatsappHref, ctaHref, compact }: Omit<HeroProps, "bannerImages"> & { compact?: boolean }) {
  const title = theme.copy.heroTitle || store.name;
  const subtitle = theme.copy.heroSubtitle || store.description;
  return (
    <div
      className={`relative flex h-full flex-col justify-between overflow-hidden rounded-[calc(var(--sf-radius)*1.5)] ${
        compact ? "min-h-[360px] p-8 xl:p-10" : "min-h-[260px] p-7 sm:min-h-[380px] sm:p-14"
      }`}
      style={{
        background: "linear-gradient(140deg, var(--sf-accent-light, var(--sf-accent)) 0%, var(--sf-accent) 55%, var(--sf-accent-dark) 140%)",
        color: "var(--sf-on-accent)",
      }}
    >
      {/* soft decorative orb */}
      <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-25 blur-2xl" style={{ background: "var(--sf-on-accent)" }} />
      {store.logo_url ? <LogoBadge store={store} /> : <span />}
      <div className="sf-hero-in relative mt-10">
        <Eyebrow text={theme.copy.heroEyebrow} className="mb-3 !text-current opacity-75" />
        <h1 className={compact ? "text-3xl xl:text-4xl" : "text-4xl sm:text-6xl"}>{title}</h1>
        {subtitle && <p className="mt-4 line-clamp-3 max-w-md text-sm opacity-80 sm:text-base">{subtitle}</p>}
        <HeroButtons theme={theme} whatsappHref={whatsappHref} ctaHref={ctaHref} on="accent" />
      </div>
    </div>
  );
}

export function Hero(props: HeroProps) {
  const { store, theme, bannerImages, whatsappHref, ctaHref } = props;
  const hasBanner = bannerImages.length > 0;
  const title = theme.copy.heroTitle || store.name;
  const subtitle = theme.copy.heroSubtitle || store.description;

  switch (theme.layout.hero) {
    case "banner":
      return (
        <section className="px-2 pt-2 lg:px-6 lg:pt-6">
          {hasBanner ? (
            <>
              <h1 className="sr-only">{title}</h1>
              <div className="overflow-hidden rounded-[calc(var(--sf-radius)*1.5)]">
                <HeroSlider images={bannerImages} storeName={store.name} />
              </div>
            </>
          ) : (
            <BrandPanel {...props} />
          )}
        </section>
      );

    case "fullbleed":
      return (
        <section className="relative isolate flex min-h-[480px] items-end overflow-hidden sm:min-h-[640px]">
          <div className="sf-hero-zoom absolute inset-0 -z-10">
            {hasBanner ? (
              <Image src={clBanner(bannerImages[0])} unoptimized={isPreOptimized(bannerImages[0])} alt="" fill priority sizes="100vw" className="object-cover" />
            ) : (
              <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 80% 10%, var(--sf-accent) 0%, var(--sf-accent-dark) 45%, #050505 100%)" }} />
            )}
          </div>
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
          <div className="sf-hero-in mx-auto w-full max-w-7xl px-5 pb-12 text-white sm:pb-20 lg:px-8">
            <Eyebrow text={theme.copy.heroEyebrow} className="mb-4 !text-white/80" />
            <h1 className="max-w-4xl text-5xl sm:text-7xl lg:text-8xl">{title}</h1>
            {subtitle && <p className="mt-5 max-w-xl text-base text-white/80 sm:text-lg">{subtitle}</p>}
            <HeroButtons theme={theme} whatsappHref={whatsappHref} ctaHref={ctaHref} on="image" />
          </div>
        </section>
      );

    case "centered":
      return (
        <section className="px-3 pt-3 lg:px-6 lg:pt-6">
          <div className="relative overflow-hidden rounded-[calc(var(--sf-radius)*1.5)] px-6 py-16 text-center sm:py-24" style={accentTint(11)}>
            <span aria-hidden className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full opacity-40 blur-3xl" style={{ background: "var(--sf-accent)" }} />
            <span aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ background: "var(--sf-accent-light)" }} />
            <div className="sf-hero-in relative">
              {store.logo_url && (
                <div className="mb-6 flex justify-center">
                  <LogoBadge store={store} />
                </div>
              )}
              <Eyebrow text={theme.copy.heroEyebrow} className="mb-4" />
              <h1 className="mx-auto max-w-3xl text-4xl text-surface-900 dark:text-white sm:text-6xl lg:text-7xl">{title}</h1>
              {subtitle && <p className="mx-auto mt-5 max-w-xl text-base text-surface-600 dark:text-surface-300 sm:text-lg">{subtitle}</p>}
              <HeroButtons theme={theme} whatsappHref={whatsappHref} ctaHref={ctaHref} on="plain" center />
            </div>
          </div>
          {hasBanner && (
            <div className="mt-3 overflow-hidden rounded-[calc(var(--sf-radius)*1.5)] lg:mt-4">
              <HeroSlider images={bannerImages} storeName={store.name} />
            </div>
          )}
        </section>
      );

    case "minimal":
      return (
        <section className="px-4 pt-12 lg:px-6 lg:pt-20">
          <div className="sf-hero-in">
            <Eyebrow text={theme.copy.heroEyebrow} className="mb-5" />
            <h1 className="max-w-5xl text-5xl text-surface-900 dark:text-white sm:text-7xl lg:text-[5.5rem]">{title}</h1>
            <div className="mt-8 flex flex-col gap-5 border-b border-surface-200 pb-10 dark:border-surface-800 sm:flex-row sm:items-end sm:justify-between lg:pb-14">
              {subtitle ? <p className="max-w-lg text-base text-surface-500 dark:text-surface-400">{subtitle}</p> : <span />}
              <a
                href={ctaHref}
                className="group flex w-fit shrink-0 items-center gap-2 border-b-2 border-current pb-1 text-sm font-bold text-surface-900 dark:text-white"
              >
                {theme.copy.heroCta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
          {hasBanner && (
            <div className="mt-10 overflow-hidden rounded-[var(--sf-radius)]">
              <HeroSlider images={bannerImages} storeName={store.name} />
            </div>
          )}
        </section>
      );

    case "split":
    default:
      return (
        <section className="px-2 pt-2 lg:px-6 lg:pt-6">
          {hasBanner ? (
            <>
              <h1 className="sr-only lg:hidden">{title}</h1>
              <div className="grid gap-4 lg:min-h-[400px] lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-[calc(var(--sf-radius)*1.5)]">
                  <div className="lg:hidden">
                    <HeroSlider images={bannerImages} storeName={store.name} />
                  </div>
                  <div className="hidden h-full lg:block">
                    <HeroSlider images={bannerImages} storeName={store.name} fillHeight />
                  </div>
                </div>
                <div className="hidden lg:block">
                  <BrandPanel {...props} compact />
                </div>
              </div>
            </>
          ) : (
            <BrandPanel {...props} />
          )}
        </section>
      );
  }
}

/* ───────────────────────────── Highlights ───────────────────────────── */

const HIGHLIGHT_ICON: Record<HighlightIcon, React.ComponentType<{ className?: string }>> = {
  truck: Truck,
  clock: Clock,
  shield: ShieldCheck,
  star: Star,
  leaf: Leaf,
  sparkles: Sparkles,
  phone: Phone,
  refresh: RefreshCw,
  gift: Gift,
  scissors: Scissors,
  calendar: CalendarCheck,
  award: Award,
  flame: Flame,
  heart: Heart,
};

export function HighlightsSection({ theme }: { theme: ResolvedTheme }) {
  const items = theme.copy.highlights.filter((h) => h.title);
  if (!items.length) return null;
  const cols = items.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : items.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";
  return (
    <section className="sf-reveal px-4 lg:px-6">
      <ul className={`grid grid-cols-1 divide-y divide-surface-200/70 rounded-[calc(var(--sf-radius)*1.5)] border border-surface-200/70 dark:divide-surface-800 dark:border-surface-800 sm:divide-x sm:divide-y-0 ${cols}`}>
        {items.map((h, i) => {
          const Icon = HIGHLIGHT_ICON[h.icon] ?? Star;
          return (
            <li key={i} className="flex items-center gap-4 px-5 py-5 sm:px-6 sm:py-6">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ ...accentTint(14), color: "var(--sf-accent-ink)" }}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-surface-900 dark:text-white">{h.title}</span>
                {h.text && <span className="block text-xs text-surface-500 dark:text-surface-400 sm:text-[13px]">{h.text}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ───────────────────────────── Promo ───────────────────────────── */

export function PromoSection({ theme, image, href }: { theme: ResolvedTheme; image: string | null; href: string }) {
  const { promoEyebrow, promoTitle, promoText, promoCta } = theme.copy;
  if (!promoTitle) return null;
  return (
    <section className="sf-reveal px-4 lg:px-6">
      <div className="grid overflow-hidden rounded-[calc(var(--sf-radius)*1.5)] lg:grid-cols-2" style={accentTint(10)}>
        <div className="relative min-h-[260px] lg:order-2 lg:min-h-[440px]">
          {image ? (
            <Image src={clBanner(image)} unoptimized={isPreOptimized(image)} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(140deg, var(--sf-accent-light) 0%, var(--sf-accent) 60%, var(--sf-accent-dark) 140%)" }} />
          )}
        </div>
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
          {promoEyebrow && <p className="sf-eyebrow mb-3">{promoEyebrow}</p>}
          <h2 className="text-3xl text-surface-900 dark:text-white sm:text-5xl">{promoTitle}</h2>
          {promoText && <p className="mt-4 max-w-md text-base text-surface-600 dark:text-surface-300">{promoText}</p>}
          {promoCta && (
            <a href={href} className="sf-btn mt-8 w-fit px-7 py-3.5 text-sm" style={onAccent}>
              {promoCta} <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Testimonials ───────────────────────────── */

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-4 w-4" style={{ color: i < n ? "var(--sf-accent-ink)" : undefined, fill: i < n ? "currentColor" : "none", opacity: i < n ? 1 : 0.25 }} />
      ))}
    </span>
  );
}

export function TestimonialsSection({ theme, reviews, centered }: { theme: ResolvedTheme; reviews: Testimonial[]; centered?: boolean }) {
  const items = reviews.filter((r) => r.body?.trim()).slice(0, 6);
  if (!items.length) return null;
  const avg = items.reduce((s, r) => s + r.rating, 0) / items.length;
  return (
    <section className="sf-reveal px-4 lg:px-6">
      <SectionHeader
        title={theme.copy.testimonialsTitle}
        eyebrow={`★ ${avg.toFixed(1)} average rating`}
        centered={centered}
      />
      <div className={`-mx-4 px-4 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0 ${scrollRow}`}>
        {items.map((r) => (
          <figure
            key={r.id}
            className="flex w-[82%] shrink-0 snap-start flex-col gap-4 rounded-[var(--sf-radius)] border border-surface-200/70 bg-white p-6 dark:border-surface-800 dark:bg-surface-900 sm:w-96 lg:w-auto"
          >
            <div className="flex items-center justify-between">
              <Stars n={r.rating} />
              <Quote className="h-6 w-6 opacity-15" />
            </div>
            <blockquote className="line-clamp-5 flex-1 text-[15px] leading-relaxed text-surface-700 dark:text-surface-200">“{r.body}”</blockquote>
            <figcaption className="flex items-center gap-3 border-t border-surface-100 pt-4 dark:border-surface-800">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold" style={onAccent}>
                {r.customer_name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-surface-900 dark:text-white">{r.customer_name}</span>
                {r.product_name && <span className="block truncate text-xs text-surface-500 dark:text-surface-400">on {r.product_name}</span>}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────────── CTA band ───────────────────────────── */

export function CtaBand({ theme, whatsappHref, fallbackHref }: { theme: ResolvedTheme; whatsappHref: string | null; fallbackHref: string }) {
  // The band is a "talk to us" prompt — without a WhatsApp number it would
  // promise a chat it can't deliver, so it hides.
  if (!theme.copy.ctaTitle || !whatsappHref) return null;
  return (
    <section className="sf-reveal px-4 lg:px-6">
      <div
        className="relative overflow-hidden rounded-[calc(var(--sf-radius)*1.5)] px-7 py-12 sm:px-14 sm:py-16"
        style={{ background: "linear-gradient(120deg, var(--sf-accent) 0%, var(--sf-accent-dark) 130%)", color: "var(--sf-on-accent)" }}
      >
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full opacity-20 blur-2xl" style={{ background: "var(--sf-on-accent)" }} />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-5xl">{theme.copy.ctaTitle}</h2>
            {theme.copy.ctaText && <p className="mt-3 text-base opacity-80 sm:text-lg">{theme.copy.ctaText}</p>}
          </div>
          <a
            href={whatsappHref ?? fallbackHref}
            {...(whatsappHref ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="sf-btn shrink-0 px-8 py-4 text-sm"
            style={onAccentInverse}
          >
            {whatsappHref ? <><MessageCircle className="h-4 w-4" /> Chat on WhatsApp</> : <>{theme.copy.heroCta} <ArrowRight className="h-4 w-4" /></>}
          </a>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Categories ───────────────────────────── */

export interface CategoryTileData {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  cover_image: string | null;
  product_count: number;
}

export function CategoryStrip({
  tiles,
  homeHref,
  theme,
  shopAllHref,
}: {
  tiles: CategoryTileData[];
  homeHref: string;
  theme: ResolvedTheme;
  shopAllHref: string;
}) {
  const style = theme.layout.categories;
  const hrefFor = (slug: string) => `${homeHref}?category=${slug}`;

  if (style === "pills") {
    return (
      <div className={`gap-2 px-4 pb-1 lg:flex-wrap lg:px-0 ${scrollRow}`}>
        <Link href={shopAllHref} className="sf-btn shrink-0 whitespace-nowrap px-5 py-2.5 text-sm" style={onAccent}>
          All
        </Link>
        {tiles.map((cat) => (
          <Link
            key={cat.id}
            href={hrefFor(cat.slug)}
            className="sf-btn shrink-0 whitespace-nowrap border border-surface-200 px-5 py-2.5 text-sm !font-semibold text-surface-700 hover:border-[color:var(--sf-accent)] dark:border-surface-700 dark:text-surface-200"
          >
            {cat.name}
            <span className="text-xs font-medium opacity-50">{cat.product_count}</span>
          </Link>
        ))}
      </div>
    );
  }

  if (style === "cards") {
    const cols = tiles.length >= 4 ? "lg:grid-cols-4" : tiles.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";
    return (
      <div className={`gap-3 px-4 pb-1 sm:gap-4 lg:grid ${cols} lg:overflow-visible lg:px-0 ${scrollRow}`}>
        {tiles.slice(0, 8).map((cat) => (
          <Link
            key={cat.id}
            href={hrefFor(cat.slug)}
            className="group relative aspect-[4/5] w-[62%] shrink-0 snap-start overflow-hidden rounded-[var(--sf-radius)] bg-surface-200 dark:bg-surface-800 sm:w-64 lg:w-auto"
          >
            {cat.cover_image && (
              <Image src={cat.cover_image} unoptimized={isPreOptimized(cat.cover_image)} alt="" fill sizes="(min-width: 1024px) 25vw, 60vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="sf-display text-2xl sm:text-3xl">{cat.name}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/80">
                Shop {cat.product_count} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </p>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  // tiles / circles share structure; only the image shape differs
  const shape = style === "circles" ? "rounded-full" : "rounded-[var(--sf-radius)]";
  return (
    <div className={`gap-4 px-4 pb-1 lg:gap-6 lg:px-0 ${scrollRow}`}>
      <Link href={shopAllHref} className="group w-[76px] shrink-0 snap-start sm:w-24 lg:w-28">
        <div className={`grid aspect-square place-items-center ${shape} transition-transform group-hover:scale-[1.03]`} style={onAccent}>
          <LayoutGrid className="h-7 w-7" />
        </div>
        <span className="mt-2 block text-center text-xs font-semibold text-surface-800 dark:text-surface-200 sm:text-[13px]">Shop all</span>
      </Link>
      {tiles.map((cat) => (
        <Link key={cat.id} href={hrefFor(cat.slug)} className="group w-[76px] shrink-0 snap-start sm:w-24 lg:w-28">
          <div
            className={`relative aspect-square overflow-hidden ${shape} bg-surface-100 ring-1 ring-black/5 transition-shadow group-hover:ring-2 group-hover:ring-[color:var(--sf-accent)] dark:bg-surface-800 dark:ring-white/10`}
          >
            {cat.cover_image ? (
              <Image src={cat.cover_image} unoptimized={isPreOptimized(cat.cover_image)} alt="" fill sizes="(min-width: 1024px) 112px, 96px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-2xl font-black text-surface-400">{cat.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <span className="mt-2 line-clamp-2 block text-center text-xs font-semibold leading-tight text-surface-800 dark:text-surface-200 sm:text-[13px]">
            {cat.name}
          </span>
        </Link>
      ))}
    </div>
  );
}

/* ───────────────────────────── About ───────────────────────────── */

export function AboutSection({ store, whatsappHref, image }: { store: Store; whatsappHref: string | null; image?: string | null }) {
  const policy = store.return_policy ?? store.returnPolicy;
  if (!store.description && !whatsappHref && !store.phone && !policy) return null;
  return (
    <section className="sf-reveal px-4 lg:px-6">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
        {image && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-[calc(var(--sf-radius)*1.5)] bg-surface-100 dark:bg-surface-800">
            <Image src={clBanner(image)} unoptimized={isPreOptimized(image)} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
        )}
        <div className={image ? "" : "mx-auto max-w-2xl text-center"}>
          <p className="sf-eyebrow mb-3">Our story</p>
          <h2 className="text-3xl text-surface-900 dark:text-white sm:text-5xl">About {store.name}</h2>
          {store.description && (
            <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-surface-600 dark:text-surface-300">{store.description}</p>
          )}
          {policy && (
            <p className="mt-5 line-clamp-4 whitespace-pre-line text-sm text-surface-500 dark:text-surface-400">
              <span className="font-bold text-surface-700 dark:text-surface-200">Returns: </span>
              {policy}
            </p>
          )}
          {(whatsappHref || store.phone) && (
            <div className={`mt-8 flex flex-wrap gap-2.5 ${image ? "" : "justify-center"}`}>
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="sf-btn px-6 py-3.5 text-sm" style={onAccent}>
                  <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
                </a>
              )}
              {store.phone && (
                <a href={`tel:${store.phone}`} className="sf-btn border border-surface-300 px-6 py-3.5 text-sm text-surface-900 dark:border-surface-600 dark:text-white">
                  <Phone className="h-4 w-4" /> {store.phone}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

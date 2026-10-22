"use client";

// The five product page layouts. Each theme picks one (theme.layout.product);
// premium themes let the owner switch. All share useProductPage + blocks.
import { keySpecs } from "@/lib/product-details";
import type { ProductLayout } from "@/lib/themes/types";
import { MosaicGallery, StackGallery, SwipeGallery, ThumbGallery } from "./Gallery";
import {
  Assurances, Breadcrumb, BuyButtons, DetailAccordion, DetailTabs, Description, Highlights, Notices, Options, Price, Quantity, Related, Reviews,
  ScentNotes, SellerCard, Specs, StickyBar, Title, WhatsAppOrder as WhatsAppSlot, type BlockProps,
} from "./blocks";

const gallery = (s: BlockProps["s"], p: BlockProps["p"]) => ({ ...s, name: p.product.name });

/** Classic: thumbnails + photo beside a tidy buy box; details below. */
function Classic({ s, p }: BlockProps) {
  return (
    <>
      <Breadcrumb s={s} p={p} className="mb-5" />
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ThumbGallery g={gallery(s, p)} />
        <div className="space-y-6">
          <Title s={s} p={p} size="md" />
          <Price s={s} p={p} />
          <Options s={s} p={p} />
          <Notices s={s} p={p} />
          <Quantity s={s} p={p} />
          <BuyButtons s={s} p={p} />
          <WhatsAppSlot s={s} p={p} />
          <Assurances s={s} p={p} />
          <SellerCard s={s} p={p} />
        </div>
      </div>
      <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="space-y-6">
          <h2 className="sf-display text-2xl text-surface-900 dark:text-white">About this item</h2>
          <Description s={s} p={p} />
          <Highlights s={s} p={p} />
          <ScentNotes s={s} p={p} />
        </section>
        {s.details?.specs?.length ? (
          <section className="space-y-4">
            <h2 className="sf-display text-2xl text-surface-900 dark:text-white">Specifications</h2>
            <Specs s={s} p={p} />
          </section>
        ) : null}
      </div>
    </>
  );
}

/** Editorial: tall stacked photos, a quiet sticky column with an accordion. */
function Editorial({ s, p }: BlockProps) {
  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
        <StackGallery g={gallery(s, p)} />
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-7 lg:py-6">
            <Breadcrumb s={s} p={p} />
            <Title s={s} p={p} size="lg" />
            <Price s={s} p={p} look="plain" />
            {p.product.short_description && <p className="text-[15px] leading-relaxed text-surface-600 dark:text-surface-300">{p.product.short_description}</p>}
            <Options s={s} p={p} look="underline" />
            <Notices s={s} p={p} />
            <Quantity s={s} p={p} />
            <BuyButtons s={s} p={p} />
            <WhatsAppSlot s={s} p={p} />
            <DetailAccordion s={s} p={p} />
          </div>
        </div>
      </div>
    </>
  );
}

/** Showcase: big swipeable stage, key specs up front, tabbed details. */
function Showcase({ s, p }: BlockProps) {
  const top = keySpecs(s.details, 4);
  return (
    <>
      <Breadcrumb s={s} p={p} className="mb-5" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
        <div className="space-y-3">
          <SwipeGallery g={gallery(s, p)} aspect="aspect-square sm:aspect-[5/4]" sizes="(min-width: 1024px) 55vw, 100vw" />
          {s.images.length > 1 && (
            <div className="no-scrollbar hidden gap-2 overflow-x-auto sm:flex">
              {s.images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => s.setActiveImg(i)}
                  aria-label={`View photo ${i + 1}`}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden border-2 transition ${i === s.activeImg ? "border-[color:var(--sf-accent)]" : "border-transparent opacity-55 hover:opacity-100"}`}
                  style={{ borderRadius: "calc(var(--sf-radius) * .6)", backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="space-y-6">
          <Title s={s} p={p} size="lg" />
          {top.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {top.map((x) => (
                <div key={x.label} className="rounded-[var(--sf-radius)] border border-surface-100 px-3.5 py-3 dark:border-surface-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">{x.label}</p>
                  <p className="mt-0.5 truncate text-sm font-bold text-surface-900 dark:text-white">{x.value}</p>
                </div>
              ))}
            </div>
          )}
          <Price s={s} p={p} look="bold" />
          <Options s={s} p={p} look="boxes" />
          <Notices s={s} p={p} />
          <Quantity s={s} p={p} />
          <BuyButtons s={s} p={p} />
          <WhatsAppSlot s={s} p={p} />
          <SellerCard s={s} p={p} />
        </div>
      </div>
      <div className="mt-14">
        <DetailTabs s={s} p={p} />
      </div>
    </>
  );
}

/** Split: photo mosaic with a sticky purchase panel; notes and story below. */
function Split({ s, p }: BlockProps) {
  return (
    <>
      <Breadcrumb s={s} p={p} className="mb-5" />
      <div className="grid gap-8 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-10">
        <MosaicGallery g={gallery(s, p)} />
        <div className="md:sticky md:top-24 md:self-start">
          <div className="space-y-6 rounded-[var(--sf-radius)] border border-surface-100 bg-white p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,.25)] dark:border-surface-800 dark:bg-surface-900 sm:p-7">
            <Title s={s} p={p} size="md" />
            <Price s={s} p={p} look="plain" />
            <Options s={s} p={p} />
            <Notices s={s} p={p} />
            <Quantity s={s} p={p} />
            <BuyButtons s={s} p={p} />
            <WhatsAppSlot s={s} p={p} />
            <Assurances s={s} p={p} />
          </div>
        </div>
      </div>
      <div className="mt-14 grid gap-10 md:grid-cols-2">
        <section className="space-y-5">
          <p className="sf-eyebrow">The story</p>
          <Description s={s} p={p} />
          <Highlights s={s} p={p} />
        </section>
        <section className="space-y-5">
          {s.details?.notes ? (
            <>
              <p className="sf-eyebrow">The scent</p>
              <ScentNotes s={s} p={p} />
            </>
          ) : s.details?.specs?.length ? (
            <>
              <p className="sf-eyebrow">The details</p>
              <Specs s={s} p={p} />
            </>
          ) : (
            <SellerCard s={s} p={p} />
          )}
        </section>
      </div>
    </>
  );
}

/** Compact: one column, quick to scan and order — food and market stalls. */
function Compact({ s, p }: BlockProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumb s={s} p={p} className="mb-4" />
      <div className="grid gap-6 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] sm:items-start">
        <SwipeGallery g={gallery(s, p)} aspect="aspect-[4/3] sm:aspect-square" sizes="(min-width: 640px) 40vw, 100vw" />
        <div className="space-y-5">
          <Title s={s} p={p} size="md" eyebrow={false} />
          {p.product.short_description && <p className="text-sm leading-relaxed text-surface-600 dark:text-surface-300">{p.product.short_description}</p>}
          <Price s={s} p={p} look="plain" />
        </div>
      </div>
      <div className="mt-6 space-y-6">
        <Options s={s} p={p} />
        <Notices s={s} p={p} />
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--sf-radius)] bg-surface-50 p-4 dark:bg-surface-900">
          <Quantity s={s} p={p} big />
          <div className="min-w-[200px] flex-1">
            <BuyButtons s={s} p={p} share={false} />
          </div>
        </div>
        <WhatsAppSlot s={s} p={p} />
        <Highlights s={s} p={p} />
        <Description s={s} p={p} collapsible />
        <Specs s={s} p={p} />
        <SellerCard s={s} p={p} />
      </div>
    </div>
  );
}

export const PRODUCT_LAYOUT_VIEWS: Record<ProductLayout, (b: BlockProps) => React.ReactElement> = {
  classic: Classic,
  editorial: Editorial,
  showcase: Showcase,
  split: Split,
  compact: Compact,
};

/** Page shell: the chosen layout, then reviews, related and the phone buy bar. */
export function ProductPageView({ layout, s, p }: BlockProps & { layout: ProductLayout }) {
  const View = PRODUCT_LAYOUT_VIEWS[layout] ?? Classic;
  const narrow = layout === "compact";
  return (
    <div className="mx-auto max-w-6xl px-4 py-5 pb-28 md:pb-16">
      <View s={s} p={p} />
      <div className={`mt-16 space-y-16 ${narrow ? "mx-auto max-w-3xl" : ""}`}>
        <Reviews s={s} p={p} />
        <Related s={s} p={p} />
      </div>
      <StickyBar s={s} p={p} />
    </div>
  );
}

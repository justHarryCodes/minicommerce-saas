"use client";

// Product galleries. Every one swipes on phones (Embla) and opens the
// zoomable lightbox; on larger screens each has its own presentation.
import { useCallback, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import type { ProductPageState } from "./useProductPage";

const ProductLightbox = dynamic(() => import("./Lightbox"), { ssr: false });

type G = Pick<ProductPageState, "images" | "activeImg" | "setActiveImg" | "lightbox" | "setLightbox" | "hasDiscount" | "discountPct"> & { name: string };

const radius = { borderRadius: "var(--sf-radius)" };

function Empty() {
  return <div className="flex aspect-square w-full items-center justify-center bg-surface-100 text-5xl dark:bg-surface-800" style={radius}>🛍️</div>;
}

function DiscountBadge({ g }: { g: G }) {
  if (!g.hasDiscount) return null;
  return (
    <span className="absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-xs font-black shadow" style={{ background: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
      -{g.discountPct}%
    </span>
  );
}

function Viewer({ g }: { g: G }) {
  return g.lightbox ? (
    <ProductLightbox images={g.images} index={g.activeImg} open={g.lightbox} onClose={() => g.setLightbox(false)} onIndex={g.setActiveImg} alt={g.name} />
  ) : null;
}

/** Swipeable slider (used by every gallery on phones, and by Showcase everywhere). */
export function SwipeGallery({ g, aspect = "aspect-square", className = "", sizes = "100vw", viewer = true }: { g: G; aspect?: string; className?: string; sizes?: string; viewer?: boolean }) {
  const [ref, api] = useEmblaCarousel({ loop: g.images.length > 1 });
  useEffect(() => {
    if (!api) return;
    const onSelect = () => g.setActiveImg(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, g]);
  useEffect(() => {
    if (api && api.selectedScrollSnap() !== g.activeImg) api.scrollTo(g.activeImg);
  }, [api, g.activeImg]);
  const prev = useCallback(() => api?.scrollPrev(), [api]);
  const next = useCallback(() => api?.scrollNext(), [api]);
  if (!g.images.length) return <Empty />;
  return (
    <div className={`group relative ${className}`}>
      <div ref={ref} className="overflow-hidden bg-surface-50 dark:bg-surface-900" style={radius}>
        <div className="flex touch-pan-y">
          {g.images.map((src, i) => (
            <button key={src + i} type="button" onClick={() => g.setLightbox(true)} className={`relative min-w-0 flex-[0_0_100%] cursor-zoom-in ${aspect}`} aria-label={`Open photo ${i + 1} full screen`}>
              <Image src={src} alt={i === 0 ? g.name : ""} fill sizes={sizes} priority={i === 0} className="object-cover" />
            </button>
          ))}
        </div>
      </div>
      <DiscountBadge g={g} />
      {g.images.length > 1 && (
        <>
          <button type="button" onClick={prev} aria-label="Previous photo" className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-surface-900 shadow-lg opacity-0 transition group-hover:opacity-100 sm:flex">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={next} aria-label="Next photo" className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-surface-900 shadow-lg opacity-0 transition group-hover:opacity-100 sm:flex">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {g.images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => api?.scrollTo(i)}
                aria-label={`Photo ${i + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{ width: i === g.activeImg ? 22 : 6, background: i === g.activeImg ? "var(--sf-accent)" : "rgba(255,255,255,.75)" }}
              />
            ))}
          </div>
        </>
      )}
      {viewer && <Viewer g={g} />}
    </div>
  );
}

/** Classic: vertical thumbnails beside the main photo. */
export function ThumbGallery({ g }: { g: G }) {
  return (
    <>
      <div className="sm:hidden">
        <SwipeGallery g={g} viewer={false} />
      </div>
      <div className="hidden gap-3 sm:flex">
        {g.images.length > 1 && (
          <div className="no-scrollbar flex max-h-[560px] w-[76px] shrink-0 flex-col gap-2 overflow-y-auto">
            {g.images.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => g.setActiveImg(i)}
                aria-label={`View photo ${i + 1}`}
                className={`relative aspect-square w-full shrink-0 overflow-hidden border-2 transition ${i === g.activeImg ? "border-[color:var(--sf-accent)]" : "border-transparent opacity-60 hover:opacity-100"}`}
                style={{ borderRadius: "calc(var(--sf-radius) * .6)" }}
              >
                <Image src={src} alt="" fill sizes="76px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="group relative flex-1">
          {g.images.length ? (
            <button type="button" onClick={() => g.setLightbox(true)} className="relative block aspect-square w-full cursor-zoom-in overflow-hidden bg-surface-50 dark:bg-surface-900" style={radius} aria-label="Open photo full screen">
              <Image key={g.activeImg} src={g.images[g.activeImg]} alt={g.name} fill sizes="(min-width: 1024px) 45vw, 90vw" priority className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
              <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-surface-800 opacity-0 shadow transition group-hover:opacity-100">
                <Expand className="h-4 w-4" />
              </span>
            </button>
          ) : (
            <Empty />
          )}
          <DiscountBadge g={g} />
        </div>
      </div>
      <Viewer g={g} />
    </>
  );
}

/** Editorial: every photo stacked large; the info column stays put beside them. */
export function StackGallery({ g }: { g: G }) {
  return (
    <>
      <div className="lg:hidden">
        <SwipeGallery g={g} aspect="aspect-[4/5]" viewer={false} />
      </div>
      <div className="hidden flex-col gap-3 lg:flex">
        {g.images.length ? (
          g.images.map((src, i) => (
            <button key={src + i} type="button" onClick={() => { g.setActiveImg(i); g.setLightbox(true); }} className="relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden bg-surface-50 dark:bg-surface-900" style={radius} aria-label={`Open photo ${i + 1}`}>
              <Image src={src} alt={i === 0 ? g.name : ""} fill sizes="60vw" priority={i === 0} className="object-cover" />
              {i === 0 && <DiscountBadge g={g} />}
            </button>
          ))
        ) : (
          <Empty />
        )}
      </div>
      <Viewer g={g} />
    </>
  );
}

/** Split: a mosaic — one large photo, the rest in a two-column grid. */
export function MosaicGallery({ g }: { g: G }) {
  return (
    <>
      <div className="md:hidden">
        <SwipeGallery g={g} aspect="aspect-[4/5]" viewer={false} />
      </div>
      <div className="hidden grid-cols-2 gap-2 md:grid">
        {g.images.length ? (
          g.images.slice(0, 5).map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => { g.setActiveImg(i); g.setLightbox(true); }}
              className={`relative cursor-zoom-in overflow-hidden bg-surface-50 dark:bg-surface-900 ${i === 0 ? "col-span-2 aspect-[4/3]" : "aspect-square"}`}
              style={radius}
              aria-label={`Open photo ${i + 1}`}
            >
              <Image src={src} alt={i === 0 ? g.name : ""} fill sizes={i === 0 ? "50vw" : "25vw"} priority={i === 0} className="object-cover transition-transform duration-700 hover:scale-105" />
              {i === 0 && <DiscountBadge g={g} />}
              {i === 4 && g.images.length > 5 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-lg font-bold text-white">+{g.images.length - 5}</span>
              )}
            </button>
          ))
        ) : (
          <div className="col-span-2">
            <Empty />
          </div>
        )}
      </div>
      <Viewer g={g} />
    </>
  );
}

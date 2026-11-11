"use client";

// Building blocks for product pages. Layouts (./layouts) arrange these;
// they all read from useProductPage so behaviour never differs by theme.
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, m } from "framer-motion";
import {
  BadgeCheck, Check, ChevronDown, ChevronLeft, ChevronRight, CreditCard, Heart, History, Loader2, Lock, MessageCircle, Minus, Plus, RotateCcw, Send, Share2,
  ShieldCheck, ShoppingBag, Star, Store as StoreIcon, Truck, Zap,
} from "lucide-react";
import ProductCard from "@/components/storefront/ProductCard";
import { useStore } from "@/lib/store-context";
import { arrivalDate, deliveryDays } from "./useProductPage";
import BookingPicker from "@/components/storefront/BookingPicker";
import SizeGuideButton from "@/components/storefront/SizeGuideButton";
import BackInStockForm from "@/components/storefront/BackInStockForm";
import { clLogo } from "@/lib/cloudinary";
import { formatCurrency, getProductUrl, waLink } from "@/lib/utils";
import type { Product } from "@/types";
import type { PageProduct, ProductPageProps, ProductPageState } from "./useProductPage";

export type BlockProps = { s: ProductPageState; p: ProductPageProps };

/* ───────────────────────────── Head ───────────────────────────── */

export function Breadcrumb({ s, p, className = "" }: BlockProps & { className?: string }) {
  const product = p.product;
  return (
    <nav aria-label="Breadcrumb" className={`no-scrollbar flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-xs text-surface-500 dark:text-surface-400 ${className}`}>
      <Link href={s.homeHref} className="flex items-center gap-1 hover:text-surface-900 dark:hover:text-white">
        <ChevronLeft className="h-3.5 w-3.5" /> {p.store.name}
      </Link>
      {product.category_name && (
        <>
          <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
          <Link href={`${s.homeHref}?category=${product.category_slug}`} className="hover:text-surface-900 dark:hover:text-white">
            {product.category_name}
          </Link>
        </>
      )}
      <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
      <span className="max-w-[200px] truncate">{product.name}</span>
    </nav>
  );
}

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} style={{ width: size, height: size, fill: i < Math.round(rating) ? "#f59e0b" : "transparent", stroke: i < Math.round(rating) ? "#f59e0b" : "#d4d4d8" }} />
      ))}
    </span>
  );
}

export function Title({ s, p, size = "lg", eyebrow = true }: BlockProps & { size?: "md" | "lg" | "xl"; eyebrow?: boolean }) {
  const product = p.product;
  const cls = size === "xl" ? "text-4xl sm:text-5xl" : size === "lg" ? "text-3xl sm:text-4xl" : "text-2xl";
  return (
    <div>
      {eyebrow && product.category_name && (
        <Link href={`${s.homeHref}?category=${product.category_slug}`} className="sf-eyebrow mb-2 inline-block hover:underline">
          {product.category_name}
        </Link>
      )}
      <div className="flex items-start gap-3">
        <h1 className={`sf-display min-w-0 flex-1 text-surface-900 dark:text-white ${cls}`}>{product.name}</h1>
        <ActionIcons s={s} p={p} />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-surface-500 dark:text-surface-400">
        <a href="#reviews" className="inline-flex items-center gap-2 hover:underline">
          {s.reviewTotal > 0 ? (
            <>
              <Stars rating={s.avgRating} />
              <span className="font-semibold text-surface-700 dark:text-surface-200">{s.avgRating.toFixed(1)}</span>
              <span>({s.reviewTotal} review{s.reviewTotal === 1 ? "" : "s"})</span>
            </>
          ) : (
            <>
              <Stars rating={0} /> Be the first to review
            </>
          )}
        </a>
        {s.hasDiscount && (
          <span className="rounded px-1.5 py-0.5 font-bold text-white" style={{ background: "#e11d48" }}>
            Deal · {s.discountPct}% off
          </span>
        )}
        {s.inStock && !s.isBookable && <span className="font-semibold text-emerald-600 dark:text-emerald-400">In stock</span>}
      </div>
    </div>
  );
}

/** Save (heart) and share, beside the product name. */
export function ActionIcons({ s }: BlockProps) {
  const btn = "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-surface-200 transition hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800";
  return (
    <div className="flex shrink-0 gap-2 pt-1">
      <button type="button" onClick={s.toggleSaved} aria-pressed={s.saved} aria-label={s.saved ? "Remove from saved" : "Save for later"} className={btn}>
        <Heart className={`h-4 w-4 ${s.saved ? "fill-red-500 text-red-500" : "text-surface-600 dark:text-surface-300"}`} />
      </button>
      <button type="button" onClick={s.handleShare} aria-label="Share" className={btn}>
        {s.copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4 text-surface-600 dark:text-surface-300" />}
      </button>
    </div>
  );
}

/** Price, in three looks: a soft card, plain and large, or a bold accent strip. */
export function Price({ s, look = "card" }: BlockProps & { look?: "card" | "plain" | "bold" }) {
  // Few left: a filling bar makes the number felt
  const low = s.inStock && !s.isBookable && s.effectiveStock > 0 && s.effectiveStock <= 10;
  const stock = (
    <div className="mt-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <span className={`h-2 w-2 rounded-full ${!s.inStock ? "bg-red-400" : low ? "bg-orange-500" : "bg-emerald-500"}`} />
        {!s.inStock ? (
          <span className="text-red-500">{s.soldOutToday ? "Sold out today" : "Out of stock"}</span>
        ) : low ? (
          <span className="font-semibold text-orange-600 dark:text-orange-400">Hurry, only {s.effectiveStock} left</span>
        ) : (
          <span className="text-emerald-600 dark:text-emerald-400">In stock, ready to ship</span>
        )}
      </p>
      {low && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
          <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.max(8, (s.effectiveStock / 10) * 100)}%` }} />
        </div>
      )}
    </div>
  );
  const amount = (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`font-black tabular-nums text-surface-900 dark:text-white ${look === "plain" ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"}`}>{s.priceLabel}</span>
        {s.hasDiscount && (
          <>
            <span className="text-base text-surface-400 line-through">{formatCurrency(s.comparePrice!)}</span>
            <span className="rounded px-1.5 py-0.5 text-xs font-black text-white" style={{ background: "#e11d48" }}>
              -{s.discountPct}%
            </span>
          </>
        )}
      </div>
      {s.hasDiscount && (
        <p className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">You save {formatCurrency(s.savings)}</p>
      )}
    </div>
  );
  if (look === "plain") return <div>{amount}{stock}</div>;
  if (look === "bold")
    return (
      <div className="rounded-[var(--sf-radius)] p-5" style={{ background: "color-mix(in srgb, var(--sf-accent) 9%, transparent)" }}>
        {amount}
        {stock}
      </div>
    );
  return (
    <div className="rounded-[var(--sf-radius)] border border-surface-100 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
      {amount}
      {stock}
    </div>
  );
}

/* ───────────────────────────── Options ───────────────────────────── */

const COLOR_WORDS: Record<string, string> = {
  black: "#111111", white: "#ffffff", red: "#dc2626", blue: "#2563eb", navy: "#1e3a8a", green: "#16a34a", yellow: "#facc15", orange: "#f97316",
  pink: "#ec4899", purple: "#9333ea", brown: "#7c4a21", grey: "#9ca3af", gray: "#9ca3af", beige: "#e8dcc4", cream: "#f5ecd7", gold: "#d4af37",
  silver: "#c0c0c0", wine: "#7f1d1d", burgundy: "#7f1d1d", maroon: "#7f1d1d", nude: "#e3bc9a", blonde: "#e7c983", "jet black": "#0a0a0a", "natural black": "#1c1917",
};
const colorOf = (v: string) => (/^#[0-9a-f]{3,6}$/i.test(v) ? v : COLOR_WORDS[v.trim().toLowerCase()]);
const inches = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) && /("|inch|in\b|”)/i.test(v + '"') ? n : null;
};

export function Options({ s, look = "pills" }: BlockProps & { look?: "pills" | "boxes" | "underline" }) {
  if (!s.hasSizes) return null;
  return (
    <div className="space-y-5">
      {s.optionNames.map((name) => {
        const values = s.valuesFor(name);
        const isColour = /colou?r|shade/i.test(name) && values.every((v) => colorOf(v));
        const isLength = /length/i.test(name) && values.every((v) => inches(v) != null);
        const maxLen = isLength ? Math.max(...values.map((v) => inches(v)!)) : 1;
        return (
          <div key={name}>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-sm font-bold text-surface-900 dark:text-white">
                {name}
                {s.picked[name] && <span className="font-medium text-surface-500">: {s.picked[name]}</span>}
              </span>
              {!s.picked[name] && s.inStock && <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Choose a {name.toLowerCase()}</span>}
            </div>
            <div className={`flex flex-wrap ${isLength ? "items-end gap-2" : "gap-2"}`}>
              {values.map((value) => {
                const unavailable = !s.availableWith(name, value);
                const active = s.picked[name] === value;
                const select = () => s.pick(name, value);
                if (isColour)
                  return (
                    <button key={value} type="button" disabled={unavailable} onClick={select} aria-pressed={active} title={value}
                      className={`relative h-10 w-10 rounded-full border-2 p-0.5 transition ${active ? "border-[color:var(--sf-accent)] scale-110" : "border-transparent"} disabled:opacity-30`}>
                      <span className="block h-full w-full rounded-full border border-black/10" style={{ background: colorOf(value) }} />
                      {unavailable && <span className="absolute inset-0 m-auto h-px w-9 rotate-45 bg-surface-500" />}
                    </button>
                  );
                if (isLength) {
                  const h = 18 + (inches(value)! / maxLen) * 44;
                  return (
                    <button key={value} type="button" disabled={unavailable} onClick={select} aria-pressed={active}
                      className="flex w-12 flex-col items-center gap-1.5 disabled:opacity-30">
                      <span className="w-2.5 rounded-full transition-all" style={{ height: h, background: active ? "var(--sf-accent)" : "color-mix(in srgb, currentColor 18%, transparent)" }} />
                      <span className={`text-xs font-semibold ${active ? "text-surface-900 dark:text-white" : "text-surface-500"}`}>{value}</span>
                    </button>
                  );
                }
                const base =
                  look === "underline"
                    ? `px-1 pb-1.5 text-sm font-semibold border-b-2 ${active ? "border-[color:var(--sf-accent)] text-surface-900 dark:text-white" : "border-transparent text-surface-500 hover:text-surface-900 dark:hover:text-white"}`
                    : look === "boxes"
                      ? `min-w-[3.25rem] border px-3.5 py-3 text-sm font-semibold ${active ? "border-surface-900 bg-surface-900 text-white dark:border-white dark:bg-white dark:text-black" : "border-surface-200 text-surface-700 hover:border-surface-900 dark:border-surface-700 dark:text-surface-300"}`
                      : `min-w-[3rem] rounded-full border-2 px-4 py-2 text-sm font-bold ${active ? "text-[color:var(--sf-on-accent)]" : "border-surface-200 text-surface-700 hover:border-surface-400 dark:border-surface-700 dark:text-surface-300"}`;
                return (
                  <button key={value} type="button" disabled={unavailable} onClick={select} aria-pressed={active}
                    className={`transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-35 ${base}`}
                    style={look === "pills" && active && !unavailable ? { background: "var(--sf-accent)", borderColor: "var(--sf-accent)" } : look === "boxes" ? { borderRadius: "calc(var(--sf-radius) * .5)" } : undefined}>
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── Buying ───────────────────────────── */

export function Quantity({ s, big = false }: BlockProps & { big?: boolean }) {
  if (s.isBookable || !s.inStock) return null;
  const btn = `${big ? "h-12 w-12" : "h-10 w-10"} flex items-center justify-center rounded-full text-surface-700 transition hover:bg-white disabled:opacity-30 dark:text-surface-200 dark:hover:bg-surface-700`;
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1 rounded-full bg-surface-100 p-1 dark:bg-surface-800">
        <button type="button" onClick={() => s.setQty((q) => Math.max(1, q - 1))} disabled={s.needsSize || s.qty <= 1} aria-label="One less" className={btn}>
          <Minus className="h-4 w-4" />
        </button>
        <span className={`w-10 text-center font-black tabular-nums text-surface-900 dark:text-white ${big ? "text-lg" : "text-sm"}`}>{s.qty}</span>
        <button type="button" onClick={() => s.setQty((q) => Math.min(s.effectiveStock, q + 1))} disabled={s.needsSize || s.qty >= s.effectiveStock} aria-label="One more" className={btn}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {s.qty > 1 && <span className="text-sm text-surface-500">= {s.lineTotal}</span>}
    </div>
  );
}

/** Add to cart, and Buy now (add + straight to checkout). */
export function BuyButtons({ s, stacked = false }: BlockProps & { stacked?: boolean }) {
  if (!s.inStock) return null;
  const buyNow = !s.isBookable;
  return (
    <div className={`grid gap-2.5 ${buyNow && !stacked ? "grid-cols-2" : "grid-cols-1"}`}>
      <m.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={s.handleAdd}
        disabled={s.needsSize}
        className="sf-btn w-full border-2 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        style={
          s.added
            ? { background: "#10b981", borderColor: "#10b981", color: "#fff" }
            : buyNow
              ? { borderColor: "var(--sf-accent)", color: "var(--sf-accent-ink)" }
              : { background: "var(--sf-accent)", borderColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.span key={s.added ? "done" : "add"} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="flex items-center gap-2">
            {s.added ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
            {s.addLabel}
          </m.span>
        </AnimatePresence>
      </m.button>
      {buyNow && (
        <m.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={s.handleBuyNow}
          disabled={s.needsSize}
          className="sf-btn w-full border-2 py-3.5 text-sm shadow-[0_10px_24px_-10px_rgba(0,0,0,.45)] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "var(--sf-accent)", borderColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}
        >
          <Zap className="h-4 w-4" /> Buy now
        </m.button>
      )}
    </div>
  );
}

export function WhatsAppOrder({ s, p }: BlockProps) {
  const wa = p.store.whatsapp as string | undefined;
  if (!wa) return null;
  const product = p.product;
  const blurb = (product.short_description ?? product.description ?? "").slice(0, 120);
  const msg = [
    `Hello! I'd like to order from *${p.store.name}* 🛍️`,
    "",
    `*${product.name}*`,
    s.selectedSize ? `📏 ${s.optionNames.length > 1 ? "Options" : s.optionNames[0]}: ${s.selectedSize}` : "",
    `📦 Quantity: ${s.qty}`,
    `💰 Price: ${formatCurrency(s.unitPrice)} each`,
    `💳 Total: ${s.lineTotal}`,
    blurb ? `📝 ${blurb}${blurb.length === 120 ? "…" : ""}` : "",
    "",
    `🔗 Product: ${getProductUrl(p.storeSlug, product.slug)}`,
    "",
    "Please confirm availability and send payment details. Thank you! 🙏",
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <a href={waLink(wa, msg)} target="_blank" rel="noopener noreferrer" className="sf-btn w-full py-3.5 text-sm text-white" style={{ background: "#25D366" }}>
      <svg className="h-5 w-5 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.553 4.122 1.52 5.862L.057 23.743l5.994-1.573A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.652-.522-5.157-1.43l-.37-.22-3.56.933.951-3.473-.241-.381A9.963 9.963 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
      </svg>
      Order on WhatsApp · {s.lineTotal}
    </a>
  );
}

/** Booking, sold-out notice, size guide and back-in-stock — shown where relevant. */
export function Notices({ s, p }: BlockProps) {
  const product = p.product;
  return (
    <>
      {s.isBookable && p.bookingsEnabled === false && (
        <p className="rounded-[var(--sf-radius)] bg-surface-100 px-4 py-3 text-sm text-surface-600 dark:bg-surface-800 dark:text-surface-300">
          Online booking isn&apos;t available for this service right now — please contact the store to book.
        </p>
      )}
      {s.isBookable && p.bookingsEnabled !== false && (
        <BookingPicker storeSlug={p.storeSlug} productId={product.id} durationMinutes={product.duration_minutes ?? null} value={s.booking} onChange={s.setBooking} />
      )}
      {s.soldOutToday && (
        <p className="rounded-[var(--sf-radius)] bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">Sold out for today — check back tomorrow.</p>
      )}
      {s.sizeGuide && !s.isBookable && (
        <div className="-mb-2 flex justify-end">
          <SizeGuideButton guide={s.sizeGuide} productName={product.name} />
        </div>
      )}
      {p.stockAlertsEnabled !== false && !s.isBookable && !s.soldOutToday && (!s.inStock || (s.hasSizes && s.sizes.some((x) => x.stockQuantity <= 0))) && (
        <BackInStockForm storeSlug={p.storeSlug} productId={product.id} variantLabel={null} prompt={s.inStock ? "Your option sold out? Get a text when it's back" : undefined} />
      )}
    </>
  );
}

type PublicStoreExtras = {
  duka_pay_enabled?: boolean;
  bank_transfer_enabled?: boolean;
  pod_enabled?: boolean;
  free_delivery_threshold?: number | string | null;
  nin_verified?: boolean;
  created_at?: string;
};
const extras = (p: BlockProps["p"]) => p.store as unknown as PublicStoreExtras;

/** First ~140 characters of a policy, skipping a heading line like "Refund and Return Policy". */
function policyPreview(policy: string): string {
  const lines = policy.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const body = lines.filter((l) => !/policy$|^last updated/i.test(l)).join(" ") || lines.join(" ");
  const flat = body.replace(/\s+/g, " ");
  return flat.length > 140 ? `${flat.slice(0, 140).replace(/\s+\S*$/, "")}…` : flat;
}

/** "Get it by Thu, 14 Nov" — worked out in the browser so it uses the shopper's today. */
function ArrivalEstimate({ frame }: { frame: string | null | undefined }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const days = deliveryDays(frame);
    if (!days) return;
    const fmt = (d: Date) => d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
    const [lo, hi] = days;
    if (hi === 0) setLabel("Get it today");
    else if (lo === hi) setLabel(`Get it by ${fmt(arrivalDate(hi))}`);
    else setLabel(`Get it between ${fmt(arrivalDate(lo))} and ${fmt(arrivalDate(hi))}`);
  }, [frame]);
  if (!label) return null;
  return <span className="block font-semibold text-surface-900 dark:text-white">{label}</span>;
}

/** Delivery, returns and payment — the box every online shop has beside the buy button. */
export function Assurances({ p }: BlockProps) {
  const store = p.store;
  const x = extras(p);
  const [policyOpen, setPolicyOpen] = useState(false);
  const frame = store.delivery_time_frame;
  const freeOver = Number(x.free_delivery_threshold) > 0 ? Number(x.free_delivery_threshold) : null;
  const policy = (store.return_policy ?? "").trim();
  const methods = [
    x.duka_pay_enabled !== false ? "Card" : null,
    x.duka_pay_enabled !== false ? "USSD" : null,
    x.duka_pay_enabled !== false || x.bank_transfer_enabled ? "Bank transfer" : null,
    x.pod_enabled ? "Pay on delivery" : null,
  ].filter(Boolean) as string[];

  const row = "flex gap-3 px-4 py-3.5";
  const icon = "mt-0.5 h-5 w-5 shrink-0";
  return (
    <div className="divide-y divide-surface-100 overflow-hidden rounded-[var(--sf-radius)] border border-surface-200/80 bg-white text-sm dark:divide-surface-800 dark:border-surface-800 dark:bg-surface-900">
      <p className="bg-surface-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-surface-500 dark:bg-surface-800/60 dark:text-surface-400">Delivery &amp; returns</p>
      <div className={row}>
        <Truck className={icon} style={{ color: "var(--sf-accent-ink)" }} />
        <div className="min-w-0 space-y-0.5 text-surface-600 dark:text-surface-300">
          <ArrivalEstimate frame={frame} />
          <span className="block">{frame ? `Delivery in ${frame}` : "Delivery available nationwide"}</span>
          {freeOver && <span className="block font-semibold text-emerald-600 dark:text-emerald-400">Free delivery on orders over {formatCurrency(freeOver)}</span>}
        </div>
      </div>
      <div className={row}>
        <RotateCcw className={icon} style={{ color: "var(--sf-accent-ink)" }} />
        <div className="min-w-0 text-surface-600 dark:text-surface-300">
          <span className="block font-semibold text-surface-900 dark:text-white">Return policy</span>
          {policy ? (
            <>
              {policyOpen ? (
                <span className="block max-h-80 overflow-y-auto whitespace-pre-line pr-1">{policy}</span>
              ) : (
                <span className="block">{policyPreview(policy)}</span>
              )}
              {policy.length > 140 && (
                <button type="button" onClick={() => setPolicyOpen((o) => !o)} className="mt-1 text-xs font-bold underline underline-offset-2" style={{ color: "var(--sf-accent-ink)" }}>
                  {policyOpen ? "Show less" : "Read full policy"}
                </button>
              )}
            </>
          ) : (
            <span className="block">Questions about returns? Message the seller before you buy.</span>
          )}
        </div>
      </div>
      {methods.length > 0 && (
        <div className={row}>
          <CreditCard className={icon} style={{ color: "var(--sf-accent-ink)" }} />
          <div className="min-w-0">
            <span className="block font-semibold text-surface-900 dark:text-white">Pay your way</span>
            <span className="mt-1.5 flex flex-wrap gap-1.5">
              {methods.map((m) => (
                <span key={m} className="rounded border border-surface-200 px-2 py-0.5 text-xs font-semibold text-surface-700 dark:border-surface-700 dark:text-surface-200">
                  {m}
                </span>
              ))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Three reassurance tiles: secure payment, a verified seller, the theme's promise. */
export function TrustBadges({ s, p }: BlockProps) {
  const x = extras(p);
  const tiles = [
    { icon: Lock, title: "Secure payment", text: "Checkout protected by Paystack" },
    x.nin_verified ? { icon: BadgeCheck, title: "Verified seller", text: "Identity checked by Duka" } : null,
    // The theme's promises, minus any that repeat "secure payment"
    ...s.theme.copy.highlights
      .filter((h) => !/pay/i.test(h.title))
      .map((h) => ({ icon: h.icon === "truck" ? Truck : h.icon === "refresh" ? RotateCcw : ShieldCheck, title: h.title, text: h.text })),
  ].filter(Boolean).slice(0, 3) as { icon: typeof Lock; title: string; text: string }[];
  return (
    <ul className="grid grid-cols-3 gap-2">
      {tiles.map(({ icon: Icon, title, text }) => (
        <li key={title} className="rounded-[var(--sf-radius)] bg-surface-50 px-2 py-3 text-center dark:bg-surface-800/60">
          <Icon className="mx-auto h-5 w-5" style={{ color: "var(--sf-accent-ink)" }} />
          <p className="mt-1.5 text-[11px] font-bold leading-tight text-surface-900 dark:text-white sm:text-xs">{title}</p>
          <p className="mt-0.5 hidden text-[11px] leading-snug text-surface-500 sm:block">{text}</p>
        </li>
      ))}
    </ul>
  );
}

/** Who you're buying from: logo, verified tick, store rating, tenure, chat. */
export function SellerCard({ s, p }: BlockProps) {
  const store = p.store;
  const x = extras(p);
  const { ratings } = useStore();
  // Store rating: every product's reviews, weighted by count
  let sum = 0;
  let n = 0;
  for (const [avg, count] of Object.values(ratings)) {
    sum += avg * count;
    n += count;
  }
  const storeRating = n ? sum / n : 0;
  const since = x.created_at ? new Date(x.created_at).getFullYear() : null;
  const wa = store.whatsapp ? `https://wa.me/${String(store.whatsapp).replace(/[^0-9]/g, "")}` : null;
  return (
    <div className="rounded-[var(--sf-radius)] border border-surface-200/80 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
      <div className="flex items-center gap-3">
        {store.logo_url ? (
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-surface-100 bg-white dark:border-surface-800">
            <Image src={clLogo(store.logo_url)} alt={store.name} fill sizes="48px" className="object-contain p-1" />
          </span>
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black" style={{ background: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
            {store.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">Sold by</p>
          <p className="flex items-center gap-1 truncate text-sm font-bold text-surface-900 dark:text-white">
            <span className="truncate">{store.name}</span>
            {x.nin_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-500" aria-label="Verified seller" />}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-surface-500 dark:text-surface-400">
            {n > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-surface-700 dark:text-surface-200">{storeRating.toFixed(1)}</span> ({n})
              </span>
            )}
            {since && <span>On Duka since {since}</span>}
          </p>
        </div>
      </div>
      <div className={`mt-3 grid gap-2 ${wa ? "grid-cols-2" : "grid-cols-1"}`}>
        <Link href={s.homeHref} className="flex items-center justify-center gap-1.5 rounded-[var(--sf-radius-btn,0.75rem)] border border-surface-200 py-2 text-xs font-bold text-surface-800 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-100 dark:hover:bg-surface-800">
          <StoreIcon className="h-3.5 w-3.5" /> Visit store
        </Link>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-[var(--sf-radius-btn,0.75rem)] border border-surface-200 py-2 text-xs font-bold text-surface-800 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-100 dark:hover:bg-surface-800">
            <MessageCircle className="h-3.5 w-3.5 text-emerald-500" /> Chat with seller
          </a>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── Details ───────────────────────────── */

export function Highlights({ s }: BlockProps) {
  const h = s.details?.highlights;
  if (!h?.length) return null;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {h.map((x) => (
        <li key={x} className="flex items-start gap-2 text-sm text-surface-700 dark:text-surface-200">
          <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--sf-accent-ink)" }} /> {x}
        </li>
      ))}
    </ul>
  );
}

export function Specs({ s }: BlockProps) {
  const specs = s.details?.specs;
  if (!specs?.length) return null;
  return (
    <dl className="divide-y divide-surface-100 overflow-hidden rounded-[var(--sf-radius)] border border-surface-100 dark:divide-surface-800 dark:border-surface-800">
      {specs.map((x) => (
        <div key={x.label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-3 text-sm odd:bg-surface-50/60 dark:odd:bg-surface-900/60">
          <dt className="text-surface-500">{x.label}</dt>
          <dd className="font-semibold text-surface-900 dark:text-white">{x.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Perfume: top / heart / base notes as a three-tier pyramid. */
export function ScentNotes({ s }: BlockProps) {
  const n = s.details?.notes;
  if (!n) return null;
  const tiers = [
    { key: "Top notes", hint: "The first impression", list: n.top, w: "60%" },
    { key: "Heart notes", hint: "The character", list: n.heart, w: "80%" },
    { key: "Base notes", hint: "What lingers", list: n.base, w: "100%" },
  ].filter((t) => t.list.length);
  return (
    <div className="space-y-2">
      {tiers.map((t, i) => (
        <m.div
          key={t.key}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
          className="mx-auto rounded-[var(--sf-radius)] px-4 py-3 text-center"
          style={{ width: t.w, background: `color-mix(in srgb, var(--sf-accent) ${10 + i * 6}%, transparent)` }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--sf-accent-ink)" }}>
            {t.key} <span className="font-medium normal-case tracking-normal opacity-70">· {t.hint}</span>
          </p>
          <p className="mt-1 text-sm font-semibold text-surface-900 dark:text-white">{t.list.join(" · ")}</p>
        </m.div>
      ))}
    </div>
  );
}

export function Description({ p, collapsible = false }: BlockProps & { collapsible?: boolean }) {
  const text = p.product.description;
  const [open, setOpen] = useState(!collapsible);
  if (!text) return null;
  if (!collapsible) return <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-surface-600 dark:text-surface-300">{text}</p>;
  return (
    <div className="border-y border-surface-200/70 dark:border-surface-800">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between py-4 text-sm font-bold uppercase tracking-[0.14em] text-surface-900 dark:text-white" aria-expanded={open}>
        Description <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="whitespace-pre-wrap pb-5 text-[15px] leading-relaxed text-surface-600 dark:text-surface-300">{text}</p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Accordion for editorial pages: description, notes/specs, delivery. */
export function DetailAccordion({ s, p }: BlockProps) {
  const sections = [
    p.product.description ? { title: "Description", body: <p className="whitespace-pre-wrap">{p.product.description}</p> } : null,
    s.details?.notes ? { title: "Scent notes", body: <ScentNotes s={s} p={p} /> } : null,
    s.details?.specs?.length ? { title: "Specifications", body: <Specs s={s} p={p} /> } : null,
    s.details?.highlights?.length ? { title: "Highlights", body: <Highlights s={s} p={p} /> } : null,
    { title: "Delivery & returns", body: <Assurances s={s} p={p} /> },
  ].filter(Boolean) as { title: string; body: React.ReactNode }[];
  const [open, setOpen] = useState<string | null>(sections[0]?.title ?? null);
  return (
    <div className="divide-y divide-surface-200/70 border-y border-surface-200/70 dark:divide-surface-800 dark:border-surface-800">
      {sections.map((sec) => (
        <div key={sec.title}>
          <button type="button" onClick={() => setOpen(open === sec.title ? null : sec.title)} className="flex w-full items-center justify-between py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-surface-900 dark:text-white" aria-expanded={open === sec.title}>
            {sec.title} <Plus className={`h-4 w-4 transition-transform ${open === sec.title ? "rotate-45" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            {open === sec.title && (
              <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="pb-5 text-[15px] leading-relaxed text-surface-600 dark:text-surface-300">{sec.body}</div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

/** Tabs for showcase pages: overview, specs, reviews. */
export function DetailTabs({ s, p }: BlockProps) {
  const tabs = [
    { id: "overview", label: "Overview", body: <div className="space-y-6"><Description s={s} p={p} /><Highlights s={s} p={p} /><ScentNotes s={s} p={p} /></div> },
    s.details?.specs?.length ? { id: "specs", label: "Specifications", body: <Specs s={s} p={p} /> } : null,
    { id: "delivery", label: "Delivery & returns", body: <div className="max-w-xl"><Assurances s={s} p={p} /></div> },
  ].filter(Boolean) as { id: string; label: string; body: React.ReactNode }[];
  const [tab, setTab] = useState(tabs[0].id);
  return (
    <div>
      <div className="no-scrollbar flex gap-6 overflow-x-auto border-b border-surface-200/70 dark:border-surface-800">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`relative pb-3 text-sm font-bold transition ${tab === t.id ? "text-surface-900 dark:text-white" : "text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"}`}>
            {t.label}
            {tab === t.id && <span className="absolute inset-x-0 -bottom-px h-0.5" style={{ background: "var(--sf-accent)" }} />}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <m.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="pt-6">
          {tabs.find((t) => t.id === tab)!.body}
        </m.div>
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────────── Reviews ───────────────────────────── */

export function Reviews({ s, p }: BlockProps) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ customer_name: "", customer_email: "", rating: 0, body: "" });
  const [hover, setHover] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name || !form.rating) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/storefront/${p.storeSlug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: p.product.id, customer_name: form.customer_name, customer_email: form.customer_email || undefined, rating: form.rating, body: form.body || undefined }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
      setShowForm(false);
    } catch {
      setError("We couldn't submit your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const input = "w-full rounded-xl border border-surface-200 bg-white px-4 py-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--sf-accent)] dark:border-surface-700 dark:bg-surface-800 dark:text-white";
  return (
    <section id="reviews" className="scroll-mt-28">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="sf-eyebrow mb-1">Reviews</p>
          <h2 className="sf-display text-2xl text-surface-900 dark:text-white">What customers say</h2>
        </div>
        {!showForm && !submitted && (
          <button type="button" onClick={() => setShowForm(true)} className="sf-btn px-4 py-2.5 text-sm" style={{ background: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
            Write a review
          </button>
        )}
      </div>
      {submitted && <p className="mb-6 flex items-center gap-2 rounded-[var(--sf-radius)] bg-emerald-50 p-4 text-sm font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"><Check className="h-4 w-4" /> Thanks! Your review is pending approval.</p>}
      <AnimatePresence>
        {showForm && (
          <m.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={submit} className="mb-8 space-y-4 overflow-hidden rounded-[var(--sf-radius)] border border-surface-100 bg-surface-50 p-5 dark:border-surface-800 dark:bg-surface-900">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setForm((f) => ({ ...f, rating: n }))} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} aria-label={`Rate ${n} stars`} className="p-0.5">
                  <Star className="h-8 w-8" style={{ fill: n <= (hover || form.rating) ? "#f59e0b" : "transparent", stroke: n <= (hover || form.rating) ? "#f59e0b" : "#d4d4d8" }} />
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className={input} required placeholder="Your name" value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} />
              <input className={input} type="email" placeholder="Email (optional)" value={form.customer_email} onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))} />
            </div>
            <textarea className={`${input} resize-none`} rows={3} maxLength={1000} placeholder="What did you like or dislike?" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={submitting || !form.customer_name || !form.rating} className="sf-btn px-5 py-2.5 text-sm disabled:opacity-50" style={{ background: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit review
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 text-sm text-surface-500">Cancel</button>
            </div>
          </m.form>
        )}
      </AnimatePresence>
      {s.reviewsLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-surface-400" /></div>
      ) : s.reviews.length === 0 ? (
        <p className="rounded-[var(--sf-radius)] border border-dashed border-surface-200 py-10 text-center text-sm text-surface-400 dark:border-surface-700">No reviews yet. Be the first!</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          <div className="rounded-[var(--sf-radius)] border border-surface-100 p-5 dark:border-surface-800 lg:sticky lg:top-28">
            <p className="text-5xl font-black text-surface-900 dark:text-white">{s.avgRating.toFixed(1)}</p>
            <div className="mt-2"><Stars rating={s.avgRating} size={16} /></div>
            <p className="mt-1 text-xs text-surface-400">{s.reviewTotal} review{s.reviewTotal === 1 ? "" : "s"}</p>
            <div className="mt-4 space-y-1.5">
              {[5, 4, 3, 2, 1].map((n) => (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-3 font-semibold text-surface-500">{n}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${s.reviews.length ? (s.distribution[n - 1] / s.reviews.length) * 100 : 0}%` }} />
                  </div>
                  <span className="w-5 text-right text-surface-400">{s.distribution[n - 1]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {s.reviews.map((r) => (
              <div key={r.id} className="rounded-[var(--sf-radius)] border border-surface-100 p-5 dark:border-surface-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-black" style={{ background: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>{r.customer_name.charAt(0).toUpperCase()}</span>
                    <div>
                      <p className="text-sm font-bold text-surface-900 dark:text-white">{r.customer_name}</p>
                      <p className="text-xs text-surface-400">{new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                  </div>
                  <Stars rating={r.rating} />
                </div>
                {r.body && <p className="mt-3 text-sm leading-relaxed text-surface-600 dark:text-surface-300">{r.body}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

const productGrid = "grid grid-cols-2 gap-0.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4";

export function Related({ p, title }: BlockProps & { title?: string }) {
  if (!p.related.length) return null;
  const category = p.product.category_name;
  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="sf-eyebrow mb-1">Explore more</p>
          <h2 className="sf-display text-2xl text-surface-900 dark:text-white">{title ?? (category ? `More from ${category}` : "You might also like")}</h2>
        </div>
      </div>
      <div className={productGrid}>
        {p.related.map((r: Product) => (
          <ProductCard key={r.id} product={r} storeSlug={p.storeSlug} />
        ))}
      </div>
    </section>
  );
}

/** Products this shopper opened before, on this device. */
export function RecentlyViewed({ s, p }: BlockProps) {
  const items = s.recentlyViewed.slice(0, 8);
  if (!items.length) return null;
  return (
    <section>
      <div className="mb-5 flex items-center gap-2">
        <History className="h-5 w-5 text-surface-400" />
        <h2 className="sf-display text-2xl text-surface-900 dark:text-white">Recently viewed</h2>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:gap-3">
        {items.map((r) => (
          <div key={r.id} className="w-[42%] shrink-0 sm:w-52">
            <ProductCard product={r as unknown as Product} storeSlug={p.storeSlug} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Phone buy bar pinned to the bottom of the screen. */
export function StickyBar({ s }: BlockProps) {
  if (!s.inStock) return null;
  const buyNow = !s.isBookable;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-100 bg-white/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-md dark:border-surface-800 dark:bg-surface-900/95 md:hidden">
      <div className="flex items-center gap-2">
        <button type="button" onClick={s.toggleSaved} aria-pressed={s.saved} aria-label={s.saved ? "Remove from saved" : "Save for later"} className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--sf-radius-btn,0.75rem)] border border-surface-200 dark:border-surface-700">
          <Heart className={`h-5 w-5 ${s.saved ? "fill-red-500 text-red-500" : "text-surface-600 dark:text-surface-300"}`} />
        </button>
        <button
          type="button"
          onClick={s.handleAdd}
          disabled={s.needsSize}
          className="sf-btn h-12 flex-1 border-2 px-2 text-sm disabled:opacity-60"
          style={
            s.added
              ? { background: "#10b981", borderColor: "#10b981", color: "#fff" }
              : buyNow
                ? { borderColor: "var(--sf-accent)", color: "var(--sf-accent-ink)" }
                : { background: "var(--sf-accent)", borderColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }
          }
        >
          {s.added ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
          <span className="truncate">{s.needsSize ? s.addLabel : s.added ? "Added" : buyNow ? "Add to cart" : s.addLabel}</span>
        </button>
        {buyNow && (
          <button type="button" onClick={s.handleBuyNow} disabled={s.needsSize} className="sf-btn h-12 flex-1 border-2 px-2 text-sm disabled:opacity-60" style={{ background: "var(--sf-accent)", borderColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
            <span className="flex flex-col items-center leading-tight">
              <span>Buy now</span>
              <span className="text-[11px] font-semibold opacity-80">{s.lineTotal}</span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export type { PageProduct };

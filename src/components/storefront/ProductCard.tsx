"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Check, Heart, Plus, ShoppingBag, ArrowRight, Star } from "lucide-react";
import { useState } from "react";
import { useCart } from "./CartProvider";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useStore } from "@/lib/store-context";
import { formatCurrency } from "@/lib/utils";
import { clCard, isPreOptimized } from "@/lib/cloudinary";
import type { Product } from "@/types";

interface Props {
  product: Product;
  storeSlug: string;
}

const onAccent = { backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" };

function plainText(html?: string): string {
  return (html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function ProductCard({ product, storeSlug }: Props) {
  const { addItem } = useCart();
  const { isBookmarked, toggleBookmark } = useBookmarks(storeSlug);
  const { storeBase, theme, ratings } = useStore();
  const [added, setAdded] = useState(false);

  const images = product.images ?? [];
  const imageUrl = images[0] ?? product.image_url ?? null;
  const hoverImageUrl = images[1] ?? null;
  const stockQty = product.stock_quantity ?? product.stockQuantity ?? 0;
  const comparePrice = product.compare_price ?? product.comparePrice;
  const hasDiscount = comparePrice && comparePrice > product.price;
  const discountPct = hasDiscount ? Math.round((1 - product.price / comparePrice!) * 100) : 0;
  const bookmarked = isBookmarked(product.id);
  const soldOutToday = Boolean(product.sold_out_today);
  const isBookable = Boolean(product.is_bookable ?? product.isBookable);
  const outOfStock = (stockQty === 0 && !isBookable) || soldOutToday;
  const hasSizes = product.has_sizes ?? product.hasSizes ?? false;
  const href = `${storeBase}/products/${product.slug ?? product.id}`;
  const blurb = plainText(product.short_description ?? product.shortDescription ?? product.description);
  const addLabel = isBookable ? "Book now" : hasSizes ? "Choose options" : theme.copy.addToCart;

  function handleAddToCart(e: React.MouseEvent) {
    if (outOfStock) { e.preventDefault(); return; }
    // Sized products need a size picked first — let the click fall through
    // to the card's own Link instead of adding straight to cart.
    if (hasSizes || isBookable) return; // pick options / a time on the product page
    e.preventDefault();
    e.stopPropagation();
    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image_url: imageUrl ?? undefined,
      stock_quantity: stockQty,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  function handleBookmark(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark({
      id: product.id,
      name: product.name,
      slug: product.slug ?? product.id,
      price: product.price,
      compare_price: comparePrice ?? null,
      image_url: imageUrl,
    });
  }

  const price = (
    <div className="flex items-baseline gap-1.5">
      <span className="font-black text-[15px] text-surface-900 dark:text-white">
        {formatCurrency(product.price)}
      </span>
      {hasDiscount && (
        <span className="text-[11px] text-surface-400 line-through">{formatCurrency(comparePrice!)}</span>
      )}
    </div>
  );

  // What the shopper saves, from the gap between the old and new price
  const savings = hasDiscount ? (
    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
      You save {formatCurrency(comparePrice! - product.price)}
    </p>
  ) : null;

  // Stars from approved reviews (only when the product has any)
  const rating = ratings[product.id];
  const ratingRow = rating ? (
    <div className="flex items-center gap-1 text-[11px]" aria-label={`Rated ${rating[0]} out of 5 from ${rating[1]} review${rating[1] === 1 ? "" : "s"}`}>
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${i <= Math.round(rating[0]) ? "fill-amber-400 text-amber-400" : "fill-surface-200 text-surface-200 dark:fill-surface-700 dark:text-surface-700"}`}
          />
        ))}
      </span>
      <span className="font-semibold text-surface-700 dark:text-surface-300">{rating[0].toFixed(1)}</span>
      <span className="text-surface-400">({rating[1]})</span>
    </div>
  ) : null;

  // Low stock nudge
  const lowStock = !outOfStock && !isBookable && stockQty > 0 && stockQty <= 5 ? (
    <p className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">Only {stockQty} left</p>
  ) : null;

  const blurbLine = blurb ? (
    <p className="line-clamp-1 text-[11px] leading-snug text-surface-500 dark:text-surface-400">{blurb}</p>
  ) : null;

  const discountBadge = hasDiscount && (
    <div className="absolute top-2.5 left-2.5 z-[2] px-1.5 py-0.5 text-[11px] font-black tracking-wide" style={onAccent}>
      -{discountPct}%
    </div>
  );

  /** Add to cart: always visible, under the heart. */
  function cartIcon(Icon: typeof ShoppingCart = ShoppingCart) {
    if (outOfStock) return null;
    return (
      <button
        onClick={handleAddToCart}
        aria-label={added ? "Added to cart" : addLabel}
        title={addLabel}
        className="absolute top-12 right-2.5 z-[2] w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-200 hover:scale-110 active:scale-95"
        style={added ? { backgroundColor: "#10b981", color: "#fff" } : onAccent}
      >
        {added ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
      </button>
    );
  }

  const bookmarkButton = (
    <button
      onClick={handleBookmark}
      aria-label={bookmarked ? "Remove bookmark" : "Save product"}
      className={`absolute top-2.5 right-2.5 z-[2] w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-200 ${
        bookmarked
          ? "bg-red-500 text-white scale-110"
          : "bg-white/90 dark:bg-surface-800/90 text-surface-400 hover:text-red-500 hover:scale-110"
      }`}
    >
      <Heart className={`w-3.5 h-3.5 ${bookmarked ? "fill-current" : ""}`} />
    </button>
  );

  const soldOut = outOfStock && (
    <div className="absolute inset-0 z-[1] bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
      <span className="bg-white/90 text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">{soldOutToday ? "Sold out today" : "Out of stock"}</span>
    </div>
  );

  function photo(sizes: string, extra = "") {
    return imageUrl ? (
      <Image
        src={clCard(imageUrl)}
        unoptimized={isPreOptimized(imageUrl)}
        alt={product.name}
        fill
        sizes={sizes}
        className={`object-cover transition-all duration-500 ease-out ${extra}`}
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-4xl text-surface-200 dark:text-surface-700">🛍️</div>
    );
  }

  const gridSizes = "(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

  // ── Menu: horizontal row, photo on the right (food) ─────────────────────
  if (theme.layout.card === "menu") {
    return (
      <Link
        href={href}
        prefetch={false}
        className="group flex gap-4 p-3 sm:p-4 rounded-[var(--sf-radius)] bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)] transition-shadow"
      >
        <div className="flex flex-1 min-w-0 flex-col">
          <p className="font-bold text-surface-900 dark:text-white leading-snug line-clamp-2">{product.name}</p>
          {blurb && <p className="mt-1 text-xs text-surface-500 dark:text-surface-400 line-clamp-2">{blurb}</p>}
          <div className="mt-auto pt-2">{price}</div>
        </div>
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 overflow-hidden rounded-[var(--sf-radius)] bg-surface-50 dark:bg-surface-800">
          {photo("112px", "group-hover:scale-[1.05]")}
          {soldOut}
          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            aria-label={addLabel}
            className="absolute bottom-1.5 right-1.5 z-[2] flex h-8 min-w-8 items-center justify-center gap-1 rounded-full px-2 text-xs font-bold shadow-md transition-transform active:scale-95 disabled:opacity-40"
            style={added ? { backgroundColor: "#10b981", color: "#fff" } : onAccent}
          >
            {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </Link>
    );
  }

  // ── Service: description-led card with a booking button ────────────────
  if (theme.layout.card === "service") {
    return (
      <Link
        href={href}
        prefetch={false}
        className="group flex gap-4 p-4 sm:p-5 rounded-[var(--sf-radius)] bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 hover:border-[color:var(--sf-accent)] transition-colors"
      >
        {imageUrl && (
          <div className="relative w-20 h-20 sm:w-28 sm:h-28 shrink-0 overflow-hidden rounded-[var(--sf-radius)] bg-surface-50 dark:bg-surface-800">
            {photo("112px")}
          </div>
        )}
        <div className="flex flex-1 min-w-0 flex-col gap-1.5">
          <p className="sf-heading text-base sm:text-lg font-bold text-surface-900 dark:text-white leading-snug">{product.name}</p>
          {blurb && <p className="text-sm text-surface-500 dark:text-surface-400 line-clamp-3">{blurb}</p>}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-surface-400">From</span>
              {price}
            </div>
            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--sf-radius-btn)] text-xs font-bold transition-all active:scale-[0.97] disabled:opacity-40"
              style={added ? { backgroundColor: "#10b981", color: "#fff" } : onAccent}
            >
              {added ? <><Check className="w-3.5 h-3.5" /> Added</> : outOfStock ? "Unavailable" : <>{addLabel} <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </div>
        </div>
      </Link>
    );
  }

  // ── Editorial: tall fashion shot, hover swaps to 2nd image ─────────────
  if (theme.layout.card === "editorial") {
    return (
      <Link href={href} prefetch={false} className="group flex flex-col">
        <div className="relative aspect-[3/4] overflow-hidden bg-surface-100 dark:bg-surface-800">
          {photo(gridSizes, hoverImageUrl ? "group-hover:opacity-0" : "group-hover:scale-[1.03]")}
          {hoverImageUrl && (
            <Image
              src={clCard(hoverImageUrl)}
              unoptimized={isPreOptimized(hoverImageUrl)}
              alt=""
              fill
              sizes={gridSizes}
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
          {discountBadge}
          {bookmarkButton}
          {soldOut}
          {cartIcon(ShoppingBag)}
        </div>
        <div className="px-1 pt-2.5 pb-1 space-y-1">
          <p className="text-sm font-medium text-surface-800 dark:text-surface-100 line-clamp-1">{product.name}</p>
          {blurbLine}
          {ratingRow}
          {price}
          {savings}
          {lowStock}
        </div>
      </Link>
    );
  }

  // ── Minimal: photo + text, small round add button ──────────────────────
  if (theme.layout.card === "minimal") {
    return (
      <Link href={href} prefetch={false} className="group flex flex-col">
        <div className="relative aspect-square overflow-hidden bg-surface-100 dark:bg-surface-800">
          {photo(gridSizes, "group-hover:scale-[1.04]")}
          {discountBadge}
          {bookmarkButton}
          {soldOut}
          {cartIcon()}
        </div>
        <div className="px-1 pt-2 pb-1 space-y-1">
          <p className="text-[13px] font-semibold text-surface-800 dark:text-surface-100 line-clamp-2 leading-snug">{product.name}</p>
          {blurbLine}
          {ratingRow}
          {price}
          {savings}
          {lowStock}
        </div>
      </Link>
    );
  }

  // ── Classic (default) ──────────────────────────────────────────────────
  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex flex-col bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 overflow-hidden hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.35)] transition-shadow duration-200"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-50 dark:bg-surface-800">
        {photo(gridSizes, "group-hover:scale-[1.04]")}
        {discountBadge}
        {soldOut}
        {bookmarkButton}
        {cartIcon()}
      </div>

      <div className="flex flex-col flex-1 px-2.5 pt-2 pb-2.5 gap-1 sm:p-3 sm:pt-2.5">
        <p className="text-[13px] font-semibold text-surface-800 dark:text-surface-100 line-clamp-2 leading-snug">
          {product.name}
        </p>
        {blurbLine}
        {ratingRow}
        <div className="mt-auto pt-0.5">{price}</div>
        {savings}
        {lowStock}
      </div>
    </Link>
  );
}

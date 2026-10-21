"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Check, Heart, Plus, ShoppingBag, ArrowRight } from "lucide-react";
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
  const { storeBase, theme } = useStore();
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

  const discountBadge = hasDiscount && (
    <div className="absolute top-2.5 left-2.5 z-[2] px-2 py-0.5 rounded-full text-[11px] font-black tracking-wide" style={onAccent}>
      -{discountPct}%
    </div>
  );

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
        <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--sf-radius)] bg-surface-100 dark:bg-surface-800">
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
          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className="absolute inset-x-2 bottom-2 z-[2] flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--sf-radius-btn)] text-xs font-bold uppercase tracking-wider transition-all duration-300 lg:translate-y-[130%] lg:group-hover:translate-y-0 disabled:hidden"
            style={added ? { backgroundColor: "#10b981", color: "#fff" } : onAccent}
          >
            {added ? <><Check className="w-3.5 h-3.5" /> Added</> : <><ShoppingBag className="w-3.5 h-3.5" /> {addLabel}</>}
          </button>
        </div>
        <div className="pt-3 space-y-1">
          <p className="text-sm font-medium text-surface-800 dark:text-surface-100 line-clamp-1">{product.name}</p>
          {price}
        </div>
      </Link>
    );
  }

  // ── Minimal: photo + text, small round add button ──────────────────────
  if (theme.layout.card === "minimal") {
    return (
      <Link href={href} prefetch={false} className="group flex flex-col">
        <div className="relative aspect-square overflow-hidden rounded-[var(--sf-radius)] bg-surface-100 dark:bg-surface-800">
          {photo(gridSizes, "group-hover:scale-[1.04]")}
          {discountBadge}
          {bookmarkButton}
          {soldOut}
          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            aria-label={addLabel}
            className="absolute bottom-2.5 right-2.5 z-[2] w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 disabled:hidden"
            style={added ? { backgroundColor: "#10b981", color: "#fff" } : onAccent}
          >
            {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
        <div className="pt-2.5 space-y-0.5">
          <p className="text-[13px] font-semibold text-surface-800 dark:text-surface-100 line-clamp-2 leading-snug">{product.name}</p>
          {price}
        </div>
      </Link>
    );
  }

  // ── Classic (default) ──────────────────────────────────────────────────
  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex flex-col rounded-[var(--sf-radius)] bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-50 dark:bg-surface-800">
        {photo(gridSizes, "group-hover:scale-[1.04]")}
        {discountBadge}
        {soldOut}
        {bookmarkButton}
      </div>

      <div className="flex flex-col flex-1 p-3 pt-2.5 gap-1.5">
        <p className="text-[13px] font-semibold text-surface-800 dark:text-surface-100 line-clamp-2 leading-snug flex-1">
          {product.name}
        </p>
        <div className="mt-0.5">{price}</div>
        <button
          onClick={handleAddToCart}
          disabled={outOfStock}
          className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-[var(--sf-radius-btn)] text-xs font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] ${
            added ? "bg-emerald-500 text-white" : "hover:opacity-90"
          }`}
          style={added ? {} : onAccent}
        >
          {added ? (
            <><Check className="w-3.5 h-3.5" /> Added</>
          ) : (
            <><ShoppingCart className="w-3.5 h-3.5" /> {addLabel}</>
          )}
        </button>
      </div>
    </Link>
  );
}

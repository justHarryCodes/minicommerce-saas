"use client";

import Link from "next/link";
import { ShoppingCart, Check, Heart } from "lucide-react";
import { useState } from "react";
import { useCart } from "./CartProvider";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useStore } from "@/lib/store-context";
import { formatCurrency } from "@/lib/utils";
import { clCard } from "@/lib/cloudinary";
import type { Product } from "@/types";

interface Props {
  product: Product;
  storeSlug: string;
}

export default function ProductCard({ product, storeSlug }: Props) {
  const { addItem } = useCart();
  const { isBookmarked, toggleBookmark } = useBookmarks(storeSlug);
  const { storeBase } = useStore();
  const [added, setAdded] = useState(false);

  const images = product.images ?? [];
  const imageUrl = images[0] ?? product.image_url ?? null;
  const stockQty = product.stock_quantity ?? product.stockQuantity ?? 0;
  const comparePrice = product.compare_price ?? product.comparePrice;
  const hasDiscount = comparePrice && comparePrice > product.price;
  const discountPct = hasDiscount ? Math.round((1 - product.price / comparePrice!) * 100) : 0;
  const bookmarked = isBookmarked(product.id);
  const outOfStock = stockQty === 0;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
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

  return (
    <Link
      href={`${storeBase}/products/${product.slug ?? product.id}`}
      prefetch={false}
      className="group flex flex-col rounded-2xl bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* ── Image ── */}
      <div className="relative aspect-square overflow-hidden bg-surface-50 dark:bg-surface-800">
        {imageUrl ? (
          <img
            src={clCard(imageUrl)}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-surface-200 dark:text-surface-700">
            🛍️
          </div>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <div
            className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[11px] font-black tracking-wide"
            style={{ backgroundColor: "var(--sf-accent)", color: "#000" }}
          >
            -{discountPct}%
          </div>
        )}

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-white/90 text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
              Out of stock
            </span>
          </div>
        )}

        {/* Bookmark */}
        <button
          onClick={handleBookmark}
          aria-label={bookmarked ? "Remove bookmark" : "Save product"}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-200 ${
            bookmarked
              ? "bg-red-500 text-white scale-110"
              : "bg-white/90 dark:bg-surface-800/90 text-surface-400 hover:text-red-500 hover:scale-110"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${bookmarked ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* ── Info ── */}
      <div className="flex flex-col flex-1 p-3 pt-2.5 gap-1.5">
        <p className="text-[13px] font-semibold text-surface-800 dark:text-surface-100 line-clamp-2 leading-snug flex-1">
          {product.name}
        </p>

        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="font-black text-[15px] text-surface-900 dark:text-white">
            {formatCurrency(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-[11px] text-surface-400 line-through">
              {formatCurrency(comparePrice!)}
            </span>
          )}
        </div>

        <button
          onClick={handleAddToCart}
          disabled={outOfStock}
          className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] ${
            added
              ? "bg-emerald-500 text-white"
              : "hover:opacity-90"
          }`}
          style={added ? {} : { backgroundColor: "var(--sf-accent)", color: "#000" }}
        >
          {added ? (
            <><Check className="w-3.5 h-3.5" /> Added</>
          ) : (
            <><ShoppingCart className="w-3.5 h-3.5" /> Add to cart</>
          )}
        </button>
      </div>
    </Link>
  );
}

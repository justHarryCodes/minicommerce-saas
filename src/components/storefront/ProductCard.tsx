"use client";

import Link from "next/link";
import { ShoppingCart, Check } from "lucide-react";
import { useState } from "react";
import { useCart } from "./CartProvider";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";

interface Props {
  product: Product;
  storeSlug: string;
}

export default function ProductCard({ product, storeSlug }: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const images = product.images ?? [];
  const imageUrl = images[0] ?? product.image_url ?? null;
  const stockQty = product.stock_quantity ?? product.stockQuantity ?? 0;
  const comparePrice = product.compare_price ?? product.comparePrice;
  const hasDiscount = comparePrice && comparePrice > product.price;
  const discountPct = hasDiscount ? Math.round((1 - product.price / comparePrice!) * 100) : 0;

  function handleAddToCart(e: React.MouseEvent) {
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

  return (
    <Link
      href={`/store/${storeSlug}/products/${product.slug ?? product.id}`}
      className="group flex flex-col rounded-2xl bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-surface-50 dark:bg-surface-800">
        {imageUrl ? (
          <img src={imageUrl} alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-surface-200 dark:text-surface-700">
            🛍️
          </div>
        )}
        {hasDiscount && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold text-black"
            style={{ backgroundColor: "var(--sf-accent)" }}>
            -{discountPct}%
          </div>
        )}
        {stockQty === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-black text-xs font-bold px-3 py-1 rounded-full">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        <p className="text-sm font-semibold text-surface-900 dark:text-white line-clamp-2 leading-snug flex-1">
          {product.name}
        </p>
        <div className="flex items-center gap-2">
          <span className="font-black text-base text-surface-900 dark:text-white">
            {formatCurrency(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-surface-400 line-through">
              {formatCurrency(comparePrice!)}
            </span>
          )}
        </div>
        <button
          onClick={handleAddToCart}
          disabled={stockQty === 0}
          className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            added ? "bg-green-500 text-white" : "text-black hover:opacity-90"
          }`}
          style={added ? {} : { backgroundColor: "var(--sf-accent)", color: "#000" }}
        >
          {added ? (
            <><Check className="w-3.5 h-3.5" />Added</>
          ) : (
            <><ShoppingCart className="w-3.5 h-3.5" />Add to cart</>
          )}
        </button>
      </div>
    </Link>
  );
}

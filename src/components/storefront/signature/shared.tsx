"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/storefront/CartProvider";
import { useStore } from "@/lib/store-context";
import type { Product } from "@/types";
import { imageOf } from "./utils";

// Interactive pieces shared by Signature theme homepages.

const stockOf = (p: Product) => p.stock_quantity ?? p.stockQuantity ?? 0;

/**
 * Adds straight to the order (or opens the product when it needs options).
 * "round": a "+" disc. "bar": a full-width "Add to cart" button.
 */
export function AddButton({ product, size = "md", variant = "round" }: { product: Product; size?: "sm" | "md" | "lg"; variant?: "round" | "bar" }) {
  const { addItem } = useCart();
  const { storeBase, theme } = useStore();
  const [added, setAdded] = useState(false);
  const bookable = Boolean(product.is_bookable ?? product.isBookable);
  const needsChoice = Boolean(product.has_sizes ?? product.hasSizes) || bookable;
  const soldOut = (stockOf(product) === 0 && !bookable) || Boolean(product.sold_out_today);
  const bar = variant === "bar";
  const dim = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const icon = size === "sm" || bar ? "h-4 w-4" : "h-5 w-5";
  const cls = bar
    ? "flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-90 active:scale-[.98]"
    : `grid shrink-0 place-items-center rounded-full transition-transform hover:scale-110 active:scale-95 ${dim}`;
  const style = bar
    ? { backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }
    : { backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)", boxShadow: "0 8px 24px -8px var(--sf-accent)" };
  const label = theme.copy.addToCart || "Add to cart";

  if (soldOut) {
    return bar ? (
      <span className="flex w-full items-center justify-center rounded-lg border border-current py-2.5 text-[13px] font-semibold opacity-40">Sold out</span>
    ) : (
      <span className="rounded-full border border-current px-3 py-1.5 text-[11px] font-bold uppercase opacity-50">Sold out</span>
    );
  }
  if (needsChoice) {
    return (
      <Link href={`${storeBase}/products/${product.slug ?? product.id}`} aria-label={`Choose options for ${product.name}`} className={cls} style={style}>
        {bar ? (bookable ? "Book now" : "Choose options") : <Plus className={icon} />}
      </Link>
    );
  }
  if (bar) {
    return (
      <button
        type="button"
        aria-label={`${label}: ${product.name}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          addItem({ product_id: product.id, name: product.name, price: product.price, image_url: imageOf(product) ?? undefined, stock_quantity: stockOf(product), quantity: 1 });
          setAdded(true);
          setTimeout(() => setAdded(false), 1400);
        }}
        className={cls}
        style={style}
      >
        {added ? <Check className={icon} /> : <ShoppingCart className={icon} />} {added ? "Added" : label}
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-label={`${label}: ${product.name}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        addItem({ product_id: product.id, name: product.name, price: product.price, image_url: imageOf(product) ?? undefined, stock_quantity: stockOf(product), quantity: 1 });
        setAdded(true);
        setTimeout(() => setAdded(false), 1400);
      }}
      className={cls}
      style={style}
    >
      {added ? <Check className={icon} /> : <Plus className={icon} />}
    </button>
  );
}

/** Seconds left until local midnight (null until mounted, so server and browser agree). */
export function useUntilMidnight(): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      setLeft(Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return left;
}


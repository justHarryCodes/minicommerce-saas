"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ShoppingCart, Check, Minus, Plus, Share2 } from "lucide-react";
import { useCart } from "@/components/storefront/CartProvider";
import ProductCard from "@/components/storefront/ProductCard";
import { formatCurrency } from "@/lib/utils";
import type { Product, Store } from "@/types";

interface Props {
  product: Product & { category_name?: string; category_slug?: string };
  related: Product[];
  store: Store;
  storeSlug: string;
}

export default function ProductDetailClient({ product, related, store, storeSlug }: Props) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const images = product.images?.length ? product.images
    : product.image_url ? [product.image_url]
    : product.imageUrl ? [product.imageUrl]
    : [];

  const stockQty = product.stock_quantity ?? product.stockQuantity ?? 0;
  const comparePrice = product.compare_price ?? product.comparePrice;
  const hasDiscount = comparePrice && comparePrice > product.price;
  const discountPct = hasDiscount ? Math.round((1 - product.price / comparePrice!) * 100) : 0;

  function handleAdd() {
    for (let i = 0; i < qty; i++) {
      addItem({
        product_id: product.id,
        name: product.name,
        price: product.price,
        image_url: images[0],
        stock_quantity: stockQty,
        quantity: 1,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleShare() {
    if (navigator.share) navigator.share({ title: product.name, url: window.location.href });
    else navigator.clipboard.writeText(window.location.href);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-surface-400">
        <Link href={`/store/${storeSlug}`}
          className="flex items-center gap-1 hover:text-surface-900 dark:hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />Back to shop
        </Link>
        {product.category_name && (
          <>
            <span>/</span>
            <Link href={`/store/${storeSlug}?category=${product.category_slug}`}
              className="hover:text-surface-900 dark:hover:text-white transition-colors">
              {product.category_name}
            </Link>
          </>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl overflow-hidden bg-surface-50 dark:bg-surface-900 border border-surface-100 dark:border-surface-800">
            {images.length > 0 ? (
              <img src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl text-surface-200">🛍️</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    i === activeImg ? "border-[var(--sf-accent)]" : "border-surface-200 dark:border-surface-700"
                  }`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-5">
          <div>
            {product.category_name && (
              <span className="text-xs font-semibold uppercase tracking-wide text-surface-400 mb-2 block">
                {product.category_name}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-surface-900 dark:text-white leading-tight mb-3">
              {product.name}
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-surface-900 dark:text-white">
                {formatCurrency(product.price)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-surface-400 line-through">
                    {formatCurrency(comparePrice!)}
                  </span>
                  <span className="text-sm font-bold px-2 py-0.5 rounded-full text-black"
                    style={{ backgroundColor: "var(--sf-accent)" }}>
                    -{discountPct}% OFF
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Stock badge */}
          {stockQty > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              In stock ({stockQty} available)
            </span>
          ) : (
            <span className="text-sm text-red-500 font-medium">Out of stock</span>
          )}

          {product.description && (
            <p className="text-sm text-surface-600 dark:text-surface-300 whitespace-pre-wrap leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Qty + Add to cart */}
          {stockQty > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-surface-600 dark:text-surface-400">Quantity</span>
                <div className="flex items-center gap-3 bg-surface-50 dark:bg-surface-800 rounded-xl p-1">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-600 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-bold text-surface-900 dark:text-white">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(stockQty, q + 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-600 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAdd}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all ${
                    added ? "bg-green-500 text-white" : "hover:opacity-90"
                  }`}
                  style={added ? {} : { backgroundColor: "var(--sf-accent)", color: "#000" }}>
                  {added ? <><Check className="w-4 h-4" />Added!</> : <><ShoppingCart className="w-4 h-4" />Add to cart</>}
                </button>
                <button onClick={handleShare}
                  className="p-3.5 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* WhatsApp CTA */}
          {store.whatsapp && (
            <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                `Hi! I'm interested in: ${product.name} (${formatCurrency(product.price)})`
              )}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-green-500 text-green-600 dark:text-green-400 font-semibold text-sm hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.553 4.122 1.52 5.862L.057 23.743l5.994-1.573A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.652-.522-5.157-1.43l-.37-.22-3.56.933.951-3.473-.241-.381A9.963 9.963 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              Ask on WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-6">You might also like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((p) => <ProductCard key={p.id} product={p} storeSlug={storeSlug} />)}
          </div>
        </div>
      )}
    </div>
  );
}

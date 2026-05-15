"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { X, Search, ShoppingCart, Check, Loader2, PackageSearch } from "lucide-react";
import { useCart } from "./CartProvider";
import { formatCurrency } from "@/lib/utils";
import { clCard } from "@/lib/cloudinary";

interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_price: number | null;
  images: string[];
  image_url: string | null;
  stock_quantity: number;
}

interface Props {
  storeSlug: string;
  onClose: () => void;
}

function SearchResultRow({
  product,
  storeSlug,
  onClose,
}: {
  product: SearchProduct;
  storeSlug: string;
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const imageUrl = product.images?.[0] ?? product.image_url ?? null;
  const comparePrice = product.compare_price;
  const hasDiscount = comparePrice && comparePrice > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / comparePrice!) * 100)
    : 0;
  const inStock = product.stock_quantity > 0;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image_url: imageUrl ?? undefined,
      stock_quantity: product.stock_quantity,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <Link
      href={`/store/${storeSlug}/products/${product.slug ?? product.id}`}
      onClick={onClose}
      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors group"
    >
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-surface-100 dark:bg-surface-800 border border-surface-100 dark:border-surface-700">
        {imageUrl ? (
          <img
            src={clCard(imageUrl)}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl text-surface-300">
            🛍️
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-900 dark:text-white line-clamp-1 group-hover:opacity-80 transition-opacity">
          {product.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm font-black" style={{ color: "var(--sf-accent)" }}>
            {formatCurrency(product.price)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-xs text-surface-400 line-through">
                {formatCurrency(comparePrice!)}
              </span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-black"
                style={{ backgroundColor: "var(--sf-accent)" }}>
                -{discountPct}%
              </span>
            </>
          )}
          {!inStock && (
            <span className="text-xs text-surface-400">Out of stock</span>
          )}
        </div>
      </div>

      {/* Add to cart */}
      <button
        onClick={handleAdd}
        disabled={!inStock}
        className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
          added ? "bg-green-500 text-white" : "text-black"
        }`}
        style={added ? {} : { backgroundColor: "var(--sf-accent)" }}
        aria-label="Add to cart"
      >
        {added ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <ShoppingCart className="w-3.5 h-3.5" />
        )}
      </button>
    </Link>
  );
}

export default function SearchOverlay({ storeSlug, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while overlay open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/storefront/${storeSlug}/search?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      setResults(data.results ?? []);
      setSearched(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [storeSlug]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val.trim()), 300);
  };

  const showEmpty = searched && !loading && results.length === 0 && query.length >= 2;
  const showResults = results.length > 0 && !loading;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-x-0 top-0 z-50 bg-white dark:bg-surface-900 shadow-2xl max-h-[85vh] flex flex-col"
        style={{ borderRadius: "0 0 1.5rem 1.5rem" }}>
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-100 dark:border-surface-800">
          {loading ? (
            <Loader2 className="w-5 h-5 text-surface-400 shrink-0 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-surface-400 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={handleChange}
            placeholder="Search products…"
            className="flex-1 bg-transparent text-base font-medium text-surface-900 dark:text-white placeholder-surface-400 outline-none"
            autoComplete="off"
          />
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors shrink-0"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {showResults && (
            <>
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-4 py-2">
                {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
              </p>
              <div className="space-y-0.5">
                {results.map((p) => (
                  <SearchResultRow
                    key={p.id}
                    product={p}
                    storeSlug={storeSlug}
                    onClose={onClose}
                  />
                ))}
              </div>
            </>
          )}

          {showEmpty && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <PackageSearch className="w-12 h-12 text-surface-200 dark:text-surface-700 mb-3" />
              <p className="font-semibold text-surface-900 dark:text-white mb-1">
                No products found
              </p>
              <p className="text-sm text-surface-400">
                No results for &ldquo;{query}&rdquo; — try a different search.
              </p>
            </div>
          )}

          {!searched && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-10 h-10 text-surface-200 dark:text-surface-700 mb-3" />
              <p className="text-sm text-surface-400">
                Type at least 2 characters to search
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

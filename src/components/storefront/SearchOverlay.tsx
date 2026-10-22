"use client";

// Instant search. Three looks, picked by the theme (theme.layout.search):
//   list      — a top sheet of compact rows with quick add
//   visual    — a photo grid, for stores that sell on looks
//   spotlight — a centred command palette with keyboard navigation
// Enter (or "See all") opens the full results page in the theme's category layout.
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, Search, ShoppingCart, Check, Loader2, PackageSearch, ArrowRight, Clock, CornerDownLeft } from "lucide-react";
import { useCart } from "./CartProvider";
import { useStore } from "@/lib/store-context";
import { formatCurrency } from "@/lib/utils";
import { clCard } from "@/lib/cloudinary";
import type { SearchStyle } from "@/lib/themes/types";

interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_price: number | null;
  images: string[];
  image_url: string | null;
  stock_quantity: number;
  has_sizes?: boolean;
  is_bookable?: boolean;
  category_name?: string | null;
}

interface Props {
  storeSlug: string;
  onClose: () => void;
}

const RECENT_KEY = (slug: string) => `duka:recent-search:${slug}`;
function readRecent(slug: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY(slug)) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}
function saveRecent(slug: string, q: string) {
  try {
    const next = [q, ...readRecent(slug).filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6);
    localStorage.setItem(RECENT_KEY(slug), JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

function useQuickAdd(product: SearchProduct) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const imageUrl = product.images?.[0] ?? product.image_url ?? null;
  const inStock = product.stock_quantity > 0 || !!product.is_bookable;
  const direct = inStock && !product.has_sizes && !product.is_bookable;
  function add(e: React.MouseEvent) {
    // Products with options / bookings fall through to the product page link
    if (!direct) return;
    e.preventDefault();
    e.stopPropagation();
    addItem({ product_id: product.id, name: product.name, price: product.price, image_url: imageUrl ?? undefined, stock_quantity: product.stock_quantity, quantity: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }
  return { added, add, imageUrl, inStock, direct };
}

function Price({ product }: { product: SearchProduct }) {
  const cmp = product.compare_price;
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-sm font-black text-surface-900 dark:text-white">{formatCurrency(product.price)}</span>
      {cmp && cmp > product.price && <span className="text-xs text-surface-400 line-through">{formatCurrency(cmp)}</span>}
    </span>
  );
}

function AddButton({ q }: { q: ReturnType<typeof useQuickAdd> }) {
  return (
    <button
      type="button"
      onClick={q.add}
      disabled={!q.inStock}
      tabIndex={-1}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      style={q.added ? { background: "#10b981", color: "#fff" } : { background: "var(--sf-accent)", color: "var(--sf-on-accent)" }}
      aria-label={q.direct ? "Add to cart" : "Choose options"}
    >
      {q.added ? <Check className="h-3.5 w-3.5" /> : q.direct ? <ShoppingCart className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
    </button>
  );
}

function Row({ product, href, onClose, active, big = false }: { product: SearchProduct; href: string; onClose: () => void; active: boolean; big?: boolean }) {
  const q = useQuickAdd(product);
  return (
    <Link
      href={href}
      onClick={onClose}
      data-active={active || undefined}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-50 data-[active]:bg-surface-100 dark:hover:bg-surface-800/60 dark:data-[active]:bg-surface-800"
    >
      <span className={`relative shrink-0 overflow-hidden rounded-xl bg-surface-100 dark:bg-surface-800 ${big ? "h-14 w-14" : "h-12 w-12"}`}>
        {q.imageUrl ? <Image src={clCard(q.imageUrl)} alt="" fill sizes="56px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-lg">🛍️</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 text-sm font-semibold text-surface-900 dark:text-white">{product.name}</span>
        <span className="mt-0.5 flex items-center gap-2">
          <Price product={product} />
          {big && product.category_name && <span className="truncate text-xs text-surface-400">· {product.category_name}</span>}
        </span>
      </span>
      {big && active ? <CornerDownLeft className="h-4 w-4 shrink-0 text-surface-400" /> : <AddButton q={q} />}
    </Link>
  );
}

function Tile({ product, href, onClose, active }: { product: SearchProduct; href: string; onClose: () => void; active: boolean }) {
  const q = useQuickAdd(product);
  return (
    <Link href={href} onClick={onClose} data-active={active || undefined} className="group block rounded-2xl p-1.5 transition-colors data-[active]:bg-surface-100 dark:data-[active]:bg-surface-800">
      <span className="relative block aspect-[4/5] overflow-hidden rounded-xl bg-surface-100 dark:bg-surface-800">
        {q.imageUrl ? <Image src={clCard(q.imageUrl)} alt="" fill sizes="(min-width:768px) 20vw, 45vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /> : <span className="flex h-full items-center justify-center text-3xl">🛍️</span>}
        <span className="absolute bottom-2 right-2">
          <AddButton q={q} />
        </span>
      </span>
      <span className="mt-2 line-clamp-1 block px-0.5 text-[13px] font-semibold text-surface-900 dark:text-white">{product.name}</span>
      <span className="block px-0.5">
        <Price product={product} />
      </span>
    </Link>
  );
}

export default function SearchOverlay({ storeSlug, onClose }: Props) {
  const { storeBase, theme } = useStore();
  const router = useRouter();
  const look: SearchStyle = theme.layout.search ?? "list";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqRef = useRef(0);
  // Searches are logged (for the merchant's analytics) only once the shopper
  // stops typing, so partial keystrokes like "sho" aren't recorded.
  const logRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResultRef = useRef<{ q: string; count: number } | null>(null);
  useEffect(() => () => { if (logRef.current) clearTimeout(logRef.current); }, []);

  useEffect(() => {
    inputRef.current?.focus();
    setRecent(readRecent(storeSlug));
  }, [storeSlug]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setSearched(false); return; }
    const id = ++reqRef.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/storefront/${storeSlug}/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (id !== reqRef.current) return; // a newer search has started
      setResults(data.results ?? []);
      setActive(-1);
      lastResultRef.current = { q, count: (data.results ?? []).length };
      setSearched(true);
    } catch {
      if (id === reqRef.current) setResults([]);
    } finally {
      if (id === reqRef.current) setLoading(false);
    }
  }, [storeSlug]);

  const run = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val.trim()), 260);
    if (logRef.current) clearTimeout(logRef.current);
    logRef.current = setTimeout(() => {
      const q = val.trim();
      const last = lastResultRef.current;
      if (q.length < 2 || !last || last.q !== q) return;
      saveRecent(storeSlug, q);
      fetch(`/api/storefront/${storeSlug}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, results: last.count }),
        keepalive: true,
      }).catch(() => {});
    }, 1500);
  };

  const hrefOf = (p: SearchProduct) => `${storeBase}/products/${p.slug ?? p.id}`;
  const allHref = `${storeBase}/search?q=${encodeURIComponent(query.trim())}`;

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!results.length) return;
      e.preventDefault();
      const n = results.length;
      const next = e.key === "ArrowDown" ? (active + 1) % n : (active - 1 + n) % n;
      setActive(next);
      listRef.current?.querySelectorAll("[data-item]")[next]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      const q = query.trim();
      if (q.length < 2) return;
      e.preventDefault();
      saveRecent(storeSlug, q);
      onClose();
      router.push(active >= 0 && results[active] ? hrefOf(results[active]) : allHref);
    }
  }

  const showEmpty = searched && !loading && results.length === 0 && query.trim().length >= 2;
  const showResults = results.length > 0;
  const shown = look === "visual" ? results.slice(0, 12) : results.slice(0, look === "spotlight" ? 8 : 24);

  const input = (
    <div className={`flex items-center gap-3 border-b border-surface-100 px-4 dark:border-surface-800 ${look === "spotlight" ? "h-16 sm:h-[72px]" : "h-16"}`}>
      {loading ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-surface-400" /> : <Search className="h-5 w-5 shrink-0 text-surface-400" />}
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => run(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={look === "spotlight" ? "What are you looking for?" : "Search products…"}
        className={`flex-1 bg-transparent font-medium text-surface-900 outline-none placeholder:text-surface-400 dark:text-white ${look === "spotlight" ? "text-lg" : "text-base"}`}
        autoComplete="off"
        role="combobox"
        aria-expanded={showResults}
        aria-controls="sf-search-results"
      />
      <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-surface-400 transition-colors hover:bg-surface-100 dark:hover:bg-surface-800" aria-label="Close search">
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  const body = (
    <div ref={listRef} id="sf-search-results" className="flex-1 overflow-y-auto px-3 py-3">
      {showResults && (
        <>
          <div className="flex items-center justify-between px-3 pb-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-surface-400">
              {results.length}
              {results.length >= 24 ? "+" : ""} result{results.length !== 1 ? "s" : ""}
            </p>
            <Link href={allHref} onClick={onClose} className="flex items-center gap-1 text-xs font-bold hover:underline" style={{ color: "var(--sf-accent-ink)" }}>
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {look === "visual" ? (
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
              {shown.map((p, i) => (
                <div key={p.id} data-item>
                  <Tile product={p} href={hrefOf(p)} onClose={onClose} active={i === active} />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-0.5">
              {shown.map((p, i) => (
                <div key={p.id} data-item>
                  <Row product={p} href={hrefOf(p)} onClose={onClose} active={i === active} big={look === "spotlight"} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showEmpty && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <PackageSearch className="mb-3 h-10 w-10 text-surface-200 dark:text-surface-700" />
          <p className="mb-1 text-sm font-bold text-surface-900 dark:text-white">No products found</p>
          <p className="text-sm text-surface-400">No results for &ldquo;{query.trim()}&rdquo;</p>
        </div>
      )}

      {!searched && !loading && (
        recent.length > 0 ? (
          <div className="px-3 py-2">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-surface-400">Recent searches</p>
            <div className="flex flex-wrap gap-2">
              {recent.map((r) => (
                <button key={r} type="button" onClick={() => run(r)} className="flex items-center gap-1.5 rounded-full bg-surface-100 px-3 py-1.5 text-xs font-semibold text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-200">
                  <Clock className="h-3 w-3 text-surface-400" /> {r}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="mb-3 h-9 w-9 text-surface-200 dark:text-surface-700" />
            <p className="text-sm text-surface-400">Type at least 2 characters to search</p>
          </div>
        )
      )}
    </div>
  );

  const footer = look === "spotlight" && (
    <div className="hidden items-center gap-4 border-t border-surface-100 px-5 py-2.5 text-[11px] text-surface-400 dark:border-surface-800 sm:flex">
      <span><kbd className="rounded border border-surface-200 px-1 dark:border-surface-700">↑</kbd> <kbd className="rounded border border-surface-200 px-1 dark:border-surface-700">↓</kbd> to move</span>
      <span><kbd className="rounded border border-surface-200 px-1 dark:border-surface-700">Enter</kbd> to open</span>
      <span><kbd className="rounded border border-surface-200 px-1 dark:border-surface-700">Esc</kbd> to close</span>
    </div>
  );

  const panel =
    look === "spotlight"
      ? "fixed inset-x-3 top-3 z-50 mx-auto flex max-h-[80vh] max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,.45)] ring-1 ring-black/5 dark:bg-surface-900 dark:ring-white/10 sm:top-[12vh]"
      : look === "visual"
        ? "fixed inset-x-0 top-0 z-50 flex max-h-[92vh] flex-col rounded-b-3xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] dark:bg-surface-900"
        : "fixed inset-x-0 top-0 z-50 flex max-h-[82vh] flex-col rounded-b-3xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] dark:bg-surface-900";

  return (
    <>
      <div className={`fixed inset-0 z-50 ${look === "spotlight" ? "bg-black/50 backdrop-blur-md" : "bg-black/60 backdrop-blur-sm"}`} onClick={onClose} />
      <div className={panel} role="dialog" aria-modal="true" aria-label="Search">
        <div className={look === "list" ? "contents" : "mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden"}>
          {input}
          {body}
          {footer}
        </div>
      </div>
    </>
  );
}

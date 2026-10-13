"use client";

import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  useTransition,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  X,
  ShoppingBag,
  Store as StoreIcon,
  ArrowUpRight,
  SlidersHorizontal,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import ReelStoryStrip from "@/components/discover/ReelStoryStrip";
import type { Reel } from "@/types";

// Discover is a cross-vendor marketplace page — link within it using the
// reliable path-based routes (dukanigeria.com/store/[slug]/...) rather than
// each vendor's subdomain, which currently 404s on nested paths in production.
function discoverStoreUrl(slug: string): string {
  return `/store/${slug}`;
}
function discoverProductUrl(storeSlug: string, productSlug: string): string {
  return `/store/${storeSlug}/products/${productSlug}`;
}

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  primary_category: string | null;
  created_at: string;
}

interface CategoryCount {
  primary_category: string;
  count: string;
}

interface DiscoverProduct {
  product_id: string;
  product_name: string;
  product_slug: string;
  price: number;
  compare_price: number | null;
  image_url: string | null;
  category_name: string | null;
  store_id: string;
  store_name: string;
  store_slug: string;
  store_logo: string | null;
  store_category: string | null;
}

interface Props {
  stores: StoreRow[];
  categoryCounts: CategoryCount[];
  activeCategory: string;
  initialSearch: string;
  totalCount: number;
  reels: Reel[];
}

type Tab = "stores" | "products";
type StoreSort = "newest" | "name";
type ProductSort = "relevance" | "price-asc" | "price-desc";

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  "Fashion and Clothing": { icon: "👗", color: "#ec4899" },
  "Shoes and Sneakers": { icon: "👟", color: "#f97316" },
  "Bags and Accessories": { icon: "👜", color: "#a855f7" },
  "Beauty and Makeup": { icon: "💄", color: "#f43f5e" },
  "Hair and Wigs": { icon: "💇", color: "#06b6d4" },
  "Food and Catering": { icon: "🍽️", color: "#22c55e" },
  "Electronics and Gadgets": { icon: "⚡", color: "#3b82f6" },
  "Phones and Accessories": { icon: "📱", color: "#6366f1" },
  "Laptops and Computing": { icon: "💻", color: "#0ea5e9" },
  "Furniture and Home": { icon: "🛋️", color: "#84cc16" },
  "Artwork and Paintings": { icon: "🎨", color: "#f59e0b" },
  "Jewelry and Watches": { icon: "💎", color: "#14b8a6" },
  "Books and Stationery": { icon: "📚", color: "#8b5cf6" },
  Other: { icon: "📦", color: "#71717a" },
};

const NEW_STORE_DAYS = 14;
const noScrollbar = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function metaFor(category: string | null) {
  return (category && CATEGORY_META[category]) || CATEGORY_META["Other"];
}

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ────────────────────────────── Search box ────────────────────────────── */

function SearchBox({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2"
        style={{ color: "var(--text-muted)" }}
      />
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-full border py-3 pl-11 pr-11 text-sm font-medium outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(128,128,128,0.18)] [&::-webkit-search-cancel-button]:hidden"
        style={{
          background: "var(--bg-tertiary)",
          borderColor: "var(--border)",
          color: "var(--text-primary)",
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-opacity hover:opacity-70"
          style={{ background: "var(--border)", color: "var(--text-primary)" }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ───────────────────────────── Segmented tabs ──────────────────────────── */

function TabSwitch({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  const items: { id: Tab; label: string; Icon: typeof StoreIcon }[] = [
    { id: "stores", label: "Stores", Icon: StoreIcon },
    { id: "products", label: "Products", Icon: ShoppingBag },
  ];
  return (
    <div
      role="tablist"
      aria-label="Browse by"
      className="grid w-full grid-cols-2 gap-1 rounded-full p-1 sm:inline-grid sm:w-auto"
      style={{ background: "var(--bg-tertiary)" }}
    >
      {items.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className="flex items-center justify-center gap-2 rounded-full px-6 py-2 text-sm font-semibold transition-all"
            style={{
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#000" : "var(--text-secondary)",
              boxShadow: active ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
            }}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────── Store card ────────────────────────────── */

function StoreCard({ store }: { store: StoreRow }) {
  const meta = metaFor(store.primary_category);
  const isNew =
    Date.now() - new Date(store.created_at).getTime() <
    NEW_STORE_DAYS * 24 * 60 * 60 * 1000;

  return (
    <Link
      href={discoverStoreUrl(store.slug)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
    >
      {/* Banner */}
      <div
        className="relative h-24 overflow-hidden sm:h-28"
        style={{
          background: `linear-gradient(135deg, ${meta.color}40 0%, ${meta.color}10 100%)`,
        }}
      >
        <span
          aria-hidden
          className="absolute -right-2 -top-3 select-none text-[88px] leading-none opacity-20 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
        >
          {meta.icon}
        </span>
        {isNew && (
          <span
            className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-black"
            style={{ background: "var(--accent)" }}
          >
            New
          </span>
        )}
      </div>

      {/* Logo overlapping banner */}
      <div className="relative px-4">
        <div
          className="-mt-8 h-16 w-16 overflow-hidden rounded-2xl border-4 shadow-md"
          style={{ borderColor: "var(--bg)", background: "var(--bg)" }}
        >
          {store.logo_url ? (
            <Image
              src={store.logo_url}
              alt={`${store.name} logo`}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-2xl font-black text-white"
              style={{ background: meta.color }}
            >
              {store.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <h3
          className="line-clamp-1 text-base font-bold leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {store.name}
        </h3>

        {store.primary_category && (
          <span
            className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ background: `${meta.color}1a`, color: meta.color }}
          >
            <span>{meta.icon}</span>
            {store.primary_category}
          </span>
        )}

        <p
          className="mt-2.5 line-clamp-2 min-h-[2.5rem] text-[13px] leading-5"
          style={{ color: "var(--text-secondary)" }}
        >
          {store.description || "Browse this vendor's latest products on Duka."}
        </p>

        <div
          className="mt-4 flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition-all group-hover:gap-3"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          <span>Visit store</span>
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </Link>
  );
}

/* ────────────────────────────── Product card ───────────────────────────── */

function ProductCard({ product }: { product: DiscoverProduct }) {
  const meta = metaFor(product.store_category);
  const productUrl = discoverProductUrl(
    product.store_slug,
    product.product_slug,
  );
  const storeUrl = discoverStoreUrl(product.store_slug);
  const discount =
    product.compare_price && product.compare_price > product.price
      ? Math.round(
          ((product.compare_price - product.price) / product.compare_price) *
            100,
        )
      : 0;

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
    >
      <Link href={productUrl} className="block">
        <div
          className="relative aspect-square w-full overflow-hidden"
          style={{ background: `${meta.color}14` }}
        >
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.product_name}
              fill
              sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl">
              {meta.icon}
            </div>
          )}
          {discount > 0 && (
            <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-extrabold text-white shadow">
              -{discount}%
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <Link href={productUrl}>
          <p
            className="line-clamp-2 min-h-[2.5rem] text-[13px] font-semibold leading-5 group-hover:underline"
            style={{ color: "var(--text-primary)" }}
          >
            {product.product_name}
          </p>
        </Link>

        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span
            className="text-[15px] font-extrabold"
            style={{ color: "var(--text-primary)" }}
          >
            {formatPrice(product.price)}
          </span>
          {discount > 0 && product.compare_price && (
            <span
              className="text-xs line-through"
              style={{ color: "var(--text-muted)" }}
            >
              {formatPrice(product.compare_price)}
            </span>
          )}
        </div>

        <Link
          href={storeUrl}
          className="mt-2.5 flex items-center gap-2 border-t pt-2.5 text-xs font-medium hover:underline"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          {product.store_logo ? (
            <Image
              src={product.store_logo}
              alt=""
              width={20}
              height={20}
              className="h-5 w-5 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
              style={{ background: meta.color }}
            >
              {product.store_name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate">{product.store_name}</span>
        </Link>
      </div>
    </div>
  );
}

function ProductSkeletons() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        >
          <div
            className="aspect-square"
            style={{ background: "var(--bg-tertiary)" }}
          />
          <div className="space-y-2 p-3">
            <div
              className="h-3 w-full rounded"
              style={{ background: "var(--bg-tertiary)" }}
            />
            <div
              className="h-3 w-2/3 rounded"
              style={{ background: "var(--bg-tertiary)" }}
            />
            <div
              className="h-4 w-1/3 rounded"
              style={{ background: "var(--bg-tertiary)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StoreSkeletons() {
  return null;
}
void StoreSkeletons;

function EmptyState({
  emoji,
  title,
  message,
  onReset,
}: {
  emoji: string;
  title: string;
  message: string;
  onReset?: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-24 text-center">
      <div
        className="mb-5 flex h-20 w-20 items-center justify-center rounded-full text-4xl"
        style={{ background: "var(--bg-tertiary)" }}
      >
        {emoji}
      </div>
      <p
        className="mb-1.5 text-xl font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </p>
      <p
        className="max-w-sm text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        {message}
      </p>
      {onReset && (
        <button
          onClick={onReset}
          className="mt-6 rounded-full px-6 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

/* ───────────────────────────────── Page ────────────────────────────────── */

export default function DiscoverClient({
  stores,
  categoryCounts,
  activeCategory,
  initialSearch,
  totalCount,
  reels,
}: Props) {
  const searchParamsHook = useSearchParams();
  const tab: Tab =
    searchParamsHook.get("tab") === "products" ? "products" : "stores";
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebounced(search, 300);

  const [storeSort, setStoreSort] = useState<StoreSort>("newest");
  const [productSort, setProductSort] = useState<ProductSort>("relevance");

  // Products state
  const [products, setProducts] = useState<DiscoverProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsTotal, setProductsTotal] = useState(0);
  const requestId = useRef(0);

  const buildUrl = useCallback(
    (opts: { category?: string; tab?: Tab; q?: string }) => {
      const params = new URLSearchParams();
      const cat = opts.category ?? activeCategory;
      const t = opts.tab ?? tab;
      const q = opts.q ?? debouncedSearch;
      if (cat && cat !== "all") params.set("category", cat);
      if (t === "products") params.set("tab", "products");
      if (q.trim()) params.set("q", q.trim());
      const s = params.toString();
      return `/discover${s ? "?" + s : ""}`;
    },
    [activeCategory, tab, debouncedSearch],
  );

  // Keep the URL shareable as the user types, without a server round-trip.
  useEffect(() => {
    const next = buildUrl({ q: debouncedSearch });
    const current = window.location.pathname + window.location.search;
    if (next !== current) window.history.replaceState(null, "", next);
  }, [debouncedSearch, buildUrl]);

  const fetchProducts = useCallback(async (cat: string, q: string) => {
    const id = ++requestId.current;
    setProductsLoading(true);
    try {
      const params = new URLSearchParams();
      if (cat && cat !== "all") params.set("category", cat);
      if (q) params.set("q", q);
      params.set("limit", "48");
      const res = await fetch(`/api/discover/products?${params.toString()}`);
      const data = await res.json();
      if (id !== requestId.current) return; // stale response
      setProducts(data.products ?? []);
      setProductsTotal(data.total ?? 0);
    } catch {
      if (id !== requestId.current) return;
      setProducts([]);
      setProductsTotal(0);
    } finally {
      if (id === requestId.current) setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "products")
      fetchProducts(activeCategory, debouncedSearch.trim());
  }, [tab, activeCategory, debouncedSearch, fetchProducts]);

  const filteredStores = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? stores.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.description && s.description.toLowerCase().includes(q)) ||
            (s.primary_category &&
              s.primary_category.toLowerCase().includes(q)),
        )
      : stores;
    if (storeSort === "name")
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list; // server already orders by newest
  }, [stores, search, storeSort]);

  const sortedProducts = useMemo(() => {
    if (productSort === "price-asc")
      return [...products].sort((a, b) => a.price - b.price);
    if (productSort === "price-desc")
      return [...products].sort((a, b) => b.price - a.price);
    return products;
  }, [products, productSort]);

  const handleCategoryChange = (cat: string) => {
    startTransition(() => {
      router.push(buildUrl({ category: cat }), { scroll: false });
    });
  };

  const handleTabChange = (newTab: Tab) => {
    router.replace(buildUrl({ tab: newTab }), { scroll: false });
  };

  const resetFilters = () => {
    setSearch("");
    startTransition(() => {
      router.push(buildUrl({ category: "all", q: "" }), { scroll: false });
    });
  };

  const hasFilters = activeCategory !== "all" || search.trim() !== "";
  const resultCount = tab === "stores" ? filteredStores.length : productsTotal;
  const noun = tab === "stores" ? "store" : "product";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* ── Sticky header: logo, search (desktop inline / mobile second row), auth ── */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{
          background: "color-mix(in srgb, var(--bg) 88%, transparent)",
          borderColor: "var(--border)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center gap-4 sm:h-16 sm:gap-6">
            <Link href="/" className="flex shrink-0 items-center">
              <Image
                src="/logo.png"
                alt="Duka"
                width={96}
                height={32}
                className="h-7 w-auto object-contain sm:h-8"
                priority
              />
            </Link>

            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder={
                tab === "stores"
                  ? "Search stores…"
                  : "Search products or stores…"
              }
              className="hidden max-w-2xl flex-1 md:block"
            />

            <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
              <Link
                href="/auth/login"
                className="rounded-full px-3 py-2 text-sm font-medium transition-opacity hover:opacity-70 sm:px-4"
                style={{ color: "var(--text-primary)" }}
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-full px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)" }}
              >
                Start Selling
              </Link>
            </div>
          </div>

          {/* Mobile search row */}
          <div className="pb-3 md:hidden">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder={
                tab === "stores"
                  ? "Search stores…"
                  : "Search products or stores…"
              }
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {/* Title + tab switch */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1
              className="text-3xl font-black tracking-tight sm:text-4xl"
              style={{ color: "var(--text-primary)" }}
            >
              Discover
            </h1>
            <p
              className="mt-1 text-sm sm:text-base"
              style={{ color: "var(--text-secondary)" }}
            >
              Shop from verified Nigerian vendors —{" "}
              {totalCount > 0
                ? `${totalCount}+ stores and growing`
                : "browse stores and products"}
            </p>
          </div>
          <TabSwitch tab={tab} onChange={handleTabChange} />
        </div>

        {/* Reels */}
        <ReelStoryStrip reels={reels} />

        {/* Category chips */}
        <div className="relative mb-6 mt-2">
          <div
            className={`-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 ${noScrollbar}`}
          >
            <button
              onClick={() => handleCategoryChange("all")}
              aria-pressed={activeCategory === "all"}
              className="flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all"
              style={{
                background:
                  activeCategory === "all" ? "var(--accent)" : "var(--bg)",
                color:
                  activeCategory === "all" ? "#000" : "var(--text-secondary)",
                borderColor:
                  activeCategory === "all" ? "var(--accent)" : "var(--border)",
              }}
            >
              All
              {tab === "stores" && (
                <span className="text-xs opacity-60">{totalCount}</span>
              )}
            </button>

            {categoryCounts.map(({ primary_category, count }) => {
              const meta = metaFor(primary_category);
              const isActive = activeCategory === primary_category;
              return (
                <button
                  key={primary_category}
                  onClick={() => handleCategoryChange(primary_category)}
                  aria-pressed={isActive}
                  className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-all"
                  style={{
                    background: isActive ? "var(--accent)" : "var(--bg)",
                    color: isActive ? "#000" : "var(--text-secondary)",
                    borderColor: isActive ? "var(--accent)" : "var(--border)",
                  }}
                >
                  <span>{meta.icon}</span>
                  {primary_category}
                  {tab === "stores" && (
                    <span className="text-xs opacity-60">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results bar */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {tab === "products" && productsLoading ? (
              "Searching…"
            ) : (
              <>
                <span
                  className="font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {resultCount.toLocaleString()}
                </span>{" "}
                {noun}
                {resultCount === 1 ? "" : "s"}
                {activeCategory !== "all" && <> in {activeCategory}</>}
                {search.trim() && (
                  <>
                    {" "}
                    for{" "}
                    <span className="font-semibold">
                      &ldquo;{search.trim()}&rdquo;
                    </span>
                  </>
                )}
              </>
            )}
          </p>

          <div className="flex shrink-0 items-center gap-2">
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="hidden text-xs font-semibold underline-offset-2 hover:underline sm:block"
                style={{ color: "var(--text-secondary)" }}
              >
                Clear all
              </button>
            )}
            <label className="relative flex items-center">
              <SlidersHorizontal
                className="pointer-events-none absolute left-3 h-3.5 w-3.5"
                style={{ color: "var(--text-muted)" }}
              />
              <span className="sr-only">Sort</span>
              {tab === "stores" ? (
                <select
                  value={storeSort}
                  onChange={(e) => setStoreSort(e.target.value as StoreSort)}
                  className="cursor-pointer appearance-none rounded-full border py-2 pl-8 pr-4 text-xs font-semibold outline-none"
                  style={{
                    background: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="newest">Newest</option>
                  <option value="name">A – Z</option>
                </select>
              ) : (
                <select
                  value={productSort}
                  onChange={(e) =>
                    setProductSort(e.target.value as ProductSort)
                  }
                  className="cursor-pointer appearance-none rounded-full border py-2 pl-8 pr-4 text-xs font-semibold outline-none"
                  style={{
                    background: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="relevance">Featured</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                </select>
              )}
            </label>
          </div>
        </div>

        {/* ── Stores ── */}
        {tab === "stores" &&
          (filteredStores.length === 0 ? (
            <EmptyState
              emoji="🏪"
              title="No stores found"
              message={
                search
                  ? `Nothing matches "${search}". Try a different spelling or browse a category.`
                  : activeCategory !== "all"
                    ? "No stores in this category yet."
                    : "No stores listed yet."
              }
              onReset={hasFilters ? resetFilters : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {filteredStores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          ))}

        {/* ── Products ── */}
        {tab === "products" &&
          (productsLoading && products.length === 0 ? (
            <ProductSkeletons />
          ) : sortedProducts.length === 0 ? (
            <EmptyState
              emoji="📦"
              title="No products found"
              message={
                search
                  ? `Nothing matches "${search}". Try a different keyword.`
                  : activeCategory !== "all"
                    ? "No products in this category yet."
                    : "No products listed yet."
              }
              onReset={hasFilters ? resetFilters : undefined}
            />
          ) : (
            <div
              className={`grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 ${
                productsLoading ? "opacity-50" : "opacity-100"
              }`}
            >
              {sortedProducts.map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          ))}

        {tab === "products" &&
          !productsLoading &&
          productsTotal > sortedProducts.length && (
            <p
              className="mt-8 text-center text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Showing {sortedProducts.length} of{" "}
              {productsTotal.toLocaleString()} — refine your search to see more.
            </p>
          )}
      </main>

      {/* Footer */}
      <footer
        className="border-t px-4 py-10"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="mx-auto max-w-7xl text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-1">
            <Image
              src="/logo.png"
              alt="Duka"
              width={112}
              height={28}
              className="h-7 w-auto object-contain"
            />
            <span
              className="text-xs font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              by Awarizon
            </span>
          </Link>
          <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} Duka by Awarizon. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

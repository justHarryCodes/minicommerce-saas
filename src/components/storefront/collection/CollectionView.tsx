"use client";

// Category / search-result pages. One toolbar (sort + filters, kept in the
// URL so links and the back button work) and five looks a theme picks from.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Minus, Plus, SlidersHorizontal, X } from "lucide-react";
import ProductCard from "@/components/storefront/ProductCard";
import { useCart } from "@/components/storefront/CartProvider";
import { useStore } from "@/lib/store-context";
import { clCard } from "@/lib/cloudinary";
import { formatCurrency } from "@/lib/utils";
import type { CollectionLayout } from "@/lib/themes/types";
import type { ProductSpec } from "@/lib/product-details";
import type { Product } from "@/types";
import { NO_FILTERS, SORTS, applyFilters, filtersFromSearch, filtersToUrl, isSale, priceBands, type Filters, type SortKey } from "@/lib/collection-filters";

type CardProduct = Product & { specs?: ProductSpec[] };

/* ───────────────────────────── Shared bits ───────────────────────────── */

function cardFacts(p: Product) {
  const stock = p.stock_quantity ?? p.stockQuantity ?? 0;
  const bookable = Boolean(p.is_bookable ?? p.isBookable);
  const hasSizes = Boolean(p.has_sizes ?? p.hasSizes);
  const soldOut = (!bookable && stock <= 0) || Boolean(p.sold_out_today);
  const image = p.images?.[0] ?? p.image_url ?? p.imageUrl ?? null;
  const compare = p.compare_price ?? p.comparePrice;
  return { stock, bookable, hasSizes, soldOut, image, compare, quick: !bookable && !hasSizes && !soldOut };
}

function PriceTag({ p, className = "" }: { p: Product; className?: string }) {
  const { compare } = cardFacts(p);
  return (
    <span className={`flex items-baseline gap-1.5 ${className}`}>
      <span className="font-black tabular-nums text-surface-900 dark:text-white">{formatCurrency(p.price)}</span>
      {compare && compare > p.price && <span className="text-xs text-surface-400 line-through">{formatCurrency(compare)}</span>}
    </span>
  );
}

/** "+ Add" that becomes an inline − n + stepper once the item is in the cart. */
function InlineStepper({ p, size = "md" }: { p: Product; size?: "sm" | "md" }) {
  const { items, addItem, updateQuantity } = useCart();
  const { storeBase, theme } = useStore();
  const f = cardFacts(p);
  const inCart = items.find((i) => i.product_id === p.id && !i.size && !i.booking);
  const h = size === "sm" ? "h-9" : "h-10";
  if (!f.quick)
    return (
      <Link href={`${storeBase}/products/${p.slug ?? p.id}`} className={`sf-btn ${h} shrink-0 border border-surface-200 px-3.5 text-xs text-surface-700 dark:border-surface-700 dark:text-surface-200 ${f.soldOut ? "pointer-events-none opacity-50" : ""}`}>
        {f.soldOut ? "Sold out" : f.bookable ? "Book" : "Options"}
      </Link>
    );
  if (!inCart)
    return (
      <button
        type="button"
        onClick={() => addItem({ product_id: p.id, name: p.name, price: p.price, image_url: f.image ?? undefined, stock_quantity: f.stock, quantity: 1 })}
        className={`sf-btn ${h} shrink-0 px-4 text-xs`}
        style={{ background: "var(--sf-accent)", color: "var(--sf-on-accent)" }}
        aria-label={`${theme.copy.addToCart} — ${p.name}`}
      >
        <Plus className="h-3.5 w-3.5" /> Add
      </button>
    );
  return (
    <div className={`flex ${h} shrink-0 items-center rounded-full`} style={{ background: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
      <button type="button" onClick={() => updateQuantity(p.id, inCart.quantity - 1)} aria-label="One less" className={`flex ${h} w-9 items-center justify-center`}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-6 text-center text-sm font-black tabular-nums">{inCart.quantity}</span>
      <button type="button" onClick={() => updateQuantity(p.id, Math.min(f.stock, inCart.quantity + 1))} disabled={inCart.quantity >= f.stock} aria-label="One more" className={`flex ${h} w-9 items-center justify-center disabled:opacity-40`}>
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Thumb({ p, className, sizes, large = false }: { p: Product; className: string; sizes: string; large?: boolean }) {
  const { image } = cardFacts(p);
  return (
    <span className={`relative block shrink-0 overflow-hidden bg-surface-100 dark:bg-surface-800 ${className}`}>
      {image ? <Image src={large ? image : clCard(image)} alt={p.name} fill sizes={sizes} className="object-cover" /> : <span className="flex h-full items-center justify-center text-2xl">🛍️</span>}
    </span>
  );
}

/* ───────────────────────────── The five looks ───────────────────────────── */

function GridView({ list, slug, gridCls }: ViewProps) {
  return (
    <div className={gridCls}>
      {list.map((p) => (
        <ProductCard key={p.id} product={p} storeSlug={slug} />
      ))}
    </div>
  );
}

/** Lookbook: big editorial tiles; every fifth spans two columns. */
function LookbookView({ list }: ViewProps) {
  const { storeBase } = useStore();
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 lg:grid-cols-3">
      {list.map((p, i) => {
        const wide = i % 5 === 0;
        const second = p.images?.[1];
        return (
          <Link key={p.id} href={`${storeBase}/products/${p.slug ?? p.id}`} className={`group block ${wide ? "col-span-2" : ""}`}>
            <span className={`relative block overflow-hidden rounded-[var(--sf-radius)] bg-surface-100 dark:bg-surface-800 ${wide ? "aspect-[16/10]" : "aspect-[4/5]"}`}>
              <Thumb p={p} large className="absolute inset-0 h-full w-full transition-transform duration-[900ms] group-hover:scale-105" sizes={wide ? "(min-width:1024px) 66vw, 100vw" : "(min-width:1024px) 33vw, 50vw"} />
              {second && <Image src={wide ? second : clCard(second)} alt="" fill sizes={wide ? "66vw" : "33vw"} className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />}
              {isSale(p) && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-surface-900">Sale</span>}
            </span>
            <span className={`mt-3 flex items-baseline justify-between gap-3 ${wide ? "sm:mt-4" : ""}`}>
              <span className={`sf-display truncate text-surface-900 dark:text-white ${wide ? "text-xl sm:text-2xl" : "text-base"}`}>{p.name}</span>
              <PriceTag p={p} className="shrink-0 text-sm" />
            </span>
            {wide && (p.short_description || p.description) && <span className="mt-1 line-clamp-2 block max-w-xl text-sm text-surface-500 dark:text-surface-400">{p.short_description ?? p.description}</span>}
          </Link>
        );
      })}
    </div>
  );
}

/** Menu: a restaurant menu — name, dotted leader, price, blurb, quick add. */
function MenuView({ list }: ViewProps) {
  const { storeBase } = useStore();
  return (
    <div className="grid gap-x-12 md:grid-cols-2">
      {list.map((p) => (
        <div key={p.id} className="flex items-start gap-4 border-b border-dashed border-surface-200 py-5 dark:border-surface-800">
          <Link href={`${storeBase}/products/${p.slug ?? p.id}`} className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="sf-display text-lg leading-snug text-surface-900 dark:text-white">{p.name}</span>
              <span className="mb-1 hidden flex-1 border-b-2 border-dotted border-surface-300 dark:border-surface-700 sm:block" />
              <PriceTag p={p} className="shrink-0" />
            </span>
            {(p.short_description || p.description) && <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-surface-500 dark:text-surface-400">{p.short_description ?? p.description}</span>}
            {p.duration_minutes ? <span className="mt-1.5 inline-block text-xs font-semibold text-surface-400">{p.duration_minutes} min</span> : null}
          </Link>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Link href={`${storeBase}/products/${p.slug ?? p.id}`} tabIndex={-1} aria-hidden>
              <Thumb p={p} className="h-20 w-20 rounded-[calc(var(--sf-radius)*.7)] sm:h-24 sm:w-24" sizes="96px" />
            </Link>
            <InlineStepper p={p} size="sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Aisle: dense supermarket shelf with steppers right on the card. */
function AisleView({ list }: ViewProps) {
  const { storeBase } = useStore();
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {list.map((p) => {
        const f = cardFacts(p);
        return (
          <div key={p.id} className="flex flex-col rounded-[var(--sf-radius)] border border-surface-100 bg-white p-2.5 dark:border-surface-800 dark:bg-surface-900">
            <Link href={`${storeBase}/products/${p.slug ?? p.id}`} className="block">
              <span className="relative block">
                <Thumb p={p} className="aspect-square w-full rounded-[calc(var(--sf-radius)*.6)]" sizes="(min-width:1024px) 20vw, 50vw" />
                {isSale(p) && f.compare && (
                  <span className="absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-black" style={{ background: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
                    -{Math.round((1 - p.price / f.compare) * 100)}%
                  </span>
                )}
              </span>
              <span className="mt-2 line-clamp-2 block min-h-[2.5rem] text-[13px] font-semibold leading-tight text-surface-800 dark:text-surface-100">{p.name}</span>
            </Link>
            <div className="mt-auto pt-2">
              <PriceTag p={p} className="mb-2 text-sm" />
              {f.stock > 0 && f.stock <= 5 && !f.bookable && <p className="-mt-1.5 mb-1.5 text-[11px] font-semibold text-amber-600">Only {f.stock} left</p>}
              <div className="[&>*]:w-full [&>*]:justify-between">
                <InlineStepper p={p} size="sm" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Catalog: comparison rows with key specs — gadgets, electronics, bulk goods. */
function CatalogView({ list }: ViewProps) {
  const { storeBase } = useStore();
  return (
    <div className="divide-y divide-surface-100 overflow-hidden rounded-[var(--sf-radius)] border border-surface-100 dark:divide-surface-800 dark:border-surface-800">
      {(list as CardProduct[]).map((p) => {
        const f = cardFacts(p);
        return (
          <div key={p.id} className="flex items-center gap-4 bg-white p-3 transition-colors hover:bg-surface-50 dark:bg-surface-900 dark:hover:bg-surface-800/60 sm:p-4">
            <Link href={`${storeBase}/products/${p.slug ?? p.id}`} className="shrink-0">
              <Thumb p={p} className="h-20 w-20 rounded-[calc(var(--sf-radius)*.6)] sm:h-28 sm:w-28" sizes="112px" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`${storeBase}/products/${p.slug ?? p.id}`} className="line-clamp-2 text-sm font-bold text-surface-900 hover:underline dark:text-white sm:text-base">
                {p.name}
              </Link>
              {p.specs?.length ? (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {p.specs.map((x) => (
                    <li key={x.label} className="rounded-md bg-surface-100 px-2 py-0.5 text-[11px] text-surface-600 dark:bg-surface-800 dark:text-surface-300">
                      <span className="text-surface-400">{x.label}:</span> <span className="font-semibold">{x.value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                (p.short_description || p.description) && <p className="mt-1 line-clamp-1 text-xs text-surface-500">{p.short_description ?? p.description}</p>
              )}
              <p className={`mt-1.5 flex items-center gap-1 text-[11px] font-semibold ${f.soldOut ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                {f.soldOut ? "Out of stock" : <><Check className="h-3 w-3" /> In stock</>}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <PriceTag p={p} className="text-base sm:text-lg" />
              <InlineStepper p={p} size="sm" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

type ViewProps = { list: Product[]; slug: string; gridCls: string };
const VIEWS: Record<CollectionLayout, (p: ViewProps) => React.ReactElement> = {
  grid: GridView,
  lookbook: LookbookView,
  menu: MenuView,
  aisle: AisleView,
  catalog: CatalogView,
};

/* ───────────────────────────── Toolbar + view ───────────────────────────── */

export default function CollectionView({
  products,
  layout,
  slug,
  gridCls,
  toolbar = true,
}: {
  products: Product[];
  layout: CollectionLayout;
  slug: string;
  /** The theme's product-grid classes (gridClass on the server) */
  gridCls: string;
  toolbar?: boolean;
}) {
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setF(filtersFromSearch(window.location.search));
    setReady(true);
  }, []);
  const update = (patch: Partial<Filters>) =>
    setF((cur) => {
      const next = { ...cur, ...patch };
      window.history.replaceState(window.history.state, "", filtersToUrl(new URL(window.location.href), next));
      return next;
    });

  const bands = useMemo(() => priceBands(products.map((p) => p.price)), [products]);
  const anySale = useMemo(() => products.some(isSale), [products]);
  const list = useMemo(() => (toolbar && ready ? applyFilters(products, f) : products), [products, f, toolbar, ready]);
  const filtered = f.sale || f.min != null || f.max != null;
  const View = VIEWS[layout] ?? GridView;

  const chip = (active: boolean) =>
    `shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
      active ? "border-transparent text-[color:var(--sf-on-accent)]" : "border-surface-200 text-surface-600 hover:border-surface-400 dark:border-surface-700 dark:text-surface-300"
    }`;
  const accent = (active: boolean) => (active ? { background: "var(--sf-accent)" } : undefined);

  return (
    <div>
      {toolbar && products.length > 1 && (
        <div className="mb-5 flex items-center gap-2">
          <div className="no-scrollbar -mx-4 flex flex-1 items-center gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
            {(anySale || bands.length > 0) && <SlidersHorizontal className="h-4 w-4 shrink-0 text-surface-400" aria-hidden />}
            {anySale && (
              <button type="button" onClick={() => update({ sale: !f.sale })} aria-pressed={f.sale} className={chip(f.sale)} style={accent(f.sale)}>
                On sale
              </button>
            )}
            {bands.map((b) => {
              const active = f.min === b.min && f.max === b.max;
              return (
                <button key={b.label} type="button" aria-pressed={active} onClick={() => update(active ? { min: null, max: null } : { min: b.min, max: b.max })} className={chip(active)} style={accent(active)}>
                  {b.label}
                </button>
              );
            })}
            {filtered && (
              <button type="button" onClick={() => update({ sale: false, min: null, max: null })} className="flex shrink-0 items-center gap-1 px-2 text-xs font-semibold text-surface-500 hover:text-surface-900 dark:hover:text-white">
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
          <label className="relative shrink-0">
            <span className="sr-only">Sort by</span>
            <select
              value={f.sort}
              onChange={(e) => update({ sort: e.target.value as SortKey })}
              className="appearance-none rounded-full border border-surface-200 bg-transparent py-1.5 pl-3.5 pr-8 text-xs font-semibold text-surface-700 focus:outline-none focus:ring-2 focus:ring-[color:var(--sf-accent)] dark:border-surface-700 dark:text-surface-200 [&>option]:text-black"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-surface-400">▼</span>
          </label>
        </div>
      )}
      {list.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-bold text-surface-900 dark:text-white">Nothing matches those filters</p>
          <button type="button" onClick={() => update({ sale: false, min: null, max: null })} className="mt-3 text-sm font-semibold underline" style={{ color: "var(--sf-accent-ink)" }}>
            Clear filters
          </button>
        </div>
      ) : (
        <View list={list} slug={slug} gridCls={gridCls} />
      )}
    </div>
  );
}

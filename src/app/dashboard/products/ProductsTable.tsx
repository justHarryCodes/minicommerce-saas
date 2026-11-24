"use client";
import { Select } from "@/components/ui/Select";

// Products: search, quick filters, category and sort over a dense table.
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpDown, ChevronRight, EyeOff, Grid3x3, List, Package, Pencil, Plus, Search, X } from "lucide-react";
import ShareButton from "@/components/dashboard/ShareButton";
import { formatCurrency, cn } from "@/lib/utils";
import { clCard, clThumb } from "@/lib/cloudinary";
import DeleteProductButton from "@/components/dashboard/DeleteProductButton";
import SoldOutTodayToggle from "@/components/dashboard/SoldOutTodayToggle";
import { EmptyState } from "@/components/dashboard/ui";

export interface ProductRow {
  id: string;
  slug?: string | null;
  name: string;
  image_url: string | null;
  price: number;
  compare_price: number | null;
  stock_quantity: number;
  is_active: boolean;
  is_bookable: boolean;
  has_sizes: boolean;
  category_id: string | null;
  category_name: string | null;
  sold_out_today: boolean;
  low_at: number;
  created_at: string;
}

export const PRODUCT_FILTERS = [
  { id: "all", label: "All", test: () => true },
  { id: "active", label: "Live", test: (p: ProductRow) => p.is_active },
  { id: "hidden", label: "Hidden", test: (p: ProductRow) => !p.is_active },
  { id: "out", label: "Out of stock", test: (p: ProductRow) => !p.is_bookable && p.stock_quantity <= 0 },
  { id: "low", label: "Running low", test: (p: ProductRow) => !p.is_bookable && p.stock_quantity > 0 && p.stock_quantity <= p.low_at },
  { id: "services", label: "Services", test: (p: ProductRow) => p.is_bookable },
] as const;
type FilterId = (typeof PRODUCT_FILTERS)[number]["id"];

const SORTS = {
  newest: { label: "Newest", fn: (a: ProductRow, b: ProductRow) => b.created_at.localeCompare(a.created_at) },
  name: { label: "Name A–Z", fn: (a: ProductRow, b: ProductRow) => a.name.localeCompare(b.name) },
  "price-desc": { label: "Price: high → low", fn: (a: ProductRow, b: ProductRow) => b.price - a.price },
  "price-asc": { label: "Price: low → high", fn: (a: ProductRow, b: ProductRow) => a.price - b.price },
  stock: { label: "Stock: lowest first", fn: (a: ProductRow, b: ProductRow) => (a.is_bookable ? 1 : 0) - (b.is_bookable ? 1 : 0) || a.stock_quantity - b.stock_quantity },
} as const;
type SortId = keyof typeof SORTS;

export default function ProductsTable({
  products,
  categories,
  atLimit,
  share,
}: {
  products: ProductRow[];
  categories: { id: string; name: string }[];
  atLimit: boolean;
  /** For the Share button: the store's slug and public address */
  share?: { storeSlug: string; storeBase: string };
}) {
  const params = useSearchParams();
  const initial = PRODUCT_FILTERS.some((f) => f.id === params.get("filter")) ? (params.get("filter") as FilterId) : "all";
  const [filter, setFilter] = useState<FilterId>(initial);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [sort, setSort] = useState<SortId>("newest");

  const counts = useMemo(() => Object.fromEntries(PRODUCT_FILTERS.map((f) => [f.id, products.filter(f.test).length])), [products]);
  const rows = useMemo(() => {
    const test = PRODUCT_FILTERS.find((f) => f.id === filter)!.test;
    const term = q.trim().toLowerCase();
    return products
      .filter((p) => test(p) && (!cat || p.category_id === cat) && (!term || p.name.toLowerCase().includes(term) || (p.category_name ?? "").toLowerCase().includes(term)))
      .sort(SORTS[sort].fn);
  }, [products, filter, q, cat, sort]);

  if (!products.length) {
    return (
      <div className="rounded-lg border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <EmptyState
          icon={Package}
          title="No products yet"
          text="Add your first product to start selling."
          action={
            <Link href="/dashboard/products/new" className="inline-flex h-8 items-center gap-1 rounded-md bg-accent-400 px-3 text-[13px] font-bold text-black hover:bg-accent-500">
              <Plus className="h-4 w-4" /> Add product
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <>
    <PhoneProducts
      rows={rows}
      total={products.length}
      counts={counts}
      filter={filter}
      onFilter={setFilter}
      q={q}
      onQ={setQ}
      categories={categories}
      cat={cat}
      onCat={setCat}
      atLimit={atLimit}
      share={share}
    />
    <section className="hidden overflow-hidden rounded-lg border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:block">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 p-2 dark:border-zinc-800">
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {PRODUCT_FILTERS.map((f) =>
            counts[f.id] || f.id === "all" || f.id === filter ? (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  "flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold",
                  filter === f.id ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                  f.id === "out" && filter !== f.id && "text-red-600",
                  f.id === "low" && filter !== f.id && "text-amber-600",
                )}
              >
                {f.label}
                <span className="tabular-nums opacity-60">{counts[f.id]}</span>
              </button>
            ) : null
          )}
        </div>
        <label className="ml-auto flex h-8 min-w-[180px] flex-1 items-center gap-2 rounded-md border border-zinc-200 px-2 focus-within:ring-2 focus-within:ring-accent-400 dark:border-zinc-700 sm:max-w-xs">
          <Search className="h-3.5 w-3.5 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] shadow-none outline-none placeholder:text-zinc-400 focus:ring-0 dark:text-white" />
          {q && (
            <button onClick={() => setQ("")} aria-label="Clear search" className="text-zinc-400">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>
        {categories.length > 0 && (
          <Select
            size="sm"
            className="!w-auto min-w-[150px]"
            aria-label="Category"
            value={cat}
            onChange={setCat}
            options={[{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          />
        )}
        <div className="flex items-center">
          <Select
            size="sm"
            className="!w-auto min-w-[170px]"
            aria-label="Sort"
            icon={<ArrowUpDown className="h-3 w-3" />}
            value={sort}
            onChange={setSort}
            options={(Object.keys(SORTS) as SortId[]).map((id) => ({ value: id, label: SORTS[id].label }))}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-3 py-8 text-center text-[13px] text-zinc-500">No products match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-[11px] uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
                <th className="px-3 py-1.5 font-medium">Product</th>
                <th className="hidden px-3 py-1.5 font-medium md:table-cell">Category</th>
                <th className="px-3 py-1.5 text-right font-medium">Price</th>
                <th className="px-3 py-1.5 text-right font-medium">Stock</th>
                <th className="hidden px-3 py-1.5 font-medium sm:table-cell">Status</th>
                <th className="w-px px-2 py-1.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((p) => {
                const out = !p.is_bookable && p.stock_quantity <= 0;
                const low = !p.is_bookable && !out && p.stock_quantity <= p.low_at;
                return (
                  <tr key={p.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="px-3 py-1.5">
                      <Link href={`/dashboard/products/${p.id}/edit`} className="flex min-w-0 items-center gap-2.5">
                        {p.image_url ? (
                          <Image src={clThumb(p.image_url)} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800">
                            <Package className="h-3.5 w-3.5 text-zinc-400" />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block max-w-[320px] truncate font-medium text-zinc-900 group-hover:underline dark:text-white">{p.name}</span>
                          <span className="block truncate text-[11px] text-zinc-400 md:hidden">{p.category_name ?? "No category"}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="hidden max-w-[180px] truncate px-3 py-1.5 text-zinc-500 md:table-cell">{p.category_name ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">
                      <span className="font-semibold text-zinc-900 dark:text-white">{formatCurrency(p.price)}</span>
                      {p.compare_price ? <span className="ml-1 text-[11px] text-zinc-400 line-through">{formatCurrency(p.compare_price)}</span> : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">
                      {p.is_bookable ? (
                        <span className="text-[12px] text-zinc-400">Service</span>
                      ) : (
                        <span className={cn("font-semibold", out ? "text-red-600" : low ? "text-amber-600" : "text-zinc-700 dark:text-zinc-300")}>
                          {p.stock_quantity}
                          {p.has_sizes && <span className="ml-0.5 text-[10px] font-normal text-zinc-400">var.</span>}
                        </span>
                      )}
                    </td>
                    <td className="hidden px-3 py-1.5 sm:table-cell">
                      <span className={cn("inline-flex items-center gap-1 text-[12px]", p.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400")}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", p.is_active ? "bg-emerald-500" : "bg-zinc-300")} />
                        {p.is_active ? "Live" : "Hidden"}
                      </span>
                      {p.sold_out_today && <span className="ml-1.5 text-[11px] font-semibold text-amber-600">Sold out today</span>}
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex items-center justify-end gap-0.5">
                        {!p.is_bookable && <SoldOutTodayToggle productId={p.id} soldOut={p.sold_out_today} />}
                        {share && p.is_active && (
                          <ShareButton
                            compact
                            target={{
                              kind: "product",
                              title: p.name,
                              price: `₦${Number(p.price).toLocaleString("en-NG")}`,
                              url: `${share.storeBase}/products/${p.slug || p.id}`,
                              cardPath: `/api/og/product/${share.storeSlug}/${p.slug || p.id}`,
                            }}
                          />
                        )}
                        <Link href={`/dashboard/products/${p.id}/edit`} aria-label={`Edit ${p.name}`} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800">
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <DeleteProductButton productId={p.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-zinc-100 px-3 py-1.5 text-[11px] text-zinc-400 dark:border-zinc-800">
        {rows.length} of {products.length} shown{atLimit ? " · plan limit reached" : ""}
      </p>
    </section>
    </>
  );
}

/* ───────────────────────── Phones ─────────────────────────
   An Instagram-profile grid of product photos (tap to edit), with a list
   view for stock and quick actions, switched like a profile's tabs. */
const PHONE_FILTER_LABEL: Record<string, string> = { all: "All", active: "Live", hidden: "Hidden", out: "Sold out", low: "Running low", services: "Services" };

function PhoneProducts({ rows, total, counts, filter, onFilter, q, onQ, categories, cat, onCat, atLimit, share }: {
  rows: ProductRow[];
  total: number;
  counts: Record<string, number>;
  filter: FilterId;
  onFilter: (f: FilterId) => void;
  q: string;
  onQ: (v: string) => void;
  categories: { id: string; name: string }[];
  cat: string;
  onCat: (v: string) => void;
  atLimit: boolean;
  share?: { storeSlug: string; storeBase: string };
}) {
  const [mode, setMode] = useState<"grid" | "list">("grid");
  return (
    <div className="-mx-3 sm:-mx-4 lg:hidden">
      <div className="px-4 pt-2">
        <label className="flex h-10 items-center gap-2.5 rounded-full bg-zinc-100 px-4 dark:bg-zinc-800/80">
          <Search className="h-[18px] w-[18px] text-zinc-500" />
          <input value={q} onChange={(e) => onQ(e.target.value)} placeholder="Search your products" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-zinc-900 shadow-none outline-none placeholder:text-zinc-500 focus:ring-0 dark:text-white" />
          {q && (
            <button onClick={() => onQ("")} aria-label="Clear search" className="text-zinc-500">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        {PRODUCT_FILTERS.map((f) =>
          counts[f.id] || f.id === "all" || f.id === filter ? (
            <button
              key={f.id}
              onClick={() => onFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cn(
                "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold",
                filter === f.id ? "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
                f.id === "out" && filter !== f.id && "text-red-600 dark:text-red-400",
              )}
            >
              {PHONE_FILTER_LABEL[f.id]}
              <span className="tabular-nums opacity-60">{counts[f.id]}</span>
            </button>
          ) : null,
        )}
      </div>

      {/* Profile-style tabs */}
      <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800">
        <ModeTab active={mode === "grid"} onClick={() => setMode("grid")} label="Grid view" icon={Grid3x3} />
        <ModeTab active={mode === "list"} onClick={() => setMode("list")} label="List view" icon={List} />
        {categories.length > 0 && (
          <select
            value={cat}
            onChange={(e) => onCat(e.target.value)}
            aria-label="Category"
            className="mr-3 h-8 max-w-[44%] truncate rounded-full border-0 bg-zinc-100 py-0 pl-3 pr-8 text-[13px] font-semibold text-zinc-700 focus:ring-2 focus:ring-amber-400 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-6 py-14 text-center text-[15px] text-zinc-500">No products match.</p>
      ) : mode === "grid" ? (
        <div className="grid grid-cols-3 gap-[2px] bg-white dark:bg-zinc-950">
          {rows.map((p) => {
            const out = !p.is_bookable && p.stock_quantity <= 0;
            const low = !p.is_bookable && !out && p.stock_quantity <= p.low_at;
            return (
              <Link key={p.id} href={`/dashboard/products/${p.id}/edit`} className="relative aspect-[4/5] overflow-hidden bg-zinc-100 dark:bg-zinc-900" aria-label={`Edit ${p.name}`}>
                {p.image_url ? (
                  <Image src={clCard(p.image_url)} alt="" fill sizes="34vw" className={cn("object-cover", !p.is_active && "opacity-40 grayscale")} />
                ) : (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center">
                    <Package className="h-6 w-6 text-zinc-300" />
                    <span className="line-clamp-2 text-[11px] font-medium text-zinc-500">{p.name}</span>
                  </span>
                )}
                <span className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
                  {!p.is_active && (
                    <span className="flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      <EyeOff className="h-3 w-3" /> Hidden
                    </span>
                  )}
                  {(out || p.sold_out_today) && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">Sold out</span>}
                  {low && !p.sold_out_today && <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-black">{p.stock_quantity} left</span>}
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-5 text-[12px] font-bold tabular-nums text-white">
                  {formatCurrency(p.price)}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <ul className="bg-white dark:bg-zinc-950">
          {rows.map((p) => {
            const out = !p.is_bookable && p.stock_quantity <= 0;
            const low = !p.is_bookable && !out && p.stock_quantity <= p.low_at;
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <Link href={`/dashboard/products/${p.id}/edit`} className="flex min-w-0 flex-1 items-center gap-3">
                  {p.image_url ? (
                    <Image src={clThumb(p.image_url)} alt="" width={60} height={60} className={cn("h-[60px] w-[60px] shrink-0 rounded-xl object-cover", !p.is_active && "opacity-40")} />
                  ) : (
                    <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900">
                      <Package className="h-5 w-5 text-zinc-400" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-zinc-950 dark:text-white">{p.name}</span>
                    <span className="block text-[14px] font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatCurrency(p.price)}
                      {p.compare_price ? <span className="ml-1.5 text-[12px] font-normal text-zinc-400 line-through">{formatCurrency(p.compare_price)}</span> : null}
                    </span>
                    <span className={cn("block text-[12.5px]", out ? "text-red-600" : low ? "text-amber-600" : "text-zinc-500")}>
                      {p.is_bookable ? "Service" : out ? "Sold out" : `${p.stock_quantity} in stock`}
                      {!p.is_active && " · Hidden"}
                      {p.sold_out_today && " · Sold out today"}
                    </span>
                  </span>
                </Link>
                {share && p.is_active && (
                  <ShareButton
                    compact
                    className="!p-2"
                    target={{ kind: "product", title: p.name, price: `₦${Number(p.price).toLocaleString("en-NG")}`, url: `${share.storeBase}/products/${p.slug || p.id}`, cardPath: `/api/og/product/${share.storeSlug}/${p.slug || p.id}` }}
                  />
                )}
                <Link href={`/dashboard/products/${p.id}/edit`} aria-label={`Edit ${p.name}`} className="text-zinc-300">
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="px-4 py-3 text-center text-[12px] text-zinc-400">
        {rows.length} of {total} products{atLimit ? " · plan limit reached" : ""}
      </p>
    </div>
  );
}

function ModeTab({ active, onClick, label, icon: Icon }: { active: boolean; onClick: () => void; label: string; icon: typeof List }) {
  return (
    <button onClick={onClick} aria-pressed={active} aria-label={label} className={cn("flex h-11 flex-1 items-center justify-center border-b-2", active ? "border-zinc-950 text-zinc-950 dark:border-white dark:text-white" : "border-transparent text-zinc-400")}>
      <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
    </button>
  );
}


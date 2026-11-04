"use client";
import { Select } from "@/components/ui/Select";

// Products: search, quick filters, category and sort over a dense table.
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpDown, Package, Pencil, Plus, Search, X } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { clThumb } from "@/lib/cloudinary";
import DeleteProductButton from "@/components/dashboard/DeleteProductButton";
import SoldOutTodayToggle from "@/components/dashboard/SoldOutTodayToggle";
import { EmptyState } from "@/components/dashboard/ui";

export interface ProductRow {
  id: string;
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

export default function ProductsTable({ products, categories, atLimit }: { products: ProductRow[]; categories: { id: string; name: string }[]; atLimit: boolean }) {
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
    <section className="overflow-hidden rounded-lg border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
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
  );
}

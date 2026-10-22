// Category / search page filtering and sorting. Pure, client-safe.
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc";
export const SORTS: { id: SortKey; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
];

export interface Filters {
  sort: SortKey;
  sale: boolean;
  min: number | null;
  max: number | null;
}

export const NO_FILTERS: Filters = { sort: "featured", sale: false, min: null, max: null };

export const isSale = (p: Pick<Product, "price" | "compare_price" | "comparePrice">) => {
  const c = p.compare_price ?? p.comparePrice;
  return !!c && c > p.price;
};

/** Apply filters + sort. "featured" keeps the store's own order. */
export function applyFilters<T extends Product>(list: T[], f: Filters): T[] {
  let out = list.filter((p) => (!f.sale || isSale(p)) && (f.min == null || p.price >= f.min) && (f.max == null || p.price < f.max));
  if (f.sort === "newest") out = [...out].sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  else if (f.sort === "price-asc") out = [...out].sort((a, b) => a.price - b.price);
  else if (f.sort === "price-desc") out = [...out].sort((a, b) => b.price - a.price);
  return out;
}

export interface PriceBand {
  min: number | null;
  max: number | null;
  label: string;
}

/** Two or three price bands splitting the list roughly evenly, on round numbers. */
export function priceBands(prices: number[]): PriceBand[] {
  if (prices.length < 6) return [];
  const sorted = [...prices].sort((a, b) => a - b);
  const round = (n: number) => {
    const mag = 10 ** Math.max(2, Math.floor(Math.log10(Math.max(n, 1))) - 1);
    return Math.round(n / mag) * mag;
  };
  const cuts = Array.from(new Set([0.33, 0.66].map((q) => round(sorted[Math.floor(q * (sorted.length - 1))])))).filter(
    (c) => c > sorted[0] && c < sorted[sorted.length - 1],
  );
  if (!cuts.length) return [];
  const bands: PriceBand[] = [{ min: null, max: cuts[0], label: `Under ${formatCurrency(cuts[0])}` }];
  for (let i = 1; i < cuts.length; i++) bands.push({ min: cuts[i - 1], max: cuts[i], label: `${formatCurrency(cuts[i - 1])} – ${formatCurrency(cuts[i])}` });
  bands.push({ min: cuts[cuts.length - 1], max: null, label: `${formatCurrency(cuts[cuts.length - 1])}+` });
  return bands;
}

/** Read filters from a query string (unknown values fall back to defaults). */
export function filtersFromSearch(search: string): Filters {
  const q = new URLSearchParams(search);
  const sort = SORTS.some((s) => s.id === q.get("sort")) ? (q.get("sort") as SortKey) : "featured";
  const num = (k: string) => {
    const v = q.get(k);
    return v && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null;
  };
  return { sort, sale: q.get("sale") === "1", min: num("min"), max: num("max") };
}

/** Write filters onto a URL, dropping defaults so links stay clean. */
export function filtersToUrl(url: URL, f: Filters): URL {
  const set = (k: string, v: string | null) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
  set("sort", f.sort === "featured" ? null : f.sort);
  set("sale", f.sale ? "1" : null);
  set("min", f.min != null ? String(f.min) : null);
  set("max", f.max != null ? String(f.max) : null);
  return url;
}

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { query } from "@/lib/db";
import { getOrSet, cacheKey, TTL } from "@/lib/redis";
import { getCachedStore, dateOnly } from "@/lib/storefront-page";
import { getRequestTheme } from "@/lib/themes/server";
import { searchProducts } from "@/lib/storefront-search";
import { toCardProduct } from "@/lib/public-store";
import { footerPages, pageLinksFor } from "@/lib/store-pages";
import { isSoldOutToday } from "@/lib/hours";
import CollectionView from "@/components/storefront/collection/CollectionView";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import { gridClass } from "@/components/storefront/ThemeSections";
import type { Category, Product } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function StoreSearchPage({ params, searchParams }: Props) {
  const { slug: paramSlug } = await params;
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const h = await headers();
  const slug = h.get("x-store-slug") ?? paramSlug;
  const storeBase = h.get("x-is-subdomain") === "1" ? "" : `/store/${slug}`;
  const homeHref = storeBase || "/";

  const store = await getCachedStore(slug);
  if (!store || !store.is_active) return notFound();

  const [theme, rows, categories, pages] = await Promise.all([
    getRequestTheme(store),
    searchProducts(store.id, q, 60),
    getOrSet<Category[]>(
      cacheKey.storeCategories(store.id),
      () => query<Category>("SELECT * FROM categories WHERE store_id = $1 ORDER BY sort_order ASC, name ASC", [store.id]) as Promise<Category[]>,
      TTL.CATEGORY_LIST,
    ),
    footerPages(store.id),
  ]);
  const topCategories = (categories ?? []).filter((c) => !c.parent_id);
  const now = new Date();
  const products = rows.map(
    (p) => toCardProduct({ ...p, sold_out_today: isSoldOutToday(dateOnly(p.sold_out_until) as never, now) } as unknown as Record<string, unknown>) as unknown as Product,
  );
  const ql = q.toLowerCase();
  const matchedCategories = ql.length >= 2 ? topCategories.filter((c) => c.name.toLowerCase().includes(ql)).slice(0, 6) : [];

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 lg:px-6 lg:pt-10">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-surface-500 dark:text-surface-400">
          <Link href={homeHref} className="hover:text-surface-900 dark:hover:text-white">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-semibold text-surface-900 dark:text-white">Search</span>
        </nav>

        <form action={`${storeBase}/search`} className="mt-5 flex max-w-2xl items-center gap-3 rounded-full border border-surface-200 bg-white px-5 py-3 shadow-sm focus-within:ring-2 focus-within:ring-[color:var(--sf-accent)] dark:border-surface-700 dark:bg-surface-900">
          <Search className="h-5 w-5 shrink-0 text-surface-400" />
          <input name="q" type="search" defaultValue={q} placeholder="Search this store…" aria-label="Search this store" className="min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-base text-surface-900 shadow-none outline-none ring-0 placeholder:text-surface-400 focus:ring-0 dark:text-white" />
          <button type="submit" className="sf-btn px-4 py-2 text-sm" style={{ background: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
            Search
          </button>
        </form>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <h1 className="sf-display text-3xl text-surface-900 dark:text-white sm:text-4xl">
            {q.length >= 2 ? <>Results for &ldquo;{q}&rdquo;</> : "Search"}
          </h1>
          {q.length >= 2 && (
            <span className="text-sm text-surface-500 dark:text-surface-400">
              {products.length} item{products.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {matchedCategories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {matchedCategories.map((c) => (
              <Link key={c.id} href={`${homeHref}?category=${c.slug}`} className="rounded-full bg-surface-100 px-3.5 py-1.5 text-xs font-semibold text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-200">
                Browse {c.name} →
              </Link>
            ))}
          </div>
        )}

        <div className="mt-6">
          {q.length < 2 ? (
            <p className="py-16 text-center text-sm text-surface-500">Type at least 2 characters to search.</p>
          ) : products.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-bold text-surface-900 dark:text-white">No products found</p>
              <p className="mt-1 text-sm text-surface-500">Try a shorter word, or browse a category.</p>
              {topCategories.length > 0 && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {topCategories.slice(0, 8).map((c) => (
                    <Link key={c.id} href={`${homeHref}?category=${c.slug}`} className="rounded-full border border-surface-200 px-3.5 py-1.5 text-xs font-semibold text-surface-700 dark:border-surface-700 dark:text-surface-200">
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <CollectionView products={products} layout={theme.layout.collection ?? "grid"} slug={slug} gridCls={gridClass(theme.layout)} />
          )}
        </div>
      </div>
      <StorefrontFooter store={store} theme={theme} storeBase={storeBase} categories={topCategories} pageLinks={pageLinksFor(pages, storeBase)} />
    </>
  );
}

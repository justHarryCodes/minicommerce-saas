import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { query } from "@/lib/db";
import { getOrSet, cacheKey, TTL } from "@/lib/redis";
import { getCachedStore } from "@/lib/storefront-page";
import { getRequestTheme } from "@/lib/themes/server";
import { footerPages, pageLinksFor } from "@/lib/store-pages";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import SavedClient from "./SavedClient";
import type { Category } from "@/types";

// /store/<slug>/saved (or <slug>.dukanigeria.com/saved): the shopper's
// saved products for this store. The list lives on their device.

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = { title: "Saved items", robots: { index: false, follow: true } };

export default async function StoreSavedPage({ params }: Props) {
  const { slug: paramSlug } = await params;
  const h = await headers();
  const slug = h.get("x-store-slug") ?? paramSlug;
  const storeBase = h.get("x-is-subdomain") === "1" ? "" : `/store/${slug}`;
  const homeHref = storeBase || "/";

  const store = await getCachedStore(slug);
  if (!store || !store.is_active) return notFound();

  const [theme, categories, pages] = await Promise.all([
    getRequestTheme(store),
    getOrSet<Category[]>(
      cacheKey.storeCategories(store.id),
      () => query<Category>("SELECT * FROM categories WHERE store_id = $1 ORDER BY sort_order ASC, name ASC", [store.id]) as Promise<Category[]>,
      TTL.CATEGORY_LIST,
    ),
    footerPages(store.id),
  ]);
  const topCategories = (categories ?? []).filter((c) => !c.parent_id);

  return (
    <>
      <div className="mx-auto min-h-[60vh] max-w-7xl px-4 pb-16 pt-6 lg:px-6 lg:pt-10">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-surface-500 dark:text-surface-400">
          <Link href={homeHref} className="hover:text-surface-900 dark:hover:text-white">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-semibold text-surface-900 dark:text-white">Saved</span>
        </nav>
        <SavedClient storeSlug={slug} homeHref={homeHref} categories={topCategories.slice(0, 8).map((c) => ({ id: c.id, name: c.name, slug: c.slug }))} />
      </div>
      <StorefrontFooter store={store} theme={theme} storeBase={storeBase} categories={topCategories} pageLinks={pageLinksFor(pages, storeBase)} />
    </>
  );
}

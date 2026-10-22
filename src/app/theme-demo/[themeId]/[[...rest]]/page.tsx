// Public demo storefront for a theme, filled with sample content — linked
// from the theme gallery and used by the studio's "Demo content" preview.
// Needs no database: everything comes from src/lib/themes/demo.ts. Any
// sub-path (product links, checkout, …) falls back to the demo homepage.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import StorefrontShell from "@/components/storefront/StorefrontShell";
import StorefrontHome from "@/components/storefront/StorefrontHome";
import { getTheme } from "@/lib/themes/catalog";
import { getDemoStore } from "@/lib/themes/demo";
import { getRequestTheme } from "@/lib/themes/server";

interface Props {
  params: Promise<{ themeId: string; rest?: string[] }>;
  searchParams: Promise<{ category?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const theme = getTheme((await params).themeId);
  if (!theme) return {};
  return {
    title: `${theme.name} — storefront theme demo | Duka`,
    description: theme.tagline,
    robots: { index: false, follow: false },
  };
}

export default async function ThemeDemoPage({ params, searchParams }: Props) {
  const { themeId } = await params;
  const { category } = await searchParams;
  const catalogTheme = getTheme(themeId);
  if (!catalogTheme) notFound();

  // A studio preview (?theme_preview=…) may restyle the demo; otherwise the
  // theme as shipped.
  const theme = await getRequestTheme({ storefront_theme_id: themeId });
  const demo = getDemoStore(catalogTheme);
  const storeBase = `/theme-demo/${themeId}`;

  const activeCategory = demo.categories.find((c) => c.slug === category);
  const products = activeCategory ? demo.products.filter((p) => p.category_id === activeCategory.id) : demo.products;
  const featured = demo.products.filter((p) => demo.store.featured_product_ids?.includes(p.id));

  return (
    <StorefrontShell
      store={demo.store}
      theme={theme}
      categories={demo.categories.map((c) => ({
        ...c,
        subcategories: [],
        cover: demo.categoryTiles.find((t) => t.id === c.id)?.cover_image ?? null,
      }))}
      storeSlug={demo.store.slug}
      storeBase={storeBase}
    >
      <StorefrontHome
        store={demo.store}
        theme={theme}
        slug={demo.store.slug}
        storeBase={storeBase}
        category={activeCategory ? category : undefined}
        topCategories={demo.categories}
        subcategories={[]}
        activeCategory={activeCategory}
        products={products}
        featuredProducts={featured}
        categoryTiles={demo.categoryTiles}
        railRows={demo.products}
        testimonials={demo.testimonials}
        hideBookmarks
        demoContact
      />
    </StorefrontShell>
  );
}

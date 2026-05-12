import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getOrSet, cacheKey, TTL } from "@/lib/redis";
import { deriveThemeColors } from "@/lib/utils";
import StorefrontNav from "@/components/storefront/Nav";
import CartProvider from "@/components/storefront/CartProvider";
import type { Store, Category } from "@/types";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

async function getStore(slug: string): Promise<Store | null> {
  return getOrSet<Store>(
    cacheKey.storeMeta(slug),
    () => queryOne<Store>("SELECT * FROM stores WHERE slug = $1 AND is_active = true", [slug]),
    TTL.STORE_META
  );
}

async function getCategories(storeId: string): Promise<Category[]> {
  const cats = await getOrSet<Category[]>(
    cacheKey.storeCategories(storeId),
    () => query<Category>(
      "SELECT * FROM categories WHERE store_id = $1 ORDER BY sort_order ASC, name ASC",
      [storeId]
    ) as Promise<Category[]>,
    TTL.CATEGORY_LIST
  );
  return cats ?? [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) return {};
  return {
    title: { default: store.name, template: `%s | ${store.name}` },
    description: store.description ?? `Shop at ${store.name}`,
    openGraph: {
      title: store.name,
      description: store.description ?? "",
      images: store.logo_url ? [store.logo_url] : [],
    },
  };
}

export default async function StorefrontLayout({ params, children }: Props) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();

  const categories = await getCategories(store.id);
  const topCategories = categories.filter((c) => !c.parent_id);
  const withSubs = topCategories.map((cat) => ({
    ...cat,
    subcategories: categories.filter((c) => c.parent_id === cat.id),
  }));

  const accentColor = store.storefront_accent_color ?? store.storefrontAccentColor ?? "#f59e0b";
  const { accentLight, accentDark } = deriveThemeColors(accentColor);

  const themeStyle = `
    .storefront {
      --sf-accent: ${accentColor};
      --sf-accent-light: ${accentLight};
      --sf-accent-dark: ${accentDark};
    }
  `;

  return (
    <CartProvider storeId={store.id}>
      <div className="storefront min-h-screen bg-white dark:bg-surface-950">
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
        <StorefrontNav store={store} categories={withSubs} />
        <div className="pt-16">{children}</div>
      </div>
    </CartProvider>
  );
}

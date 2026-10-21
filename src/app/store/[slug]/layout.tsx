import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { query, queryOne } from "@/lib/db";
import { getOrSet, cacheKey, TTL } from "@/lib/redis";
import { getRequestTheme } from "@/lib/themes/server";
import { hasFeature } from "@/lib/plan";
import { isAiEnabled } from "@/lib/ai";
import StorefrontShell from "@/components/storefront/StorefrontShell";
import VisitTracker from "@/components/storefront/VisitTracker";
import AssistantWidget from "@/components/storefront/AssistantWidget";
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

  const h = await headers();
  const isSubdomain = h.get("x-is-subdomain") === "1";
  const storeBase = isSubdomain ? "" : `/store/${slug}`;

  const categories = await getCategories(store.id);
  const topCategories = categories.filter((c) => !c.parent_id);
  const withSubs = topCategories.map((cat) => ({
    ...cat,
    subcategories: categories.filter((c) => c.parent_id === cat.id),
  }));

  const theme = await getRequestTheme(store);

  // AI assistant only ever renders when the merchant opted in AND the store's
  // effective plan is Pro AND a provider key is actually configured —
  // resolved once here so the widget itself doesn't need to re-check any of it.
  const showAssistant =
    !!store.ai_assistant_enabled && isAiEnabled().groq && (await hasFeature(store.id, "ai_tools"));

  return (
    <StorefrontShell
      store={store}
      theme={theme}
      categories={withSubs}
      storeSlug={slug}
      storeBase={storeBase}
      aiAssistantEnabled={showAssistant}
      extras={
        <>
          <VisitTracker storeSlug={slug} storeId={store.id} />
          {showAssistant && <AssistantWidget storeSlug={slug} storeName={store.name} />}
        </>
      }
    >
      {children}
    </StorefrontShell>
  );
}

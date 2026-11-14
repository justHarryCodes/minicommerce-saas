import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { query, queryOne } from "@/lib/db";
import { getOrSet, cacheKey, TTL } from "@/lib/redis";
import { getRequestTheme } from "@/lib/themes/server";
import { hasFeature } from "@/lib/plan";
import { isAiEnabled } from "@/lib/ai";
import StorefrontShell from "@/components/storefront/StorefrontShell";
import { storeCached } from "@/lib/store-cache";
import VisitTracker from "@/components/storefront/VisitTracker";
import AssistantWidget from "@/components/storefront/AssistantWidget";
import type { Store, Category } from "@/types";
import type { Metadata } from "next";
import { metaText, storeCanonicalBase } from "@/lib/seo";
import { clCrawler } from "@/lib/cloudinary";

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
  // Each store is its own site to Google: its own address, name, logo
  // (favicon in search results) and Search Console verification.
  // No canonical here: a layout's canonical would be inherited by every
  // page under it. Pages set their own.
  const base = storeCanonicalBase(store);
  const description = metaText(store.description) || metaText(`Shop ${store.name} online. Order easily, pay securely and get delivery across Nigeria.`);
  const verification = (store as { google_site_verification?: string | null }).google_site_verification;
  return {
    metadataBase: new URL(`${base}/`),
    title: { default: store.name, template: `%s | ${store.name}` },
    description,
    applicationName: store.name,
    ...(store.logo_url ? { icons: { icon: store.logo_url, apple: store.logo_url } } : {}),
    ...(verification ? { verification: { google: verification } } : {}),
    openGraph: {
      type: "website",
      siteName: store.name,
      locale: "en_NG",
      title: store.name,
      description,
      images: store.logo_url ? [{ url: clCrawler(store.logo_url), alt: store.name }] : [],
    },
    twitter: { card: "summary", title: store.name, description, images: store.logo_url ? [clCrawler(store.logo_url)] : [] },
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
  // First product photo per category — the mega menu, drawer and chip navs show it
  const covers = await storeCached(store.id, "nav-covers", async () =>
    Object.fromEntries(
      (
        await query<{ category_id: string; cover: string }>(
          `SELECT DISTINCT ON (category_id) category_id, COALESCE(NULLIF(image_url, ''), images[1]) AS cover
           FROM products
           WHERE store_id = $1 AND is_active = true AND category_id IS NOT NULL
             AND COALESCE(NULLIF(image_url, ''), images[1]) IS NOT NULL
           ORDER BY category_id, sort_order, created_at DESC`,
          [store.id]
        )
      ).map((r) => [r.category_id, r.cover])
    )
  );
  const withSubs = topCategories.map((cat) => ({
    cover: (covers as Record<string, string>)[cat.id] ?? null,
    ...cat,
    subcategories: categories.filter((c) => c.parent_id === cat.id),
  }));

  const theme = await getRequestTheme(store);

  // Star ratings on product cards: one summary per store, [average, count]
  const ratings = await storeCached(store.id, "ratings", async () =>
    Object.fromEntries(
      (
        await query<{ product_id: string; avg: string; n: string }>(
          `SELECT product_id, ROUND(AVG(rating)::numeric, 1) AS avg, COUNT(*) AS n
           FROM reviews
           WHERE store_id = $1 AND is_approved = true AND product_id IS NOT NULL
           GROUP BY product_id`,
          [store.id]
        ).catch(() => [])
      ).map((r) => [r.product_id, [Number(r.avg), Number(r.n)]])
    ) as Record<string, [number, number]>
  );

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
      ratings={ratings}
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

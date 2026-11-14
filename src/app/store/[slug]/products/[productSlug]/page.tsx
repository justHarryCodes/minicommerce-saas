import { notFound } from "next/navigation";
import { query, queryOne, queryMany } from "@/lib/db";
import ProductDetailClient from "./ProductDetailClient";
import type { Metadata } from "next";
import { lagosParts } from "@/lib/hours";
import { clCrawler } from "@/lib/cloudinary";
import { breadcrumbLd, jsonLd, metaText, productLd, storeCanonicalBase, type LdReview } from "@/lib/seo";
import { getStoreFeatures } from "@/lib/plan";
import { toCardProduct, toPublicStore } from "@/lib/public-store";
import { storeCached } from "@/lib/store-cache";
import { dateOnly, getCachedStore } from "@/lib/storefront-page";
import { alsoViewedIds } from "@/lib/product-views";
import type { Product, ProductSize } from "@/types";

interface Props {
  params: Promise<{ slug: string; productSlug: string }>;
}

/**
 * Store + product (with variants) + related items. Shared by the page and
 * its metadata, cached per store and refreshed on any product change.
 */
async function loadProductPage(storeSlug: string, productSlug: string) {
  const store = await getCachedStore(storeSlug);
  if (!store) return null;
  const data = await storeCached(store.id, `pdp:${productSlug}`, async () => {
    const product = await queryOne<Product>(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.store_id = $1 AND (p.slug = $2 OR p.id::text = $2) AND p.is_active = true`,
      [store.id, productSlug]
    );
    if (!product) return null;
    // DATE → plain YYYY-MM-DD (safe for the client and for the JSON cache)
    product.sold_out_until = dateOnly(product.sold_out_until) as never;
    const [sizes, related] = await Promise.all([
      product.has_sizes ?? product.hasSizes
        ? queryMany<ProductSize>(
            "SELECT id, label, stock_quantity, sort_order, options, price, image_url FROM product_sizes WHERE product_id = $1 ORDER BY sort_order, created_at",
            [product.id]
          )
        : Promise.resolve(undefined),
      product.category_id ?? product.categoryId
        ? query<Product>(
            `SELECT * FROM products
             WHERE store_id = $1 AND category_id = $2 AND id != $3 AND is_active = true
             ORDER BY created_at DESC LIMIT 4`,
            [store.id, product.category_id ?? product.categoryId, product.id]
          )
        : Promise.resolve([] as Product[]),
    ]);
    if (sizes) product.sizes = sizes;
    for (const r of related) r.sold_out_until = dateOnly(r.sold_out_until) as never;
    return { product, related };
  });
  return data ? { store, ...data } : null;
}

/** "Customers also viewed": co-viewed products, refreshed every 10 minutes. */
async function loadAlsoViewed(storeId: string, productId: string): Promise<Product[]> {
  try {
    return await storeCached(
      storeId,
      `also:${productId}`,
      async () => {
        const ids = await alsoViewedIds(storeId, productId, 8);
        if (!ids.length) return [] as Product[];
        const rows = await query<Product>(
          `SELECT * FROM products WHERE store_id = $1 AND id = ANY($2::uuid[]) AND is_active = true`,
          [storeId, ids]
        );
        const byId = new Map(rows.map((r) => [r.id, r]));
        return ids
          .map((id) => byId.get(id))
          .filter((r): r is Product => !!r)
          .map((r) => ({ ...r, sold_out_until: dateOnly(r.sold_out_until) as never }));
      },
      600
    );
  } catch {
    return []; // a recommendation rail is never worth failing the page
  }
}

/** Approved reviews for rich results: the rating summary and the latest few. */
async function loadReviewsLd(storeId: string, productId: string): Promise<{ rating: [number, number] | null; reviews: LdReview[] }> {
  try {
    return await storeCached(
      storeId,
      `reviews-ld:${productId}`,
      async () => {
        const [summary, latest] = await Promise.all([
          queryOne<{ avg: string | null; n: string }>(
            `SELECT ROUND(AVG(rating)::numeric, 1) AS avg, COUNT(*) AS n FROM reviews WHERE store_id = $1 AND product_id = $2 AND is_approved = true`,
            [storeId, productId]
          ),
          query<LdReview>(
            `SELECT customer_name, rating, body, created_at FROM reviews
             WHERE store_id = $1 AND product_id = $2 AND is_approved = true
             ORDER BY created_at DESC LIMIT 5`,
            [storeId, productId]
          ),
        ]);
        const n = Number(summary?.n ?? 0);
        return { rating: n > 0 ? ([Number(summary!.avg), n] as [number, number]) : null, reviews: latest };
      },
      600
    );
  } catch {
    return { rating: null, reviews: [] };
  }
}

function productImages(p: Product): string[] {
  return [...new Set([p.image_url, ...(p.images ?? [])].filter((u): u is string => !!u))];
}

// Rich link previews: WhatsApp, Instagram, Facebook, X and iMessage all read
// Open Graph tags, so a pasted product link shows its photo, name and price.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const found = await loadProductPage(slug, productSlug);
  if (!found) return {};
  const { store, product } = found;
  const price = `₦${Number(product.price).toLocaleString("en-NG")}`;
  const description =
    metaText(product.short_description || product.description) ||
    metaText(`Buy ${product.name} for ${price} at ${store.name}. Secure payment and delivery across Nigeria.`);
  const images = productImages(product).slice(0, 4).map(clCrawler);
  const url = `${storeCanonicalBase(store)}/products/${product.slug || product.id}`;
  return {
    // "Name - ₦price" reads like a shopping result, so it wins clicks
    title: `${product.name} - ${price}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: `${product.name} · ${price}`,
      description,
      siteName: store.name,
      locale: "en_NG",
      url,
      images: images.map((u) => ({ url: u, alt: product.name })),
    },
    twitter: { card: images.length ? "summary_large_image" : "summary", title: `${product.name} · ${price}`, description, images },
    other: {
      "product:price:amount": String(Number(product.price)),
      "product:price:currency": "NGN",
      "product:availability": (product.stock_quantity ?? 0) > 0 || product.is_bookable ? "in stock" : store.allow_preorders ? "preorder" : "out of stock",
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug: storeSlug, productSlug } = await params;

  const found = await loadProductPage(storeSlug, productSlug);
  if (!found) notFound();
  const { store, product, related } = found;

  const [features, alsoViewed, reviewsLd] = await Promise.all([
    getStoreFeatures(store.id),
    loadAlsoViewed(store.id, product.id),
    loadReviewsLd(store.id, product.id),
  ]);
  // Don't repeat "Customers also viewed" items in "More from <category>"
  const alsoIds = new Set(alsoViewed.map((p) => p.id));
  const moreFromCategory = related.filter((r) => !alsoIds.has(r.id));

  // Structured data: product rich results (price, stock, stars, shipping,
  // returns), free Shopping listings on Google, and the breadcrumb trail.
  const base = storeCanonicalBase(store);
  const url = `${base}/products/${product.slug || product.id}`;
  const productData = productLd({ store, product, url, rating: reviewsLd.rating, reviews: reviewsLd.reviews, today: lagosParts(new Date()).date });
  const crumbs = breadcrumbLd([
    { name: store.name, url: `${base}/` },
    ...(product.category_name && product.category_slug && product.category_slug !== "uncategorized" ? [{ name: product.category_name, url: `${base}/?category=${product.category_slug}` }] : []),
    { name: product.name, url },
  ]);

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd([productData, crumbs]) }} />
    <ProductDetailClient
      product={product as any}
      related={moreFromCategory.map((r) => toCardProduct(r as unknown as Record<string, unknown>) as unknown as Product)}
      alsoViewed={alsoViewed.map((r) => toCardProduct(r as unknown as Record<string, unknown>) as unknown as Product)}
      store={toPublicStore(store)}
      storeSlug={storeSlug}
      bookingsEnabled={features.has("bookings")}
      stockAlertsEnabled={features.has("stock_alerts")}
    />
    </>
  );
}

import { notFound } from "next/navigation";
import { query, queryOne, queryMany } from "@/lib/db";
import ProductDetailClient from "./ProductDetailClient";
import type { Metadata } from "next";
import { getStoreUrl } from "@/lib/utils";
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
  const description = (product.short_description || product.description || `${product.name} — ${price} at ${store.name}`)
    .replace(/\s+/g, " ")
    .slice(0, 200);
  const images = productImages(product).slice(0, 4);
  const url = `${getStoreUrl(store.slug, store.custom_domain ?? null)}/products/${product.slug || product.id}`;
  return {
    title: product.name,
    description,
    alternates: url.startsWith("http") ? { canonical: url } : undefined,
    openGraph: {
      type: "website",
      title: `${product.name} · ${price}`,
      description,
      siteName: store.name,
      ...(url.startsWith("http") ? { url } : {}),
      images: images.map((u) => ({ url: u, alt: product.name })),
    },
    twitter: { card: images.length ? "summary_large_image" : "summary", title: `${product.name} · ${price}`, description, images },
    other: {
      "product:price:amount": String(Number(product.price)),
      "product:price:currency": "NGN",
      "product:availability": (product.stock_quantity ?? 0) > 0 || product.is_bookable ? "in stock" : "out of stock",
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug: storeSlug, productSlug } = await params;

  const found = await loadProductPage(storeSlug, productSlug);
  if (!found) notFound();
  const { store, product, related } = found;

  const [features, alsoViewed] = await Promise.all([getStoreFeatures(store.id), loadAlsoViewed(store.id, product.id)]);
  // Don't repeat "Customers also viewed" items in "More from <category>"
  const alsoIds = new Set(alsoViewed.map((p) => p.id));
  const moreFromCategory = related.filter((r) => !alsoIds.has(r.id));

  // Product structured data — eligible for Google's rich results & free listings
  const price = Number(product.price);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: productImages(product),
    description: product.short_description || product.description || undefined,
    sku: product.id,
    brand: { "@type": "Brand", name: (product as { brand?: string | null }).brand || store.name },
    offers: {
      "@type": "Offer",
      price: price.toFixed(2),
      priceCurrency: "NGN",
      availability: (product.stock_quantity ?? 0) > 0 || product.is_bookable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: store.name },
    },
  };

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
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

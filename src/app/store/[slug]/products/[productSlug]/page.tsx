import { notFound } from "next/navigation";
import { query, queryOne, queryMany } from "@/lib/db";
import ProductDetailClient from "./ProductDetailClient";
import type { Product, ProductSize, Store } from "@/types";

interface Props {
  params: Promise<{ slug: string; productSlug: string }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug: storeSlug, productSlug } = await params;

  const store = await queryOne<Store>(
    "SELECT * FROM stores WHERE slug = $1 AND is_active = true",
    [storeSlug]
  );
  if (!store) notFound();

  const product = await queryOne<Product>(
    `SELECT p.*, 
       c.name AS category_name,
       c.slug AS category_slug
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.store_id = $1 AND (p.slug = $2 OR p.id::text = $2) AND p.is_active = true`,
    [store.id, productSlug]
  );
  if (!product) notFound();

  if (product.has_sizes ?? product.hasSizes) {
    product.sizes = await queryMany<ProductSize>(
      "SELECT id, label, stock_quantity, sort_order FROM product_sizes WHERE product_id = $1 ORDER BY sort_order, created_at",
      [product.id]
    );
  }

  const related = product.category_id ?? product.categoryId
    ? await query<Product>(
        `SELECT * FROM products
         WHERE store_id = $1 AND category_id = $2 AND id != $3 AND is_active = true
         ORDER BY created_at DESC LIMIT 4`,
        [store.id, product.category_id ?? product.categoryId, product.id]
      )
    : [];

  return (
    <ProductDetailClient
      product={product as any}
      related={related as Product[]}
      store={store}
      storeSlug={storeSlug}
    />
  );
}

import { query, queryOne } from "@/lib/db";
import { getOrSet, cacheKey, TTL } from "@/lib/redis";
import ProductCard from "@/components/storefront/ProductCard";
import type { Product, Category, Store } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; sub?: string }>;
}

async function getStoreProducts(storeId: string, categorySlug?: string, subSlug?: string) {
  let sql = `
    SELECT p.*, c.name AS category_name, c.slug AS category_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.store_id = $1 AND p.is_active = true AND p.stock_quantity > 0
  `;
  const params: unknown[] = [storeId];
  let idx = 2;

  if (subSlug) {
    sql += ` AND EXISTS (SELECT 1 FROM categories sc WHERE sc.id = p.subcategory_id AND sc.slug = $${idx++})`;
    params.push(subSlug);
  } else if (categorySlug) {
    sql += ` AND EXISTS (SELECT 1 FROM categories cc WHERE cc.id = p.category_id AND cc.slug = $${idx++})`;
    params.push(categorySlug);
  }
  sql += " ORDER BY p.sort_order, p.created_at DESC";
  return query<Product>(sql, params);
}

export default async function StorefrontPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { category, sub } = await searchParams;

  const store = await queryOne<Store>(
    "SELECT * FROM stores WHERE slug = $1 AND is_active = true",
    [slug]
  );
  if (!store) return null;

  const allCategories = await getOrSet<Category[]>(
    cacheKey.storeCategories(store.id),
    () => query<Category>(
      "SELECT * FROM categories WHERE store_id = $1 ORDER BY sort_order ASC, name ASC",
      [store.id]
    ) as Promise<Category[]>,
    TTL.CATEGORY_LIST
  ) ?? [];

  const products = await getStoreProducts(store.id, category, sub);
  const topCategories = allCategories.filter((c) => !c.parent_id);
  const activeCategory = topCategories.find((c) => c.slug === category);
  const subcategories = activeCategory
    ? allCategories.filter((c) => c.parent_id === activeCategory.id)
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero banner */}
      {!category && (
        <div
          className="rounded-2xl overflow-hidden mb-10 p-8 sm:p-12 text-center"
          style={{ background: "linear-gradient(135deg, var(--sf-accent-light) 0%, var(--sf-accent) 100%)" }}
        >
          {store.logo_url && (
            <img src={store.logo_url} alt={store.name}
              className="h-16 w-auto object-contain mx-auto mb-4" />
          )}
          <h1 className="text-2xl sm:text-3xl font-black text-black mb-2">{store.name}</h1>
          {store.description && (
            <p className="text-sm text-black/70 max-w-md mx-auto">{store.description}</p>
          )}
        </div>
      )}

      {/* Category filters */}
      {topCategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          <a href={`/store/${slug}`}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !category ? "text-black" : "bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300"
            }`}
            style={!category ? { backgroundColor: "var(--sf-accent)" } : {}}>
            All
          </a>
          {topCategories.map((cat) => (
            <a key={cat.id} href={`/store/${slug}?category=${cat.slug}`}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                category === cat.slug ? "text-black" : "bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300"
              }`}
              style={category === cat.slug ? { backgroundColor: "var(--sf-accent)" } : {}}>
              {cat.name}
            </a>
          ))}
        </div>
      )}

      {/* Subcategory pills */}
      {subcategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          <a href={`/store/${slug}?category=${category}`}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              !sub ? "bg-surface-800 dark:bg-surface-200 text-white dark:text-black"
                   : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400"
            }`}>
            All {activeCategory?.name}
          </a>
          {subcategories.map((s) => (
            <a key={s.id} href={`/store/${slug}?category=${category}&sub=${s.slug}`}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                sub === s.slug ? "bg-surface-800 dark:bg-surface-200 text-white dark:text-black"
                               : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400"
              }`}>
              {s.name}
            </a>
          ))}
        </div>
      )}

      {/* Product grid */}
      {products.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-4xl mb-4">🛍️</p>
          <p className="font-semibold text-surface-900 dark:text-white mb-1">No products found</p>
          <p className="text-sm text-surface-400">
            {category ? "No products in this category yet" : "This store hasn't added products yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} storeSlug={slug} />
          ))}
        </div>
      )}

      <div className="mt-16 pt-8 border-t border-surface-100 dark:border-surface-800 text-center">
        <p className="text-xs text-surface-300 dark:text-surface-600">
          Powered by{" "}
          <a href="/" className="font-semibold hover:underline">ShopForge</a>
        </p>
      </div>
    </div>
  );
}

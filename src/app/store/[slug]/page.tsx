import { headers } from "next/headers";
import { query, queryOne } from "@/lib/db";
import { getOrSet, cacheKey, TTL } from "@/lib/redis";
import ProductCard from "@/components/storefront/ProductCard";
import BookmarkSlider from "@/components/storefront/BookmarkSlider";
import HeroSlider from "@/components/storefront/HeroSlider";
import { BadgeCheck } from "lucide-react";
import type { Product, Category, Store } from "@/types";
import { clLogo } from "@/lib/cloudinary";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; sub?: string }>;
}

interface CategoryWithCover extends Category {
  cover_image: string | null;
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
  const { slug: paramSlug } = await params;
  const { category, sub } = await searchParams;

  const h = await headers();
  const isSubdomain = h.get("x-is-subdomain") === "1";

  // Prefer the header slug (set by middleware on subdomain requests) over the
  // URL param — this guards against a failed rewrite serving the wrong slug.
  const slug = h.get("x-store-slug") ?? paramSlug;

  const storeBase = isSubdomain ? "" : `/store/${slug}`;
  const homeHref = storeBase || "/";

  // Fetch store regardless of is_active so we can show a better message
  // for inactive stores rather than silently falling through to notFound.
  const store = await queryOne<Store>(
    "SELECT * FROM stores WHERE slug = $1",
    [slug]
  );

  // Store doesn't exist at all
  if (!store) return notFound();

  // Store exists but has been deactivated
  if (!store.is_active) return notFound();

  const allCategories = await getOrSet<Category[]>(
    cacheKey.storeCategories(store.id),
    () => query<Category>(
      "SELECT * FROM categories WHERE store_id = $1 ORDER BY sort_order ASC, name ASC",
      [store.id]
    ) as Promise<Category[]>,
    TTL.CATEGORY_LIST
  ) ?? [];

  const topCategories = allCategories.filter((c) => !c.parent_id);
  const activeCategory = topCategories.find((c) => c.slug === category);
  const subcategories = activeCategory
    ? allCategories.filter((c) => c.parent_id === activeCategory.id)
    : [];

  // Fetch all data in parallel
  const [products, featuredProducts, categoryCovers] = await Promise.all([
    getStoreProducts(store.id, category, sub),

    // Featured products (vendor-selected, in order)
    !category && store.featured_product_ids?.length
      ? query<Product>(
          `SELECT * FROM products
           WHERE store_id = $1 AND id = ANY($2::uuid[]) AND is_active = true`,
          [store.id, store.featured_product_ids]
        ).then((rows) => {
          const order = store.featured_product_ids!;
          return rows.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
        })
      : Promise.resolve([] as Product[]),

    // Category collection covers (only on main page)
    !category
      ? query<CategoryWithCover>(
          `SELECT c.id, c.name, c.slug, c.sort_order,
             (SELECT p.image_url FROM products p
              WHERE p.category_id = c.id AND p.is_active = true
                AND p.image_url IS NOT NULL AND p.image_url <> ''
              ORDER BY p.sort_order, p.created_at DESC LIMIT 1
             ) AS cover_image
           FROM categories c
           WHERE c.store_id = $1 AND c.parent_id IS NULL
           ORDER BY c.sort_order, c.name`,
          [store.id]
        )
      : Promise.resolve([] as CategoryWithCover[]),
  ]);

  const bannerImages: string[] = store.banner_images ?? [];
  const showBanner = !category;

  return (
    <div className="max-w-6xl mx-auto">
      {/* ── Hero Banner Slider ─────────────────────────────── */}
      {showBanner && bannerImages.length > 0 && (
        <div className="px-0 sm:px-4 pt-4">
          <HeroSlider images={bannerImages} storeName={store.name} />
        </div>
      )}

      {/* ── Gradient banner (fallback if no images) ─────── */}
      {showBanner && bannerImages.length === 0 && (
        <div className="px-4 pt-6">
          <div
            className="rounded-2xl overflow-hidden p-8 sm:p-12 text-center"
            style={{ background: "linear-gradient(135deg, var(--sf-accent-light) 0%, var(--sf-accent) 100%)" }}
          >
            {store.logo_url && (
              <img
                src={clLogo(store.logo_url)}
                alt={store.name}
                loading="eager"
                decoding="sync"
                className="h-16 w-auto object-contain mx-auto mb-4"
              />
            )}
            <div className="flex items-center justify-center gap-2 mb-2">
              <h1 className="text-2xl sm:text-3xl font-black text-black">{store.name}</h1>
              {store.nin_verified && (
                <span title="NIN Verified">
                  <BadgeCheck className="w-6 h-6 text-black/60" aria-label="NIN Verified" />
                </span>
              )}
            </div>
            {store.description && (
              <p className="text-sm text-black/70 max-w-md mx-auto">{store.description}</p>
            )}
          </div>
        </div>
      )}

      <div className="px-4 py-8 space-y-12">
        {/* ── Featured Products Slider ───────────────────── */}
        {showBanner && featuredProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: "var(--sf-accent)" }}>
                  Hand-picked
                </p>
                <h2 className="text-xl font-black text-surface-900 dark:text-white">
                  Featured Products
                </h2>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {featuredProducts.map((product) => (
                <div key={product.id} className="shrink-0 w-48 sm:w-56">
                  <ProductCard product={product} storeSlug={slug} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Collections / Category Grid ────────────────── */}
        {showBanner && categoryCovers.filter(c => c.cover_image).length > 0 && (
          <section>
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: "var(--sf-accent)" }}>
                Browse by collection
              </p>
              <h2 className="text-xl font-black text-surface-900 dark:text-white">
                Shop Collections
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categoryCovers.filter(c => c.cover_image).map((cat) => (
                <a
                  key={cat.id}
                  href={`${homeHref}?category=${cat.slug}`}
                  className="group relative aspect-square rounded-2xl overflow-hidden border border-surface-100 dark:border-surface-800 block"
                >
                  <img
                    src={cat.cover_image!}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight">{cat.name}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── Category filter tabs ───────────────────────── */}
        {topCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mt-4">
            <a
              href={homeHref}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !category ? "text-black" : "bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300"
              }`}
              style={!category ? { backgroundColor: "var(--sf-accent)" } : {}}
            >
              All
            </a>
            {topCategories.map((cat) => (
              <a
                key={cat.id}
                href={`${homeHref}?category=${cat.slug}`}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  category === cat.slug ? "text-black" : "bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300"
                }`}
                style={category === cat.slug ? { backgroundColor: "var(--sf-accent)" } : {}}
              >
                {cat.name}
              </a>
            ))}
          </div>
        )}

        {/* ── Subcategory pills ──────────────────────────── */}
        {subcategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mt-8">
            <a
              href={`${homeHref}?category=${category}`}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                !sub
                  ? "bg-surface-800 dark:bg-surface-200 text-white dark:text-black"
                  : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400"
              }`}
            >
              All {activeCategory?.name}
            </a>
            {subcategories.map((s) => (
              <a
                key={s.id}
                href={`${homeHref}?category=${category}&sub=${s.slug}`}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  sub === s.slug
                    ? "bg-surface-800 dark:bg-surface-200 text-white dark:text-black"
                    : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400"
                }`}
              >
                {s.name}
              </a>
            ))}
          </div>
        )}

        {/* ── All Products grid ──────────────────────────── */}
        <section>
          {category && activeCategory && (
            <h2 className="text-xl font-black text-surface-900 dark:text-white mb-5">
              {activeCategory.name}
            </h2>
          )}
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
        </section>

        <BookmarkSlider storeSlug={slug} />
      </div>

      <div className="px-4 pb-8 border-t border-surface-100 dark:border-surface-800 pt-8 text-center">
        <p className="text-xs text-surface-300 dark:text-surface-600">
          Powered by{" "}
          <a href="https://awarizon.shop" className="font-semibold hover:underline">
            Duka by Awarizon
          </a>
        </p>
      </div>
    </div>
  );
}
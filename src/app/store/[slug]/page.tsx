import { headers } from "next/headers";
import { query, queryOne } from "@/lib/db";
import { getOrSet, cacheKey, TTL } from "@/lib/redis";
import ProductCard from "@/components/storefront/ProductCard";
import BookmarkSlider from "@/components/storefront/BookmarkSlider";
import HeroSlider from "@/components/storefront/HeroSlider";
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
  const hasBanner  = bannerImages.length > 0;

  // ── Default hero card (always shown when on homepage) ──────────────────────
  const defaultHero = (
    <div
      className="rounded-2xl overflow-hidden flex flex-col justify-center p-7 sm:p-10 h-full min-h-[180px]"
      style={{ background: "linear-gradient(135deg, var(--sf-accent-light, var(--sf-accent)) 0%, var(--sf-accent) 100%)" }}
    >
      {store.logo_url && (
        <img
          src={clLogo(store.logo_url)}
          alt={store.name}
          loading="eager"
          decoding="sync"
          className="h-14 w-auto object-contain mb-4 lg:mx-0 mx-auto"
        />
      )}
      <h1 className="text-2xl sm:text-3xl font-black text-black leading-tight lg:text-left text-center">
        {store.name}
      </h1>
      {store.description && (
        <p className="text-sm text-black/70 mt-2 max-w-sm lg:text-left text-center">
          {store.description}
        </p>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">

      {/* ── Hero section ───────────────────────────────────── */}
      {showBanner && (
        hasBanner ? (
          /* With uploaded banner images:
             Mobile  → slider on top, default banner below
             Desktop → default banner left column, slider right column */
          <div className="lg:grid lg:grid-cols-2 lg:gap-4 lg:px-4 lg:pt-4 lg:items-stretch">
            {/* Slider — first in DOM = top on mobile; right column on desktop */}
            <div className="lg:order-2">
              {/* Mobile: normal aspect ratio */}
              <div className="lg:hidden">
                <HeroSlider images={bannerImages} storeName={store.name} />
              </div>
              {/* Desktop: fills grid row height */}
              <div className="hidden lg:block h-full">
                <HeroSlider images={bannerImages} storeName={store.name} fillHeight />
              </div>
            </div>
            {/* Default banner — below slider on mobile; left column on desktop */}
            <div className="lg:order-1 px-4 pt-4 sm:px-4 lg:px-0 lg:pt-0">
              {defaultHero}
            </div>
          </div>
        ) : (
          /* No banner: just the default hero, full width */
          <div className="px-4 pt-6">
            {defaultHero}
          </div>
        )
      )}

      <div className="px-4 py-8 space-y-10">

        {/* ── Featured Products ───────────────────────────── */}
        {showBanner && featuredProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--sf-accent)" }}>
                  Hand-picked
                </p>
                <h2 className="text-lg font-black text-surface-900 dark:text-white">Featured</h2>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {featuredProducts.map((product) => (
                <div key={product.id} className="shrink-0 w-44 sm:w-52">
                  <ProductCard product={product} storeSlug={slug} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Collections grid ───────────────────────────── */}
        {showBanner && categoryCovers.filter(c => c.cover_image).length > 0 && (
          <section>
            <div className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--sf-accent)" }}>
                Browse by collection
              </p>
              <h2 className="text-lg font-black text-surface-900 dark:text-white">Collections</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categoryCovers.filter(c => c.cover_image).map((cat) => (
                <a
                  key={cat.id}
                  href={`${homeHref}?category=${cat.slug}`}
                  className="group relative aspect-[4/3] rounded-2xl overflow-hidden block shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.12)] transition-shadow duration-200"
                >
                  <img
                    src={cat.cover_image!}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight drop-shadow-sm">{cat.name}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── Category filter tabs ───────────────────────── */}
        {topCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
            <a
              href={homeHref}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                !category
                  ? "shadow-[0_2px_8px_rgba(0,0,0,0.12)] text-black"
                  : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700"
              }`}
              style={!category ? { backgroundColor: "var(--sf-accent)" } : {}}
            >
              All
            </a>
            {topCategories.map((cat) => (
              <a
                key={cat.id}
                href={`${homeHref}?category=${cat.slug}`}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  category === cat.slug
                    ? "shadow-[0_2px_8px_rgba(0,0,0,0.12)] text-black"
                    : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700"
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
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 -mt-6" style={{ scrollbarWidth: "none" }}>
            <a
              href={`${homeHref}?category=${category}`}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                !sub
                  ? "bg-surface-900 dark:bg-surface-100 text-white dark:text-black"
                  : "bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
              }`}
            >
              All {activeCategory?.name}
            </a>
            {subcategories.map((s) => (
              <a
                key={s.id}
                href={`${homeHref}?category=${category}&sub=${s.slug}`}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  sub === s.slug
                    ? "bg-surface-900 dark:bg-surface-100 text-white dark:text-black"
                    : "bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
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
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-surface-900 dark:text-white">{activeCategory.name}</h2>
              <span className="text-xs text-surface-400">{products.length} item{products.length !== 1 ? "s" : ""}</span>
            </div>
          )}
          {!category && products.length > 0 && (
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--sf-accent)" }}>
                  Our store
                </p>
                <h2 className="text-lg font-black text-surface-900 dark:text-white">All Products</h2>
              </div>
              <span className="text-xs text-surface-400">{products.length} item{products.length !== 1 ? "s" : ""}</span>
            </div>
          )}
          {products.length === 0 ? (
            <div className="py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4 text-3xl">
                🛍️
              </div>
              <p className="font-bold text-surface-900 dark:text-white mb-1">No products yet</p>
              <p className="text-sm text-surface-400">
                {category ? "No products in this category" : "This store hasn't added products yet"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} storeSlug={slug} />
              ))}
            </div>
          )}
        </section>

        <BookmarkSlider storeSlug={slug} />
      </div>

      <div className="px-4 pb-10 border-t border-surface-100 dark:border-surface-800 pt-8 text-center">
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
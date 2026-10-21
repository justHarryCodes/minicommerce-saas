import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getOrSet, cacheKey, TTL } from "@/lib/redis";
import StorefrontHome from "@/components/storefront/StorefrontHome";
import type { CategoryTileData } from "@/components/storefront/ThemeSections";
import { getRequestTheme } from "@/lib/themes/server";
import { footerPages, pageLinksFor } from "@/lib/store-pages";
import { isSoldOutToday } from "@/lib/hours";
import type { Testimonial } from "@/lib/themes/types";
import type { Product, Category, Store } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; sub?: string }>;
}


/* ───────────────────────────── Data ───────────────────────────── */

async function getStoreProducts(
  storeId: string,
  categorySlug?: string,
  subSlug?: string,
) {
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

/** Top N products per top-level category, in one query. */
async function getRailProducts(storeId: string, perCategory = 8) {
  return query<Product>(
    `SELECT * FROM (
       SELECT p.*,
              ROW_NUMBER() OVER (
                PARTITION BY p.category_id
                ORDER BY p.sort_order, p.created_at DESC
              ) AS rn
       FROM products p
       WHERE p.store_id = $1 AND p.is_active = true
         AND p.stock_quantity > 0 AND p.category_id IS NOT NULL
     ) t
     WHERE t.rn <= $2
     ORDER BY t.category_id, t.rn`,
    [storeId, perCategory],
  );
}


/** Recent approved 4–5★ reviews with a written body, for the testimonials section. */
async function getTestimonials(storeId: string) {
  return query<Testimonial>(
    `SELECT r.id, r.customer_name, r.rating, r.body, p.name AS product_name
     FROM reviews r
     LEFT JOIN products p ON p.id = r.product_id
     WHERE r.store_id = $1 AND r.is_approved = true AND r.rating >= 4
       AND r.body IS NOT NULL AND length(trim(r.body)) > 10
     ORDER BY r.created_at DESC
     LIMIT 6`,
    [storeId],
  ).catch(() => [] as Testimonial[]);
}

/* ───────────────────────────── Page ───────────────────────────── */

export default async function StorefrontPage({ params, searchParams }: Props) {
  const { slug: paramSlug } = await params;
  const { category, sub } = await searchParams;

  const h = await headers();
  const isSubdomain = h.get("x-is-subdomain") === "1";

  // Prefer the header slug (set by middleware on subdomain requests) over the
  // URL param — this guards against a failed rewrite serving the wrong slug.
  const slug = h.get("x-store-slug") ?? paramSlug;
  const storeBase = isSubdomain ? "" : `/store/${slug}`;

  const store = await queryOne<Store>("SELECT * FROM stores WHERE slug = $1", [slug]);
  if (!store) return notFound();
  if (!store.is_active) return notFound();

  const allCategories =
    (await getOrSet<Category[]>(
      cacheKey.storeCategories(store.id),
      () =>
        query<Category>(
          "SELECT * FROM categories WHERE store_id = $1 ORDER BY sort_order ASC, name ASC",
          [store.id],
        ) as Promise<Category[]>,
      TTL.CATEGORY_LIST,
    )) ?? [];

  const topCategories = allCategories.filter((c) => !c.parent_id);
  const activeCategory = topCategories.find((c) => c.slug === category);
  const subcategories = activeCategory ? allCategories.filter((c) => c.parent_id === activeCategory.id) : [];
  const activeSub = subcategories.find((s) => s.slug === sub);

  const isHome = !category;
  const footerLinks = pageLinksFor(await footerPages(store.id), storeBase);
  const theme = await getRequestTheme(store);
  const wants = (id: string) => isHome && theme.layout.sections.includes(id as never);

  const [products, featuredProducts, categoryTiles, railRows, testimonials] = await Promise.all([
    getStoreProducts(store.id, category, sub),

    // Featured products (vendor-selected, in order)
    isHome && store.featured_product_ids?.length
      ? query<Product>(
          `SELECT * FROM products
           WHERE store_id = $1 AND id = ANY($2::uuid[]) AND is_active = true`,
          [store.id, store.featured_product_ids],
        ).then((rows) => {
          const order = store.featured_product_ids!;
          return rows.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
        })
      : Promise.resolve([] as Product[]),

    // Category tiles: cover image = first active product image
    wants("categories")
      ? query<CategoryTileData>(
          `SELECT c.id, c.name, c.slug, c.sort_order,
             (SELECT p.image_url FROM products p
              WHERE p.category_id = c.id AND p.is_active = true
                AND p.image_url IS NOT NULL AND p.image_url <> ''
              ORDER BY p.sort_order, p.created_at DESC LIMIT 1
             ) AS cover_image,
             (SELECT COUNT(*)::int FROM products p
              WHERE p.category_id = c.id AND p.is_active = true
                AND p.stock_quantity > 0
             ) AS product_count
           FROM categories c
           WHERE c.store_id = $1 AND c.parent_id IS NULL
           ORDER BY c.sort_order, c.name`,
          [store.id],
        )
      : Promise.resolve([] as CategoryTileData[]),

    wants("categoryRails") ? getRailProducts(store.id) : Promise.resolve([] as Product[]),

    wants("testimonials") ? getTestimonials(store.id) : Promise.resolve([] as Testimonial[]),
  ]);

  // Food stores: flag items marked "sold out today" (cards show a badge)
  const now = new Date();
  for (const list of [products, featuredProducts, railRows]) {
    for (const p of list) p.sold_out_today = isSoldOutToday(p.sold_out_until, now);
  }

  return (
    <StorefrontHome
      store={store}
      theme={theme}
      slug={slug}
      storeBase={storeBase}
      category={category}
      sub={sub}
      topCategories={topCategories}
      subcategories={subcategories}
      activeCategory={activeCategory}
      activeSub={activeSub}
      products={products}
      featuredProducts={featuredProducts}
      categoryTiles={categoryTiles}
      railRows={railRows}
      testimonials={testimonials}
      footerLinks={footerLinks}
    />
  );
}

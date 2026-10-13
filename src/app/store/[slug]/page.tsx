import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Film,
  LayoutGrid,
  MessageCircle,
  Package,
  Phone,
} from "lucide-react";
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

interface CategoryTileData {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  cover_image: string | null;
  product_count: number;
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

/* ─────────────────────── Small presentational bits ─────────────────────── */

const scrollRow =
  "flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel = "See all",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-black tracking-tight text-surface-900 dark:text-white sm:text-2xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
            {subtitle}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-surface-900 hover:underline dark:text-white"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

/** Horizontal scroller on mobile, 5-up grid on desktop. */
function ProductRail({
  products,
  slug,
}: {
  products: Product[];
  slug: string;
}) {
  return (
    <div
      className={`-mx-4 px-4 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:px-0 ${scrollRow}`}
    >
      {products.map((product, i) => (
        <div
          key={product.id}
          className={`w-[44%] shrink-0 snap-start sm:w-52 lg:w-auto ${
            i >= 5 ? "lg:hidden" : ""
          }`}
        >
          <ProductCard product={product} storeSlug={slug} />
        </div>
      ))}
    </div>
  );
}

function CategoryTile({
  href,
  name,
  image,
}: {
  href: string;
  name: string;
  image?: string | null;
}) {
  return (
    <Link
      href={href}
      className="group w-[76px] shrink-0 snap-start sm:w-24 lg:w-28"
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface-100 ring-1 ring-black/5 transition-shadow group-hover:ring-2 group-hover:ring-[color:var(--sf-accent)] dark:bg-surface-800 dark:ring-white/10">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 1024px) 112px, 96px"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-2xl font-black text-surface-400">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <span className="mt-2 line-clamp-2 block text-center text-xs font-semibold leading-tight text-surface-800 dark:text-surface-200 sm:text-[13px]">
        {name}
      </span>
    </Link>
  );
}

function BrandPanel({
  store,
  whatsappHref,
  compact,
}: {
  store: Store;
  whatsappHref: string | null;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex h-full flex-col justify-between overflow-hidden rounded-3xl ${
        compact
          ? "min-h-[360px] p-8"
          : "min-h-[220px] p-7 sm:min-h-[300px] sm:p-12"
      }`}
      style={{
        background:
          "linear-gradient(135deg, var(--sf-accent-light, var(--sf-accent)) 0%, var(--sf-accent) 100%)",
      }}
    >
      {store.logo_url ? (
        <div className="w-fit rounded-2xl bg-white/90 p-2.5 shadow-sm">
          <Image
            src={clLogo(store.logo_url)}
            alt=""
            width={168}
            height={56}
            priority
            className="h-10 w-auto object-contain sm:h-12"
          />
        </div>
      ) : (
        <span />
      )}

      <div className="mt-8">
        <h1
          className={`font-black leading-[1.05] tracking-tight text-black ${
            compact ? "text-3xl" : "text-3xl sm:text-5xl"
          }`}
        >
          {store.name}
        </h1>
        {store.description && (
          <p className="mt-3 line-clamp-3 max-w-md text-sm text-black/70 sm:text-base">
            {store.description}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href="#shop"
            className="rounded-full bg-black px-6 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.03]"
          >
            Shop now
          </a>
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-black/10 px-5 py-3 text-sm font-bold text-black transition-colors hover:bg-black/15"
            >
              <MessageCircle className="h-4 w-4" />
              Chat with us
            </a>
          )}
        </div>
      </div>
    </div>
  );
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
  const homeHref = storeBase || "/";

  const store = await queryOne<Store>("SELECT * FROM stores WHERE slug = $1", [
    slug,
  ]);
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
  const subcategories = activeCategory
    ? allCategories.filter((c) => c.parent_id === activeCategory.id)
    : [];
  const activeSub = subcategories.find((s) => s.slug === sub);

  const isHome = !category;

  const [products, featuredProducts, categoryTiles, railRows] =
    await Promise.all([
      getStoreProducts(store.id, category, sub),

      // Featured products (vendor-selected, in order)
      isHome && store.featured_product_ids?.length
        ? query<Product>(
            `SELECT * FROM products
             WHERE store_id = $1 AND id = ANY($2::uuid[]) AND is_active = true`,
            [store.id, store.featured_product_ids],
          ).then((rows) => {
            const order = store.featured_product_ids!;
            return rows.sort(
              (a, b) => order.indexOf(a.id) - order.indexOf(b.id),
            );
          })
        : Promise.resolve([] as Product[]),

      // Category tiles: cover image = first active product image
      isHome
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

      isHome ? getRailProducts(store.id) : Promise.resolve([] as Product[]),
    ]);

  const bannerImages: string[] = store.banner_images ?? [];
  const hasBanner = bannerImages.length > 0;
  const whatsappHref = store.whatsapp
    ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}`
    : null;

  // Home-only derived data
  const visibleTiles = categoryTiles.filter((c) => c.product_count > 0);
  const countById = new Map(categoryTiles.map((c) => [c.id, c.product_count]));

  const railByCategory = new Map<string, Product[]>();
  for (const p of railRows) {
    const key = p.category_id as string;
    const list = railByCategory.get(key) ?? [];
    list.push(p);
    railByCategory.set(key, list);
  }
  const railCategories = topCategories
    .filter((c) => (railByCategory.get(c.id)?.length ?? 0) > 0)
    .slice(0, 5);

  // Newest first (created_at is selected by the products query)
  const newArrivals =
    products.length >= 6
      ? [...products]
          .sort(
            (a, b) =>
              +new Date(b.created_at as unknown as string) -
              +new Date(a.created_at as unknown as string),
          )
          .slice(0, 10)
      : [];

  const perks = [
    {
      href: `${storeBase}/track`,
      icon: Package,
      title: "Track order",
      text: "See where your order is",
    },
    {
      href: `${storeBase}/reels`,
      icon: Film,
      title: "Reels",
      text: "Shop from short videos",
    },
    ...(whatsappHref
      ? [
          {
            href: whatsappHref,
            icon: MessageCircle,
            title: "WhatsApp",
            text: "Ask the store anything",
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-7xl">
      {/* ═══════════════ HOME ═══════════════ */}
      {isHome && (
        <>
          {/* Hero */}
          <section className="px-4 pt-4 lg:px-6 lg:pt-6">
            {hasBanner ? (
              <>
                <h1 className="sr-only lg:hidden">{store.name}</h1>
                <div className="grid gap-4 lg:min-h-[360px] lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
                  <div className="overflow-hidden rounded-3xl">
                    <div className="lg:hidden">
                      <HeroSlider
                        images={bannerImages}
                        storeName={store.name}
                      />
                    </div>
                    <div className="hidden h-full lg:block">
                      <HeroSlider
                        images={bannerImages}
                        storeName={store.name}
                        fillHeight
                      />
                    </div>
                  </div>
                  <div className="hidden lg:block">
                    <BrandPanel
                      store={store}
                      whatsappHref={whatsappHref}
                      compact
                    />
                  </div>
                </div>
              </>
            ) : (
              <BrandPanel store={store} whatsappHref={whatsappHref} />
            )}
          </section>

          {/* Category tiles */}
          {visibleTiles.length > 0 && (
            <section
              id="collections"
              className="scroll-mt-36 pt-7 lg:px-6 lg:pt-10"
            >
              <div className="px-4 lg:px-0">
                <SectionHeader title="Shop by category" />
              </div>
              <div className={`gap-4 px-4 pb-1 lg:gap-6 lg:px-0 ${scrollRow}`}>
                <Link
                  href="#shop"
                  className="group w-[76px] shrink-0 snap-start sm:w-24 lg:w-28"
                >
                  <div
                    className="grid aspect-square place-items-center rounded-2xl text-black"
                    style={{ backgroundColor: "var(--sf-accent)" }}
                  >
                    <LayoutGrid className="h-7 w-7" />
                  </div>
                  <span className="mt-2 block text-center text-xs font-semibold text-surface-800 dark:text-surface-200 sm:text-[13px]">
                    Shop all
                  </span>
                </Link>
                {visibleTiles.map((cat) => (
                  <CategoryTile
                    key={cat.id}
                    href={`${homeHref}?category=${cat.slug}`}
                    name={cat.name}
                    image={cat.cover_image}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Help strip */}
          <section className="px-4 pt-7 lg:px-6 lg:pt-10">
            <div
              className={`grid gap-2 sm:gap-3 ${
                perks.length === 3 ? "grid-cols-3" : "grid-cols-2"
              }`}
            >
              {perks.map(({ href, icon: Icon, title, text }) => (
                <Link
                  key={title}
                  href={href}
                  {...(href.startsWith("http")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-surface-100 px-3 py-4 text-center transition-colors hover:bg-surface-50 dark:border-surface-800 dark:hover:bg-surface-800 sm:flex-row sm:gap-3.5 sm:px-5 sm:text-left"
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-black"
                    style={{ backgroundColor: "var(--sf-accent)" }}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-surface-900 dark:text-white">
                      {title}
                    </span>
                    <span className="hidden text-xs text-surface-500 dark:text-surface-400 sm:block">
                      {text}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <div className="space-y-12 px-4 pt-10 lg:space-y-16 lg:px-6 lg:pt-14">
            {/* Featured */}
            {featuredProducts.length > 0 && (
              <section>
                <SectionHeader
                  title="Featured"
                  subtitle="Picked by the store"
                />
                <ProductRail products={featuredProducts} slug={slug} />
              </section>
            )}

            {/* New arrivals */}
            {newArrivals.length > 0 && (
              <section>
                <SectionHeader
                  title="New arrivals"
                  subtitle="The latest additions"
                  href="#shop"
                  linkLabel="Browse all"
                />
                <ProductRail products={newArrivals} slug={slug} />
              </section>
            )}

            {/* Category rails */}
            {railCategories.map((cat, i) => (
              <section
                key={cat.id}
                className={
                  i % 2 === 0
                    ? "-mx-4 bg-surface-50 px-4 py-8 dark:bg-surface-800/40 lg:mx-0 lg:rounded-3xl lg:px-8"
                    : ""
                }
              >
                <SectionHeader
                  title={cat.name}
                  href={`${homeHref}?category=${cat.slug}`}
                  linkLabel={`See all ${countById.get(cat.id) ?? ""}`.trim()}
                />
                <ProductRail
                  products={railByCategory.get(cat.id) ?? []}
                  slug={slug}
                />
              </section>
            ))}
          </div>
        </>
      )}

      {/* ═══════════════ CATEGORY VIEW ═══════════════ */}
      {!isHome && (
        <div className="px-4 pt-6 lg:px-6">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1 text-sm text-surface-500 dark:text-surface-400"
          >
            <Link
              href={homeHref}
              className="hover:text-surface-900 dark:hover:text-white"
            >
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            {activeSub ? (
              <>
                <Link
                  href={`${homeHref}?category=${category}`}
                  className="hover:text-surface-900 dark:hover:text-white"
                >
                  {activeCategory?.name}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="font-semibold text-surface-900 dark:text-white">
                  {activeSub.name}
                </span>
              </>
            ) : (
              <span className="font-semibold text-surface-900 dark:text-white">
                {activeCategory?.name ?? "Category"}
              </span>
            )}
          </nav>

          <div className="mt-3 flex items-end justify-between">
            <h1 className="text-2xl font-black tracking-tight text-surface-900 dark:text-white sm:text-4xl">
              {activeSub?.name ?? activeCategory?.name ?? "Products"}
            </h1>
            <span className="text-sm text-surface-500 dark:text-surface-400">
              {products.length} item{products.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Other categories */}
          <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0">
            <Link
              href={homeHref}
              className="shrink-0 whitespace-nowrap rounded-full bg-surface-100 px-4 py-2 text-sm font-semibold text-surface-600 transition-colors hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
            >
              All
            </Link>
            {topCategories.map((cat) => {
              const active = category === cat.slug;
              return (
                <Link
                  key={cat.id}
                  href={`${homeHref}?category=${cat.slug}`}
                  className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "text-black"
                      : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
                  }`}
                  style={active ? { backgroundColor: "var(--sf-accent)" } : {}}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>

          {/* Subcategories */}
          {subcategories.length > 0 && (
            <div className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0">
              <Link
                href={`${homeHref}?category=${category}`}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  !sub
                    ? "bg-surface-900 text-white dark:bg-surface-100 dark:text-black"
                    : "bg-surface-100 text-surface-500 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700"
                }`}
              >
                All {activeCategory?.name}
              </Link>
              {subcategories.map((s) => (
                <Link
                  key={s.id}
                  href={`${homeHref}?category=${category}&sub=${s.slug}`}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    sub === s.slug
                      ? "bg-surface-900 text-white dark:bg-surface-100 dark:text-black"
                      : "bg-surface-100 text-surface-500 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700"
                  }`}
                >
                  {s.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ PRODUCT GRID (both views) ═══════════════ */}
      <section
        id="shop"
        className={`scroll-mt-36 px-4 lg:px-6 ${isHome ? "pt-12 lg:pt-16" : "pt-6"}`}
      >
        {isHome && products.length > 0 && (
          <SectionHeader
            title="All products"
            subtitle={`${products.length} item${products.length !== 1 ? "s" : ""} in store`}
          />
        )}

        {products.length === 0 ? (
          <div className="py-24 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100 text-3xl dark:bg-surface-800">
              🛍️
            </div>
            <p className="mb-1 font-bold text-surface-900 dark:text-white">
              {category ? "Nothing here yet" : "No products yet"}
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {category
                ? "This category has no products in stock. Try another one."
                : "This store hasn't added products yet. Check back soon."}
            </p>
            {category && (
              <Link
                href={homeHref}
                className="mt-5 inline-block rounded-full bg-surface-900 px-5 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-black"
              >
                Browse all products
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                storeSlug={slug}
              />
            ))}
          </div>
        )}
      </section>

      <div className="px-4 pt-12 lg:px-6">
        <BookmarkSlider storeSlug={slug} />
      </div>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="mt-16 border-t border-surface-100 bg-surface-50 dark:border-surface-800 dark:bg-surface-900/50">
        <div className="grid gap-10 px-4 py-12 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-6">
          <div>
            <p className="text-lg font-black tracking-tight text-surface-900 dark:text-white">
              {store.name}
            </p>
            {store.description && (
              <p className="mt-2 line-clamp-3 max-w-sm text-sm text-surface-500 dark:text-surface-400">
                {store.description}
              </p>
            )}
          </div>

          <div>
            <p className="mb-3 text-sm font-bold text-surface-900 dark:text-white">
              Shop
            </p>
            <ul className="space-y-2 text-sm text-surface-500 dark:text-surface-400">
              <li>
                <Link
                  href={homeHref}
                  className="hover:text-surface-900 dark:hover:text-white"
                >
                  All products
                </Link>
              </li>
              {topCategories.slice(0, 5).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`${homeHref}?category=${cat.slug}`}
                    className="hover:text-surface-900 dark:hover:text-white"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-sm font-bold text-surface-900 dark:text-white">
              Help
            </p>
            <ul className="space-y-2 text-sm text-surface-500 dark:text-surface-400">
              <li>
                <Link
                  href={`${storeBase}/track`}
                  className="hover:text-surface-900 dark:hover:text-white"
                >
                  Track your order
                </Link>
              </li>
              <li>
                <Link
                  href={`${storeBase}/reels`}
                  className="hover:text-surface-900 dark:hover:text-white"
                >
                  Reels
                </Link>
              </li>
              {whatsappHref && (
                <li>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-surface-900 dark:hover:text-white"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </li>
              )}
              {store.phone && (
                <li>
                  <a
                    href={`tel:${store.phone}`}
                    className="flex items-center gap-2 hover:text-surface-900 dark:hover:text-white"
                  >
                    <Phone className="h-4 w-4" /> {store.phone}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-surface-100 px-4 py-5 text-center text-xs text-surface-400 dark:border-surface-800 lg:px-6">
          © {new Date().getFullYear()} {store.name} · Powered by{" "}
          <a
            href="https://dukanigeria.com"
            className="font-semibold hover:underline"
          >
            Duka by Awarizon
          </a>
        </div>
      </footer>
    </div>
  );
}

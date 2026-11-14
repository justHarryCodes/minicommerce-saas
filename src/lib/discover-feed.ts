// Discover "For you": a social-style feed of posts across every Duka store.
//
//   product  a product as a post: store header, photos, price, caption,
//            likes (anonymous, one per device)
//   store    "New on Duka": a recently opened store with a few products
//   reel     a store's video
//
// Ranking blends freshness, likes and views, with a boost for featured
// products, and spreads stores out so one shop never fills the screen.

import { query } from "@/lib/db";
import { getOrSet } from "@/lib/redis";
import { getTrendingReels } from "@/lib/reels";
import { clCard, clMedium } from "@/lib/cloudinary";
import { metaText } from "@/lib/seo";

export const FEED_PAGE = 12;
const SPOTLIGHT_EVERY = 5; // a store spotlight after every 5 products
const REEL_EVERY = 8; // a reel after every 8 products
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VISITOR = /^[A-Za-z0-9-]{8,64}$/;

export interface FeedStore {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  category: string | null;
  verified: boolean;
}

export interface ProductPost {
  type: "product";
  key: string;
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_price: number | null;
  images: string[];
  caption: string;
  category: string | null;
  stock: number | null;
  created_at: string;
  likes: number;
  liked: boolean;
  store: FeedStore;
}

export interface StorePost {
  type: "store";
  key: string;
  store: FeedStore & { description: string | null; created_at: string; product_count: number };
  products: { id: string; name: string; slug: string; price: number; image: string }[];
}

export interface ReelPost {
  type: "reel";
  key: string;
  id: string;
  title: string | null;
  thumbnail: string | null;
  views: number;
  store: Pick<FeedStore, "name" | "slug" | "logo">;
}

export type FeedPost = ProductPost | StorePost | ReelPost;

export const validLike = (productId: unknown, visitorId: unknown): productId is string =>
  typeof productId === "string" && UUID.test(productId) && typeof visitorId === "string" && VISITOR.test(visitorId);

let likesReady = false;
export async function ensureLikesTable() {
  if (likesReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS product_likes (
      product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      visitor_id TEXT        NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (product_id, visitor_id)
    )
  `);
  likesReady = true;
}

/** Like or unlike; returns the new total. */
export async function setLike(productId: string, visitorId: string, liked: boolean): Promise<number | null> {
  await ensureLikesTable();
  const exists = await query(`SELECT 1 FROM products p JOIN stores s ON s.id = p.store_id WHERE p.id = $1 AND p.is_active = true AND s.is_active = true`, [productId]);
  if (!exists.length) return null;
  if (liked) {
    await query(`INSERT INTO product_likes (product_id, visitor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [productId, visitorId]);
  } else {
    await query(`DELETE FROM product_likes WHERE product_id = $1 AND visitor_id = $2`, [productId, visitorId]);
  }
  const rows = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM product_likes WHERE product_id = $1`, [productId]);
  return Number(rows[0]?.n ?? 0);
}

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  price: string | number;
  compare_price: string | number | null;
  image_url: string | null;
  images: string[] | null;
  short_description: string | null;
  description: string | null;
  category_name: string | null;
  stock_quantity: number | null;
  created_at: string;
  likes: number;
  store_id: string;
  store_name: string;
  store_slug: string;
  store_logo: string | null;
  store_category: string | null;
  nin_verified: boolean | null;
}

/**
 * Never the same store in 3 posts running (when there's a choice): greedy
 * pick of the best-ranked product whose store wasn't one of the last two.
 */
export function spreadStores<T extends { store: { id: string } }>(items: T[]): T[] {
  const left = [...items];
  const out: T[] = [];
  while (left.length) {
    const recent = new Set(out.slice(-2).map((x) => x.store.id));
    const i = left.findIndex((x) => !recent.has(x.store.id));
    out.push(left.splice(i === -1 ? 0 : i, 1)[0]);
  }
  return out;
}

let viewsTable: boolean | null = null;
/** product_views comes from a migration; rank without views until it exists. */
async function hasViewsTable(): Promise<boolean> {
  if (viewsTable === null) {
    const rows = await query<{ t: string | null }>(`SELECT to_regclass('public.product_views')::text AS t`).catch(() => []);
    viewsTable = !!rows[0]?.t;
  }
  return viewsTable;
}

async function rankedProducts(category: string, q: string, page: number): Promise<ProductRow[]> {
  await ensureLikesTable();
  const views = await hasViewsTable();
  const where = [
    "p.is_active = true",
    "s.is_active = true",
    "s.deleted_at IS NULL",
    "COALESCE(p.stock_quantity, 0) > 0",
    "COALESCE(NULLIF(p.image_url, ''), p.images[1]) IS NOT NULL",
  ];
  const vals: unknown[] = [];
  if (category && category !== "all") {
    vals.push(category);
    where.push(`s.primary_category = $${vals.length}`);
  }
  if (q) {
    vals.push(`%${q}%`);
    where.push(`(p.name ILIKE $${vals.length} OR s.name ILIKE $${vals.length} OR c.name ILIKE $${vals.length})`);
  }
  vals.push(FEED_PAGE, (page - 1) * FEED_PAGE);
  return query<ProductRow>(
    `SELECT p.id, p.name, p.slug, p.price, p.compare_price, p.image_url, p.images,
            p.short_description, LEFT(p.description, 600) AS description, c.name AS category_name,
            p.stock_quantity, p.created_at,
            COALESCE(lk.n, 0)::int AS likes,
            s.id AS store_id, s.name AS store_name, s.slug AS store_slug, s.logo_url AS store_logo,
            s.primary_category AS store_category, s.nin_verified
       FROM products p
       JOIN stores s ON s.id = p.store_id
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN LATERAL (SELECT COUNT(*) AS n FROM product_likes l WHERE l.product_id = p.id) lk ON true
       ${views ? "LEFT JOIN LATERAL (SELECT COUNT(*) AS n FROM product_views v WHERE v.product_id = p.id AND v.viewed_on > CURRENT_DATE - 7) vw ON true" : "LEFT JOIN LATERAL (SELECT 0 AS n) vw ON true"}
      WHERE ${where.join(" AND ")}
      ORDER BY (CASE WHEN p.is_featured THEN 1.5 ELSE 0 END)
               + LN(1 + COALESCE(lk.n, 0) * 3 + COALESCE(vw.n, 0))
               - EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0 / 10.0 DESC,
               p.created_at DESC, p.id
      LIMIT $${vals.length - 1} OFFSET $${vals.length}`,
    vals,
  );
}

/** Recently opened stores with at least 3 products to show. */
async function spotlights(category: string, page: number): Promise<StorePost[]> {
  const vals: unknown[] = [];
  let cat = "";
  if (category && category !== "all") {
    vals.push(category);
    cat = `AND s.primary_category = $1`;
  }
  const perPage = Math.floor(FEED_PAGE / SPOTLIGHT_EVERY);
  vals.push(perPage, (page - 1) * perPage);
  const rows = await query<{
    id: string; name: string; slug: string; logo_url: string | null; primary_category: string | null; description: string | null;
    created_at: string; nin_verified: boolean | null; product_count: number;
    products: { id: string; name: string; slug: string; price: number; image: string }[];
  }>(
    `SELECT s.id, s.name, s.slug, s.logo_url, s.primary_category, s.description, s.created_at, s.nin_verified,
            (SELECT COUNT(*)::int FROM products x WHERE x.store_id = s.id AND x.is_active = true) AS product_count,
            pr.products
       FROM stores s
       JOIN LATERAL (
         SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'price', t.price, 'image', t.img)) AS products, COUNT(*) AS n
           FROM (SELECT id, name, slug, price, COALESCE(NULLIF(image_url, ''), images[1]) AS img
                   FROM products WHERE store_id = s.id AND is_active = true AND COALESCE(NULLIF(image_url, ''), images[1]) IS NOT NULL
                  ORDER BY is_featured DESC, created_at DESC LIMIT 3) t
       ) pr ON pr.n >= 3
      WHERE s.is_active = true AND s.deleted_at IS NULL ${cat}
      ORDER BY s.created_at DESC
      LIMIT $${vals.length - 1} OFFSET $${vals.length}`,
    vals,
  );
  return rows.map((s) => ({
    type: "store" as const,
    key: `store:${s.id}`,
    store: {
      id: s.id, name: s.name, slug: s.slug, logo: s.logo_url, category: s.primary_category, verified: !!s.nin_verified,
      description: s.description ? metaText(s.description, 140) : null, created_at: s.created_at, product_count: s.product_count,
    },
    products: (s.products ?? []).map((p) => ({ ...p, price: Number(p.price), image: clCard(p.image) })),
  }));
}

function toProductPost(r: ProductRow, liked: boolean): ProductPost {
  const images = [...new Set([r.image_url, ...(r.images ?? [])].filter((u): u is string => !!u))].slice(0, 6).map(clMedium);
  const compare = r.compare_price != null ? Number(r.compare_price) : null;
  return {
    type: "product",
    key: `product:${r.id}`,
    id: r.id,
    name: r.name,
    slug: r.slug || r.id,
    price: Number(r.price),
    compare_price: compare && compare > Number(r.price) ? compare : null,
    images,
    caption: metaText(r.short_description || r.description, 220),
    category: r.category_name && r.category_name !== "Uncategorized" ? r.category_name : null,
    stock: r.stock_quantity,
    created_at: r.created_at,
    likes: Number(r.likes) || 0,
    liked,
    store: { id: r.store_id, name: r.store_name, slug: r.store_slug, logo: r.store_logo, category: r.store_category, verified: !!r.nin_verified },
  };
}

/**
 * One page of the feed. The ranked lists are cached briefly and shared by
 * everyone; only "did this visitor like it" is looked up per request.
 */
export async function feedPage(opts: { category?: string; q?: string; page?: number; visitorId?: string | null }): Promise<{ posts: FeedPost[]; hasMore: boolean }> {
  const category = opts.category ?? "all";
  const q = (opts.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Math.min(50, opts.page ?? 1));

  const shared = await getOrSet(
    `discover:feed:${category}:${q}:${page}`,
    async () => {
      const [products, stores, reels] = await Promise.all([
        rankedProducts(category, q, page),
        q ? Promise.resolve([] as StorePost[]) : spotlights(category, page).catch(() => [] as StorePost[]),
        q || (category && category !== "all") ? Promise.resolve([]) : getTrendingReels().catch(() => []),
      ]);
      const perPage = Math.floor(FEED_PAGE / REEL_EVERY);
      const pageReels: ReelPost[] = reels.slice((page - 1) * perPage, page * perPage).map((r) => ({
        type: "reel" as const,
        key: `reel:${r.id}`,
        id: r.id,
        title: r.title,
        thumbnail: r.thumbnail_url,
        views: r.view_count ?? 0,
        store: { name: r.store_name ?? "", slug: r.store_slug ?? "", logo: r.store_logo ?? null },
      }));
      return { products, stores, reels: pageReels };
    },
    120,
  );
  const { products = [], stores = [], reels = [] } = shared ?? {};

  let liked = new Set<string>();
  if (opts.visitorId && VISITOR.test(opts.visitorId) && products.length) {
    const rows = await query<{ product_id: string }>(
      `SELECT product_id FROM product_likes WHERE visitor_id = $1 AND product_id = ANY($2::uuid[])`,
      [opts.visitorId, products.map((p) => p.id)],
    ).catch(() => []);
    liked = new Set(rows.map((r) => r.product_id));
  }

  const ordered = spreadStores(products.map((r) => toProductPost(r, liked.has(r.id))));
  const posts: FeedPost[] = [];
  let s = 0;
  let rl = 0;
  ordered.forEach((p, i) => {
    posts.push(p);
    const n = i + 1;
    if (n % SPOTLIGHT_EVERY === 0 && stores[s]) posts.push(stores[s++]);
    if (n % REEL_EVERY === 0 && reels[rl]) posts.push(reels[rl++]);
  });
  return { posts, hasMore: products.length === FEED_PAGE };
}

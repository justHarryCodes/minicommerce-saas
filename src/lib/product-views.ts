// Product views: what shoppers open, recorded per anonymous visitor per day.
// Feeds "Customers also viewed" and the Analytics view reports. Every read
// and write tolerates the table not existing yet (migrations/product_views.sql
// not run): the features simply stay empty instead of breaking pages.

import { query } from "@/lib/db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VISITOR = /^[A-Za-z0-9_-]{8,64}$/;
const TZ = "Africa/Lagos";
const today = `(NOW() AT TIME ZONE '${TZ}')::date`;

/** Missing table (migration not run yet) → treat as "no data". */
function missingTable(err: unknown): boolean {
  return (err as { code?: string })?.code === "42P01";
}

export function validView(productId: unknown, visitorId: unknown): productId is string {
  return typeof productId === "string" && UUID.test(productId) && typeof visitorId === "string" && VISITOR.test(visitorId);
}

/** Record one view. The product must belong to the store; repeats the same day are ignored. */
export async function recordView(storeId: string, productId: string, visitorId: string): Promise<boolean> {
  try {
    const rows = await query(
      `INSERT INTO product_views (store_id, product_id, visitor_id, viewed_on)
       SELECT $1, p.id, $3, ${today} FROM products p WHERE p.id = $2 AND p.store_id = $1
       ON CONFLICT DO NOTHING
       RETURNING 1`,
      [storeId, productId, visitorId],
    );
    return rows.length > 0;
  } catch (err) {
    if (missingTable(err)) return false;
    throw err;
  }
}

/** Other products opened by people who viewed this one (last 90 days), best first. */
export async function alsoViewedIds(storeId: string, productId: string, limit = 8): Promise<string[]> {
  try {
    const rows = await query<{ product_id: string }>(
      `WITH viewers AS (
         SELECT DISTINCT visitor_id FROM product_views
         WHERE store_id = $1 AND product_id = $2 AND viewed_on > ${today} - 90
         LIMIT 2000
       )
       SELECT pv.product_id
       FROM product_views pv
       JOIN viewers v ON v.visitor_id = pv.visitor_id
       JOIN products p ON p.id = pv.product_id AND p.is_active = true
       WHERE pv.store_id = $1 AND pv.product_id <> $2 AND pv.viewed_on > ${today} - 90
       GROUP BY pv.product_id
       ORDER BY COUNT(DISTINCT pv.visitor_id) DESC, MAX(pv.created_at) DESC
       LIMIT $3`,
      [storeId, productId, limit],
    );
    return rows.map((r) => r.product_id);
  } catch (err) {
    if (missingTable(err)) return [];
    throw err;
  }
}

export interface ProductViewStat {
  productId: string;
  name: string;
  views: number;
  orders: number;
}

/**
 * Per product over the last `days`: unique viewers, and orders containing it.
 * Sorted by views — the dashboard shows the top, and the ones viewed a lot
 * but rarely bought.
 */
export async function productViewStats(storeId: string, days: number, limit = 50): Promise<ProductViewStat[]> {
  try {
    const rows = await query<{ product_id: string; name: string; views: number; orders: number }>(
      `WITH v AS (
         SELECT product_id, COUNT(DISTINCT visitor_id)::int AS views
         FROM product_views
         WHERE store_id = $1 AND viewed_on > ${today} - $2::int
         GROUP BY product_id
       ),
       o AS (
         SELECT oi.product_id, COUNT(DISTINCT oi.order_id)::int AS orders
         FROM order_items oi JOIN orders ord ON ord.id = oi.order_id
         WHERE ord.store_id = $1 AND ord.order_status <> 'cancelled'
           AND (ord.created_at AT TIME ZONE '${TZ}')::date > ${today} - $2::int
         GROUP BY oi.product_id
       )
       SELECT v.product_id, p.name, v.views, COALESCE(o.orders, 0)::int AS orders
       FROM v JOIN products p ON p.id = v.product_id
       LEFT JOIN o ON o.product_id = v.product_id
       ORDER BY v.views DESC, p.name
       LIMIT $3`,
      [storeId, days, limit],
    );
    return rows.map((r) => ({ productId: r.product_id, name: r.name, views: Number(r.views), orders: Number(r.orders) }));
  } catch (err) {
    if (missingTable(err)) return [];
    throw err;
  }
}

/** Viewed by at least `minViews` people but bought by few: worth a better photo, price or description. */
export function viewedNotBought(stats: ProductViewStat[], minViews = 5, maxRate = 0.02): ProductViewStat[] {
  return stats
    .filter((s) => s.views >= minViews && s.orders / s.views <= maxRate)
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);
}

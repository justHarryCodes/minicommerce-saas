// Store analytics for the dashboard — every number is scoped to one store
// and one date range, and compared with the previous range of equal length.
// Days are in Africa/Lagos time so "today" matches the merchant's day.

import { query, queryOne } from "@/lib/db";
import { PHONE_KEY_SQL } from "@/lib/customers";

export const RANGES = [7, 30, 90] as const;
export type RangeDays = (typeof RANGES)[number];

const TZ = "Africa/Lagos";
const localDate = (col: string) => `(${col} AT TIME ZONE '${TZ}')::date`;
const today = `(NOW() AT TIME ZONE '${TZ}')::date`;

export interface Analytics {
  days: RangeDays;
  kpis: {
    revenue: number; revenuePrev: number;
    orders: number; ordersPrev: number;
    visitors: number; visitorsPrev: number;
    paidRevenue: number;
  };
  daily: { date: string; revenue: number; orders: number; visitors: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  sources: { source: string; visits: number }[];
  funnel: { visitors: number; checkouts: number; orders: number; paid: number };
  payments: { method: string; orders: number; revenue: number }[];
  zones: { zone: string; orders: number }[];
  searches: { query: string; count: number; results: number }[];
  zeroSearches: { query: string; count: number }[];
  customers: { new: number; returning: number };
}

export async function getAnalytics(storeId: string, days: RangeDays): Promise<Analytics> {
  // $2 = days in range; current range = [today - days + 1, today], previous = the days before
  const start = `(${today} - ($2::int - 1))`;
  const prevStart = `(${today} - (2 * $2::int - 1))`;
  const inRange = (col: string) => `${localDate(col)} >= ${start}`;
  const live = "o.order_status <> 'cancelled'";

  const [kpi, visits, daily, topProducts, sources, funnel, payments, zones, searches, zeroSearches, customers] = await Promise.all([
    queryOne<{ revenue: number; revenue_prev: number; orders: number; orders_prev: number; paid_revenue: number }>(
      `SELECT
         COALESCE(SUM(COALESCE(o.total_amount, o.total)) FILTER (WHERE ${inRange("o.created_at")}), 0)::float AS revenue,
         COALESCE(SUM(COALESCE(o.total_amount, o.total)) FILTER (WHERE NOT ${inRange("o.created_at")}), 0)::float AS revenue_prev,
         COUNT(*) FILTER (WHERE ${inRange("o.created_at")})::int AS orders,
         COUNT(*) FILTER (WHERE NOT ${inRange("o.created_at")})::int AS orders_prev,
         COALESCE(SUM(COALESCE(o.total_amount, o.total)) FILTER (WHERE ${inRange("o.created_at")} AND o.payment_status = 'paid'), 0)::float AS paid_revenue
       FROM orders o
       WHERE o.store_id = $1 AND ${live} AND ${localDate("o.created_at")} >= ${prevStart}`,
      [storeId, days]
    ),
    queryOne<{ visitors: number; visitors_prev: number }>(
      `SELECT COUNT(DISTINCT visitor_id) FILTER (WHERE visited_at >= ${start})::int AS visitors,
              COUNT(DISTINCT visitor_id) FILTER (WHERE visited_at < ${start})::int AS visitors_prev
       FROM store_visits WHERE store_id = $1 AND visited_at >= ${prevStart}`,
      [storeId, days]
    ),
    query<{ date: string; revenue: number; orders: number; visitors: number }>(
      `SELECT to_char(d, 'YYYY-MM-DD') AS date,
              COALESCE(o.revenue, 0)::float AS revenue, COALESCE(o.orders, 0)::int AS orders, COALESCE(v.visitors, 0)::int AS visitors
       FROM generate_series(${start}, ${today}, INTERVAL '1 day') d
       LEFT JOIN (
         SELECT ${localDate("o.created_at")} AS day, SUM(COALESCE(o.total_amount, o.total)) AS revenue, COUNT(*) AS orders
         FROM orders o WHERE o.store_id = $1 AND ${live} AND ${inRange("o.created_at")} GROUP BY 1
       ) o ON o.day = d::date
       LEFT JOIN (
         SELECT visited_at AS day, COUNT(DISTINCT visitor_id) AS visitors
         FROM store_visits WHERE store_id = $1 AND visited_at >= ${start} GROUP BY 1
       ) v ON v.day = d::date
       ORDER BY d`,
      [storeId, days]
    ),
    query<{ name: string; qty: number; revenue: number }>(
      `SELECT oi.product_name AS name, SUM(oi.quantity)::int AS qty, SUM(oi.subtotal)::float AS revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.store_id = $1 AND ${live} AND ${inRange("o.created_at")}
       GROUP BY oi.product_name ORDER BY revenue DESC LIMIT 8`,
      [storeId, days]
    ),
    query<{ source: string; visits: number }>(
      `SELECT COALESCE(source, 'direct') AS source, COUNT(*)::int AS visits
       FROM store_visits WHERE store_id = $1 AND visited_at >= ${start}
       GROUP BY 1 ORDER BY 2 DESC`,
      [storeId, days]
    ),
    queryOne<{ checkouts: number; orders: number; paid: number }>(
      `SELECT
         (SELECT COUNT(*) FROM checkout_sessions cs WHERE cs.store_id = $1 AND ${inRange("cs.created_at")})::int AS checkouts,
         (SELECT COUNT(*) FROM orders o WHERE o.store_id = $1 AND ${inRange("o.created_at")})::int AS orders,
         (SELECT COUNT(*) FROM orders o WHERE o.store_id = $1 AND ${inRange("o.created_at")}
            AND o.payment_status IN ('paid', 'deposit_paid'))::int AS paid`,
      [storeId, days]
    ),
    query<{ method: string; orders: number; revenue: number }>(
      `SELECT o.payment_method AS method, COUNT(*)::int AS orders, SUM(COALESCE(o.total_amount, o.total))::float AS revenue
       FROM orders o WHERE o.store_id = $1 AND ${live} AND ${inRange("o.created_at")}
       GROUP BY 1 ORDER BY 2 DESC`,
      [storeId, days]
    ),
    query<{ zone: string; orders: number }>(
      `SELECT COALESCE(o.delivery_zone, CASE WHEN o.delivery_method = 'pickup' THEN 'Pickup' ELSE 'No area chosen' END) AS zone,
              COUNT(*)::int AS orders
       FROM orders o WHERE o.store_id = $1 AND ${live} AND ${inRange("o.created_at")}
       GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
      [storeId, days]
    ),
    query<{ query: string; count: number; results: number }>(
      `SELECT query, COUNT(*)::int AS count, (array_agg(results ORDER BY created_at DESC))[1]::int AS results
       FROM search_queries WHERE store_id = $1 AND ${inRange("created_at")}
       GROUP BY query ORDER BY count DESC, query LIMIT 10`,
      [storeId, days]
    ),
    query<{ query: string; count: number }>(
      `SELECT query, COUNT(*)::int AS count
       FROM search_queries WHERE store_id = $1 AND ${inRange("created_at")} AND results = 0
       GROUP BY query ORDER BY count DESC, query LIMIT 10`,
      [storeId, days]
    ),
    queryOne<{ new: number; returning: number }>(
      `WITH o AS (SELECT o.created_at, ${PHONE_KEY_SQL} AS k FROM orders o WHERE o.store_id = $1 AND ${live}),
            firsts AS (SELECT k, MIN(created_at) AS first_at FROM o GROUP BY k),
            active AS (SELECT DISTINCT k FROM o WHERE ${inRange("o.created_at")})
       SELECT COUNT(*) FILTER (WHERE ${localDate("f.first_at")} >= ${start})::int AS new,
              COUNT(*) FILTER (WHERE ${localDate("f.first_at")} < ${start})::int AS returning
       FROM active a JOIN firsts f ON f.k = a.k`,
      [storeId, days]
    ),
  ]);

  return {
    days,
    kpis: {
      revenue: kpi?.revenue ?? 0,
      revenuePrev: kpi?.revenue_prev ?? 0,
      orders: kpi?.orders ?? 0,
      ordersPrev: kpi?.orders_prev ?? 0,
      visitors: visits?.visitors ?? 0,
      visitorsPrev: visits?.visitors_prev ?? 0,
      paidRevenue: kpi?.paid_revenue ?? 0,
    },
    daily,
    topProducts,
    sources,
    funnel: {
      visitors: visits?.visitors ?? 0,
      checkouts: funnel?.checkouts ?? 0,
      orders: funnel?.orders ?? 0,
      paid: funnel?.paid ?? 0,
    },
    payments,
    zones,
    searches,
    zeroSearches,
    customers: { new: customers?.new ?? 0, returning: customers?.returning ?? 0 },
  };
}

/** % change vs the previous period; null when there's no baseline. */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// The numbers on the dashboard home: today, the last 7 days, things waiting
// on the store, the setup checklist, recent orders and best sellers. Shared
// by the web dashboard (/dashboard) and the vendor app (/api/mobile/home) so
// both always show the same thing.
import { queryMany, queryOne } from "@/lib/db";

const TODAY = "(NOW() AT TIME ZONE 'Africa/Lagos')::date";
const DAY = "(o.created_at AT TIME ZONE 'Africa/Lagos')::date";

export interface OverviewChecklistItem {
  id: string;
  label: string;
  done: boolean;
  href: string;
  cta: string;
}

export async function loadOverview(storeId: string) {
  const [k, series, attention, visitors, recent, top] = await Promise.all([
    // Headline numbers: today, last 7 days vs the 7 before, last 30 days
    queryOne<Record<string, string>>(
      `SELECT
         COALESCE(SUM(o.total) FILTER (WHERE o.payment_status = 'paid' AND ${DAY} = ${TODAY}), 0) AS rev_today,
         COUNT(*) FILTER (WHERE o.order_status <> 'cancelled' AND ${DAY} = ${TODAY}) AS orders_today,
         COALESCE(SUM(o.total) FILTER (WHERE o.payment_status = 'paid' AND ${DAY} > ${TODAY} - 7), 0) AS rev_7,
         COALESCE(SUM(o.total) FILTER (WHERE o.payment_status = 'paid' AND ${DAY} <= ${TODAY} - 7 AND ${DAY} > ${TODAY} - 14), 0) AS rev_prev7,
         COUNT(*) FILTER (WHERE o.order_status <> 'cancelled' AND ${DAY} > ${TODAY} - 7) AS orders_7,
         COUNT(*) FILTER (WHERE o.order_status <> 'cancelled' AND ${DAY} <= ${TODAY} - 7 AND ${DAY} > ${TODAY} - 14) AS orders_prev7,
         COALESCE(SUM(o.total) FILTER (WHERE o.payment_status = 'paid' AND ${DAY} > ${TODAY} - 30), 0) AS rev_30,
         COUNT(*) FILTER (WHERE o.payment_status = 'paid' AND ${DAY} > ${TODAY} - 30) AS paid_30,
         (SELECT COUNT(*) FROM products WHERE store_id = $1 AND is_active = true) AS products
       FROM orders o
       WHERE o.store_id = $1 AND o.created_at > NOW() - INTERVAL '31 days'`,
      [storeId]
    ),
    // Paid sales per day, last 14 days (zero-filled)
    queryMany<{ date: string; value: string }>(
      `SELECT to_char(d, 'YYYY-MM-DD') AS date, COALESCE(SUM(o.total) FILTER (WHERE o.payment_status = 'paid'), 0) AS value
       FROM generate_series(${TODAY} - 13, ${TODAY}, INTERVAL '1 day') AS d
       LEFT JOIN orders o ON o.store_id = $1 AND ${DAY} = d::date
       GROUP BY d ORDER BY d`,
      [storeId]
    ),
    // Things waiting on the store
    queryOne<Record<string, string>>(
      `SELECT
         (SELECT COUNT(*) FROM orders WHERE store_id = $1 AND order_status = 'pending') AS new_orders,
         (SELECT COUNT(*) FROM orders WHERE store_id = $1 AND payment_status = 'pending_confirmation') AS transfers,
         (SELECT COUNT(*) FROM products WHERE store_id = $1 AND is_active AND NOT COALESCE(is_bookable, false) AND stock_quantity <= 0) AS out_of_stock,
         (SELECT COUNT(*) FROM products p WHERE p.store_id = $1 AND p.is_active AND NOT COALESCE(p.is_bookable, false) AND p.stock_quantity > 0
            AND p.stock_quantity <= COALESCE(p.low_stock_threshold, (SELECT low_stock_threshold FROM stores WHERE id = $1), 5)) AS low_stock,
         (SELECT COUNT(*) FROM bookings WHERE store_id = $1 AND status <> 'cancelled' AND (starts_at AT TIME ZONE 'Africa/Lagos')::date = ${TODAY}) AS bookings_today,
         (SELECT COUNT(*) FROM checkout_sessions WHERE store_id = $1 AND status = 'open' AND created_at > NOW() - INTERVAL '7 days') AS abandoned`,
      [storeId]
    ).catch(() => null),
    queryOne<{ v7: string; prev7: string; today: string }>(
      `SELECT
         COUNT(DISTINCT visitor_id) FILTER (WHERE visited_at > ${TODAY} - 7) AS v7,
         COUNT(DISTINCT visitor_id) FILTER (WHERE visited_at <= ${TODAY} - 7 AND visited_at > ${TODAY} - 14) AS prev7,
         COUNT(DISTINCT visitor_id) FILTER (WHERE visited_at = ${TODAY}) AS today
       FROM store_visits WHERE store_id = $1 AND visited_at > ${TODAY} - 14`,
      [storeId]
    ).catch(() => null),
    queryMany<{
      id: string; order_number: string; customer_name: string; total: string; order_status: string;
      payment_status: string; created_at: string; items: string; channel: string | null;
    }>(
      `SELECT o.id, o.order_number, o.customer_name, o.total, o.order_status, o.payment_status, o.created_at, o.channel,
              (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_id = o.id) AS items
       FROM orders o WHERE o.store_id = $1 ORDER BY o.created_at DESC LIMIT 8`,
      [storeId]
    ),
    queryMany<{ name: string; image: string | null; qty: string; revenue: string }>(
      `SELECT oi.product_name AS name, MAX(oi.product_image) AS image, SUM(oi.quantity) AS qty, SUM(oi.subtotal) AS revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.store_id = $1 AND o.order_status <> 'cancelled' AND o.created_at > NOW() - INTERVAL '30 days'
       GROUP BY oi.product_name ORDER BY SUM(oi.subtotal) DESC LIMIT 6`,
      [storeId]
    ),
  ]);
  const n = (v: unknown) => Number(v ?? 0);
  return {
    k: {
      revToday: n(k?.rev_today), ordersToday: n(k?.orders_today), rev7: n(k?.rev_7), revPrev7: n(k?.rev_prev7),
      orders7: n(k?.orders_7), ordersPrev7: n(k?.orders_prev7), rev30: n(k?.rev_30), paid30: n(k?.paid_30), products: n(k?.products),
    },
    series: series.map((s) => ({ date: s.date, value: n(s.value) })),
    attention: {
      newOrders: n(attention?.new_orders), transfers: n(attention?.transfers), outOfStock: n(attention?.out_of_stock),
      lowStock: n(attention?.low_stock), bookingsToday: n(attention?.bookings_today), abandoned: n(attention?.abandoned),
    },
    visitors: { v7: n(visitors?.v7), prev7: n(visitors?.prev7), today: n(visitors?.today) },
    recent,
    top,
  };
}

export type Overview = Awaited<ReturnType<typeof loadOverview>>;

/** The getting-started steps on the home screen. */
export function overviewChecklist(store: Record<string, unknown>, d: Overview): OverviewChecklistItem[] {
  const pick = (...keys: string[]) => keys.map((key) => store[key]).find((v) => v != null && v !== "");
  return [
    { id: "product", label: "Add your first product", done: d.k.products > 0, href: "/dashboard/products/new", cta: "Add" },
    {
      id: "payment",
      label: "Turn on Duka Pay or add bank details",
      done: pick("duka_pay_status", "dukaPayStatus") === "active" || !!pick("bankAccountNumber", "bank_account_number"),
      href: "/dashboard/settings",
      cta: "Set up",
    },
    { id: "logo", label: "Upload a store logo", done: !!pick("logoUrl", "logo_url"), href: "/dashboard/settings", cta: "Upload" },
    { id: "theme", label: "Pick a theme for your store", done: !!pick("storefrontThemeId", "storefront_theme_id"), href: "/dashboard/themes", cta: "Choose" },
    { id: "share", label: "Share your store link", done: d.visitors.v7 + d.visitors.prev7 > 0, href: "", cta: "Copy link" },
  ];
}

import { verifySession, getUserStore } from "@/lib/auth";
import { queryOne, queryMany } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  ShoppingBag,
  Package,
  TrendingUp,
  Clock,
  ArrowRight,
  ExternalLink,
  Eye,
} from "lucide-react";
import type { Order } from "@/types";
import { Tip } from "@/components/dashboard/Tip";

export const dynamic = "force-dynamic";

async function getDashboardStats(storeId: string) {
  const [stats, visitors, recentOrders] = await Promise.all([
    queryOne<{
      total_orders: string;
      pending_orders: string;
      total_revenue: string;
      total_products: string;
    }>(
      `SELECT
         COUNT(DISTINCT o.id) AS total_orders,
         COUNT(DISTINCT o.id) FILTER (WHERE o.order_status = 'pending') AS pending_orders,
         COALESCE(SUM(o.total) FILTER (WHERE o.payment_status = 'paid'), 0) AS total_revenue,
         (SELECT COUNT(*) FROM products WHERE store_id = $1 AND is_active = true) AS total_products
       FROM orders o
       WHERE o.store_id = $1`,
      [storeId],
    ),
    queryOne<{ total_visitors: string; today_visitors: string }>(
      `SELECT
         COUNT(DISTINCT visitor_id) AS total_visitors,
         COUNT(DISTINCT visitor_id) FILTER (WHERE visited_at = CURRENT_DATE) AS today_visitors
       FROM store_visits
       WHERE store_id = $1`,
      [storeId],
    ).catch(() => null),
    queryMany<Order>(
      `SELECT * FROM orders WHERE store_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [storeId],
    ),
  ]);

  return {
    stats: {
      total_orders: parseInt(stats?.total_orders ?? "0"),
      pending_orders: parseInt(stats?.pending_orders ?? "0"),
      total_revenue: parseFloat(stats?.total_revenue ?? "0"),
      total_products: parseInt(stats?.total_products ?? "0"),
      total_visitors: parseInt(visitors?.total_visitors ?? "0"),
      today_visitors: parseInt(visitors?.today_visitors ?? "0"),
    },
    recentOrders,
  };
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-purple-50 text-purple-700 border-purple-200",
  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

export default async function DashboardPage() {
  const user = await verifySession();
  const store = await getUserStore(user!.firebaseUid);
  const { stats, recentOrders } = await getDashboardStats(store!.id);

  const statCards = [
    {
      label: "Total orders",
      value: stats.total_orders,
      icon: ShoppingBag,
      color: "bg-blue-50 dark:bg-blue-950/30 text-blue-600",
    },
    {
      label: "Pending orders",
      value: stats.pending_orders,
      icon: Clock,
      color: "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600",
    },
    {
      label: "Total revenue",
      value: formatCurrency(stats.total_revenue),
      icon: TrendingUp,
      color: "bg-green-50 dark:bg-green-950/30 text-green-600",
    },
    {
      label: "Active products",
      value: stats.total_products,
      icon: Package,
      color: "bg-purple-50 dark:bg-purple-950/30 text-purple-600",
    },
    {
      label: "Unique visitors",
      value: stats.total_visitors,
      icon: Eye,
      color: "bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600",
      sub: stats.today_visitors > 0 ? `${stats.today_visitors} today` : undefined,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-4 lg:pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">
            Overview
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Welcome back! Here&apos;s what&apos;s happening with your store.
          </p>
        </div>
        <a
          href={
            process.env.NEXT_PUBLIC_ROOT_DOMAIN
              ? `https://${store!.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
              : `/store/${store!.slug}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-2 text-sm font-medium text-accent-600 dark:text-accent-400 hover:underline"
        >
          View storefront <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Getting-started guide — dismissable */}
      <Tip id="dash-start" variant="info">
        <strong>How your dashboard works:</strong> Revenue counts only paid orders. Unique visitors are tracked per day (not page views). To go fully live: add products → set up your Store Page (banner + featured) → complete Billing if required.
      </Tip>

      {/* Store banner if no products */}
      {stats.total_products === 0 && (
        <div className="rounded-2xl bg-accent-50 dark:bg-accent-950/20 border border-accent-200 dark:border-accent-800 p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🚀</div>
            <div className="flex-1">
              <h3 className="font-semibold text-surface-900 dark:text-white mb-1">
                Your store is ready! Add your first product.
              </h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
                Start by adding products to your store so customers can browse
                and buy.
              </p>
              <Link
                href="/dashboard/products/new"
                className="inline-flex items-center gap-2 bg-accent-400 hover:bg-accent-500 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-all"
              >
                Add first product <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-black text-surface-900 dark:text-white mb-1">
                {card.value}
              </div>
              <div className="text-xs text-surface-500 dark:text-surface-400 font-medium">
                {card.label}
              </div>
              {"sub" in card && card.sub && (
                <div className="text-xs text-cyan-500 font-semibold mt-0.5">{card.sub}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            href: "/dashboard/products/new",
            label: "Add product",
            emoji: "📦",
          },
          {
            href: "/dashboard/categories",
            label: "Manage categories",
            emoji: "🗂️",
          },
          { href: "/dashboard/orders", label: "View all orders", emoji: "📋" },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 p-4 bg-white dark:bg-surface-900 rounded-xl border border-surface-100 dark:border-surface-800 hover:border-accent-300 dark:hover:border-accent-700 transition-all group"
          >
            <span className="text-2xl">{action.emoji}</span>
            <span className="font-medium text-sm text-surface-900 dark:text-white">
              {action.label}
            </span>
            <ArrowRight className="w-4 h-4 ml-auto text-surface-300 group-hover:text-accent-500 group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800">
        <div className="flex items-center justify-between p-6 border-b border-surface-100 dark:border-surface-800">
          <h2 className="font-semibold text-surface-900 dark:text-white">
            Recent orders
          </h2>
          <Link
            href="/dashboard/orders"
            className="text-sm text-accent-600 dark:text-accent-400 hover:underline font-medium"
          >
            View all
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="w-10 h-10 text-surface-200 dark:text-surface-700 mx-auto mb-3" />
            <p className="text-surface-400 text-sm">No orders yet</p>
            <p className="text-surface-300 dark:text-surface-600 text-xs mt-1">
              Orders will appear here once customers start buying
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-50 dark:divide-surface-800">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders?id=${order.id}`}
                className="flex items-center justify-between p-4 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-xs font-bold text-surface-600 dark:text-surface-400 shrink-0">
                    {order.customer_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-surface-900 dark:text-white truncate">
                      {order.customer_name}
                    </div>
                    <div className="text-xs text-surface-400">
                      {order.order_number}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-xs px-2 py-1 rounded-full border font-medium ${
                      STATUS_STYLES[order.order_status ?? "pending"] ??
                      STATUS_STYLES.pending
                    }`}
                  >
                    {order.order_status}
                  </span>
                  <span className="text-sm font-semibold text-surface-900 dark:text-white">
                    {formatCurrency(order.total ?? order.total_amount ?? 0)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

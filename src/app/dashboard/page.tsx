import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, ArrowRight, CalendarDays, Clock, CreditCard, Lock, PackageX, ShoppingBag, ShoppingCart, TrendingDown } from "lucide-react";
import { verifySession } from "@/lib/auth";
import { getPageStore } from "@/lib/access";
import { queryMany, queryOne } from "@/lib/db";
import { getEffectivePlan } from "@/lib/plan";
import { formatCurrency, getStoreUrl } from "@/lib/utils";
import { clThumb } from "@/lib/cloudinary";
import OnboardingChecklist, { type ChecklistItem } from "@/components/dashboard/OnboardingChecklist";
import { ColumnChart } from "@/components/dashboard/charts";
import { EmptyState, Kpi, Panel, PanelLink, PaymentText, StatusPill, pctChange, timeAgo } from "@/components/dashboard/ui";

export const dynamic = "force-dynamic";

const TODAY = "(NOW() AT TIME ZONE 'Africa/Lagos')::date";
const DAY = "(o.created_at AT TIME ZONE 'Africa/Lagos')::date";

async function loadOverview(storeId: string) {
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

export default async function DashboardPage() {
  const user = await verifySession();
  const store = await getPageStore(user!, "overview");
  const [d, plan] = await Promise.all([loadOverview(store.id), getEffectivePlan(store.id)]);
  const { k, attention: a } = d;
  const pro = plan.isPro;
  const s = store as typeof store & { duka_pay_status?: string; dukaPayStatus?: string };

  const checklist: ChecklistItem[] = [
    { id: "product", label: "Add your first product", done: k.products > 0, href: "/dashboard/products/new", cta: "Add" },
    {
      id: "payment",
      label: "Turn on Duka Pay or add bank details",
      done: (s.duka_pay_status ?? s.dukaPayStatus) === "active" || !!(store.bankAccountNumber ?? store.bank_account_number),
      href: "/dashboard/settings",
      cta: "Set up",
    },
    { id: "logo", label: "Upload a store logo", done: !!(store.logoUrl ?? store.logo_url), href: "/dashboard/settings", cta: "Upload" },
    { id: "theme", label: "Pick a theme for your store", done: !!((store as { storefrontThemeId?: string }).storefrontThemeId ?? (store as { storefront_theme_id?: string }).storefront_theme_id), href: "/dashboard/themes", cta: "Choose" },
    { id: "share", label: "Share your store link", done: d.visitors.v7 + d.visitors.prev7 > 0, href: "", cta: "Copy link" },
  ];

  const tasks = [
    { n: a.newOrders, label: "new order", plural: "new orders", href: "/dashboard/orders?view=new", icon: ShoppingBag, tone: "text-amber-600" },
    { n: a.transfers, label: "transfer to confirm", plural: "transfers to confirm", href: "/dashboard/orders?view=payment", icon: CreditCard, tone: "text-orange-600" },
    { n: a.bookingsToday, label: "booking today", plural: "bookings today", href: "/dashboard/bookings", icon: CalendarDays, tone: "text-blue-600" },
    { n: a.outOfStock, label: "product out of stock", plural: "products out of stock", href: "/dashboard/products?filter=out", icon: PackageX, tone: "text-red-600" },
    { n: a.lowStock, label: "product running low", plural: "products running low", href: "/dashboard/products?filter=low", icon: TrendingDown, tone: "text-amber-600" },
    { n: a.abandoned, label: "abandoned cart this week", plural: "abandoned carts this week", href: "/dashboard/abandoned", icon: ShoppingCart, tone: "text-zinc-500" },
  ].filter((t) => t.n > 0);

  const aov = k.paid30 ? k.rev30 / k.paid30 : 0;

  return (
    <div className="space-y-3 pt-1 lg:pt-0">
      <OnboardingChecklist items={checklist} storeUrl={getStoreUrl(store.slug, store.customDomain ?? store.custom_domain)} />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {pro ? (
          <>
            <Kpi label="Sales today" value={formatCurrency(k.revToday)} hint={`${k.ordersToday} order${k.ordersToday === 1 ? "" : "s"}`} href="/dashboard/analytics" />
            <Kpi label="Sales · 7 days" value={formatCurrency(k.rev7)} delta={pctChange(k.rev7, k.revPrev7)} hint="vs previous 7" href="/dashboard/analytics" />
          </>
        ) : (
          <Link href="/dashboard/billing" className="col-span-2 flex items-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-2.5 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
            <Lock className="h-4 w-4 shrink-0 text-zinc-400" />
            <span className="min-w-0 text-[13px] text-zinc-600 dark:text-zinc-300">
              <strong className="text-zinc-900 dark:text-white">Sales, visitors &amp; trends</strong> come with Pro. <span className="font-semibold underline underline-offset-2">Upgrade</span>
            </span>
          </Link>
        )}
        <Kpi label="Orders · 7 days" value={String(k.orders7)} delta={pctChange(k.orders7, k.ordersPrev7)} hint="vs previous 7" href="/dashboard/orders" />
        {pro && <Kpi label="Avg. order · 30d" value={formatCurrency(aov)} hint={`${k.paid30} paid`} />}
        {pro && <Kpi label="Visitors · 7 days" value={String(d.visitors.v7)} delta={pctChange(d.visitors.v7, d.visitors.prev7)} hint={`${d.visitors.today} today`} href="/dashboard/analytics" />}
        <Kpi label="Live products" value={String(k.products)} hint={`of ${plan.max_products} on ${plan.name}`} href="/dashboard/products" />
        {!pro && <Kpi label="Waiting on you" value={String(a.newOrders + a.transfers)} hint="new orders & transfers" href="/dashboard/orders?view=new" />}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {/* Sales chart */}
        <div className="min-w-0 xl:col-span-2">
          {pro ? (
            <ColumnChart title="Paid sales · last 14 days" data={d.series} format="naira" />
          ) : (
            <Panel title="Recent orders" action={<PanelLink href="/dashboard/orders">All orders →</PanelLink>}>
              <RecentOrders rows={d.recent} />
            </Panel>
          )}
        </div>

        {/* Needs attention */}
        <Panel title="Needs your attention" action={tasks.length ? <span className="text-[11px] font-semibold text-zinc-400">{tasks.length}</span> : undefined}>
          {tasks.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-6 text-[13px] text-zinc-500">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">✓</span>
              All caught up — nothing waiting on you.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {tasks.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="group flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <t.icon className={`h-4 w-4 shrink-0 ${t.tone}`} />
                    <span className="flex-1 text-[13px] text-zinc-700 dark:text-zinc-200">
                      <strong className="tabular-nums text-zinc-900 dark:text-white">{t.n}</strong> {t.n === 1 ? t.label : t.plural}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {pro && (
          <Panel className="xl:col-span-2" title="Recent orders" action={<PanelLink href="/dashboard/orders">All orders →</PanelLink>}>
            <RecentOrders rows={d.recent} />
          </Panel>
        )}
        <Panel className={pro ? "" : "xl:col-span-3"} title="Best sellers · 30 days" action={<PanelLink href="/dashboard/products">Products →</PanelLink>}>
          {d.top.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No sales in the last 30 days" text="Your best sellers will show here." />
          ) : (
            <ol className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {d.top.map((p, i) => (
                <li key={p.name} className="flex items-center gap-2.5 px-3 py-1.5">
                  <span className="w-4 text-right text-[11px] font-semibold tabular-nums text-zinc-400">{i + 1}</span>
                  {p.image ? (
                    <Image src={clThumb(p.image)} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded object-cover" />
                  ) : (
                    <span className="h-7 w-7 shrink-0 rounded bg-zinc-100 dark:bg-zinc-800" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-800 dark:text-zinc-100">{p.name}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-zinc-500">×{Number(p.qty)}</span>
                  {pro && <span className="w-20 shrink-0 text-right text-[13px] font-semibold tabular-nums text-zinc-900 dark:text-white">{formatCurrency(Number(p.revenue))}</span>}
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}

function RecentOrders({ rows }: { rows: Awaited<ReturnType<typeof loadOverview>>["recent"] }) {
  if (!rows.length) return <EmptyState icon={ShoppingBag} title="No orders yet" text="Orders will appear here as soon as customers buy." />;
  const now = new Date();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-400">
            <th className="px-3 py-1.5 font-medium">Order</th>
            <th className="px-3 py-1.5 font-medium">Customer</th>
            <th className="hidden px-3 py-1.5 font-medium sm:table-cell">Payment</th>
            <th className="px-3 py-1.5 font-medium">Status</th>
            <th className="px-3 py-1.5 text-right font-medium">Total</th>
            <th className="hidden px-3 py-1.5 text-right font-medium md:table-cell">
              <Clock className="ml-auto h-3 w-3" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((o) => (
            <tr key={o.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
              <td className="whitespace-nowrap px-3 py-1.5">
                <Link href={`/dashboard/orders?id=${o.id}`} className="font-semibold text-zinc-900 hover:underline dark:text-white">
                  {o.order_number}
                </Link>
                {o.channel === "pos" && <span className="ml-1 text-[10px] font-semibold text-zinc-400">POS</span>}
              </td>
              <td className="max-w-[160px] truncate px-3 py-1.5 text-zinc-700 dark:text-zinc-300">
                {o.customer_name} <span className="text-zinc-400">· {Number(o.items)} item{Number(o.items) === 1 ? "" : "s"}</span>
              </td>
              <td className="hidden whitespace-nowrap px-3 py-1.5 sm:table-cell"><PaymentText status={o.payment_status} /></td>
              <td className="px-3 py-1.5"><StatusPill status={o.order_status} /></td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right font-semibold tabular-nums text-zinc-900 dark:text-white">{formatCurrency(Number(o.total))}</td>
              <td className="hidden whitespace-nowrap px-3 py-1.5 text-right text-[12px] text-zinc-400 md:table-cell">{timeAgo(o.created_at, now)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

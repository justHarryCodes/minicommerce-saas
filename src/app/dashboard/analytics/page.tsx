import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, SearchX } from "lucide-react";
import { verifySession, getUserStore } from "@/lib/auth";
import { getAnalytics, pctChange, RANGES, type RangeDays } from "@/lib/analytics";
import { SOURCE_LABELS, type TrafficSource } from "@/lib/traffic-source";
import { BarList, StatTile, count, naira } from "@/components/dashboard/charts-static";
import { ColumnChart } from "@/components/dashboard/charts";

export const dynamic = "force-dynamic";

const PAYMENT_LABEL: Record<string, string> = {
  paystack: "Paid online",
  bank_transfer: "Bank transfer",
  transfer: "Bank transfer",
  pay_on_delivery: "Pay on delivery",
};

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 1000) / 10}%` : "—");

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await verifySession();
  if (!user) redirect("/auth/login");
  const store = await getUserStore(user.firebaseUid);
  if (!store) redirect("/onboarding");

  const { range } = await searchParams;
  const days = (RANGES as readonly number[]).includes(Number(range)) ? (Number(range) as RangeDays) : 30;
  const a = await getAnalytics(store.id, days);
  const k = a.kpis;
  const aov = k.orders ? k.revenue / k.orders : 0;
  const aovPrev = k.ordersPrev ? k.revenuePrev / k.ordersPrev : 0;
  const conversion = k.visitors ? (k.orders / k.visitors) * 100 : 0;
  const totalSearches = a.searches.reduce((s, q) => s + q.count, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-5 pt-4 lg:pt-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">How your store is doing — compared with the previous {days} days.</p>
        </div>
        {/* Date range — one row, above everything it scopes */}
        <nav className="flex w-fit rounded-xl border border-surface-200 p-0.5 dark:border-surface-700" aria-label="Date range">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/dashboard/analytics?range=${r}`}
              aria-current={r === days ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                r === days ? "bg-surface-900 text-white dark:bg-white dark:text-black" : "text-surface-500 hover:text-surface-900 dark:hover:text-white"
              }`}
            >
              {r} days
            </Link>
          ))}
        </nav>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Revenue" value={naira(k.revenue)} delta={pctChange(k.revenue, k.revenuePrev)} />
        <StatTile label="Orders" value={count(k.orders)} delta={pctChange(k.orders, k.ordersPrev)} />
        <StatTile label="Average order" value={naira(aov)} delta={pctChange(aov, aovPrev)} />
        <StatTile label="Visitors" value={count(k.visitors)} delta={pctChange(k.visitors, k.visitorsPrev)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ColumnChart
          title="Revenue"
          subtitle={`${naira(k.revenue)} · ${naira(k.paidRevenue)} already paid`}
          data={a.daily.map((d) => ({ date: d.date, value: d.revenue }))}
          format="naira"
        />
        <ColumnChart
          title="Visitors"
          subtitle={`${count(k.visitors)} unique · ${conversion.toFixed(1)}% placed an order`}
          data={a.daily.map((d) => ({ date: d.date, value: d.visitors }))}
          format="visitors"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarList
          title="Top products"
          subtitle="By revenue"
          items={a.topProducts.map((p) => ({ label: p.name, value: p.revenue, note: `${p.qty} sold` }))}
          format={naira}
          empty="No sales in this period yet."
        />
        <BarList
          title="Checkout funnel"
          subtitle="From visit to paid order"
          items={[
            { label: "Visited the store", value: a.funnel.visitors },
            { label: "Started checkout", value: a.funnel.checkouts, note: pct(a.funnel.checkouts, a.funnel.visitors) },
            { label: "Placed an order", value: a.funnel.orders, note: pct(a.funnel.orders, a.funnel.visitors) },
            { label: "Paid", value: a.funnel.paid, note: pct(a.funnel.paid, a.funnel.visitors) },
          ]}
          format={count}
          empty="No visits yet."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BarList
          title="Where visitors come from"
          subtitle="Tag your links with ?utm_source=instagram (or whatsapp, tiktok…) to track them"
          items={a.sources.map((s) => ({ label: SOURCE_LABELS[s.source as TrafficSource] ?? s.source, value: s.visits, note: pct(s.visits, k.visitors) }))}
          format={count}
          empty="No visits recorded yet."
        />
        <BarList
          title="Payment methods"
          items={a.payments.map((p) => ({ label: PAYMENT_LABEL[p.method] ?? p.method, value: p.orders, note: naira(p.revenue) }))}
          format={(n) => `${count(n)} order${n === 1 ? "" : "s"}`}
          empty="No orders yet."
        />
        <BarList
          title="Delivery areas"
          items={a.zones.map((z) => ({ label: z.zone, value: z.orders }))}
          format={(n) => `${count(n)} order${n === 1 ? "" : "s"}`}
          empty="No orders yet."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900 sm:p-5">
          <h2 className="text-sm font-semibold text-surface-900 dark:text-white">Customers who ordered</h2>
          <p className="text-xs text-surface-500 dark:text-surface-400">New vs returning in this period</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-2xl font-semibold text-surface-900 dark:text-white">{count(a.customers.new)}</p>
              <p className="text-xs text-surface-500 dark:text-surface-400">First-time buyers</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-surface-900 dark:text-white">{count(a.customers.returning)}</p>
              <p className="text-xs text-surface-500 dark:text-surface-400">Came back</p>
            </div>
          </div>
          <Link href="/dashboard/customers" className="mt-4 inline-block text-xs font-semibold text-surface-700 underline-offset-4 hover:underline dark:text-surface-200">
            See all customers →
          </Link>
        </section>

        <SearchTable
          title="What shoppers search for"
          icon={<Search className="h-4 w-4" />}
          rows={a.searches.map((s) => ({ query: s.query, count: s.count, note: s.results === 0 ? "no results" : `${s.results} found` }))}
          empty="No searches yet."
          footer={totalSearches ? `${count(totalSearches)} searches` : undefined}
        />
        <SearchTable
          title="Searches with no results"
          subtitle="Products people want that you don't list — restock ideas"
          icon={<SearchX className="h-4 w-4" />}
          rows={a.zeroSearches.map((s) => ({ query: s.query, count: s.count }))}
          empty="Every search found something. 🎉"
        />
      </div>
    </div>
  );
}

function SearchTable({
  title,
  subtitle,
  icon,
  rows,
  empty,
  footer,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  rows: { query: string; count: number; note?: string }[];
  empty: string;
  footer?: string;
}) {
  return (
    <section className="rounded-2xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900 sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
        <span className="text-surface-400">{icon}</span> {title}
      </h2>
      {subtitle && <p className="text-xs text-surface-500 dark:text-surface-400">{subtitle}</p>}
      {rows.length === 0 ? (
        <p className="mt-6 pb-4 text-center text-sm text-surface-400">{empty}</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <tbody className="tabular-nums">
            {rows.map((r) => (
              <tr key={r.query} className="border-t border-surface-50 first:border-0 dark:border-surface-800">
                <td className="py-1.5 pr-2 text-surface-700 dark:text-surface-200">“{r.query}”</td>
                <td className="py-1.5 text-right text-xs text-surface-400">{r.note}</td>
                <td className="w-10 py-1.5 text-right font-semibold text-surface-900 dark:text-white">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {footer && <p className="mt-3 text-xs text-surface-400">{footer}</p>}
    </section>
  );
}

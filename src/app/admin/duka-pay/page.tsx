import Link from "next/link";
import { Wallet } from "lucide-react";
import { verifyAdminSession } from "@/lib/admin-auth";
import { formatCurrency } from "@/lib/utils";
import { platformFeePercent } from "@/lib/duka-pay";
import { EARNINGS_RANGES, parseRange, platformEarnings, type EarningsRange } from "@/lib/duka-pay-earnings";
import { ColumnChart } from "@/components/dashboard/charts";
import { EmptyState, Kpi, Panel } from "@/components/dashboard/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Duka Pay · Admin" };

const RANGE_LABEL: Record<EarningsRange, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days", all: "All time" };

export default async function AdminDukaPayPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await verifyAdminSession(); // the admin layout guards too
  const range = parseRange((await searchParams).range);
  const { totals, series, stores, connectedStores } = await platformEarnings(range);
  const fee = platformFeePercent();

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>Duka Pay</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Duka&apos;s {fee}% from every successful store payment, as Paystack split it.
          </p>
        </div>
        <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800" role="tablist" aria-label="Period">
          {(Object.keys(EARNINGS_RANGES) as EarningsRange[]).map((r) => (
            <Link
              key={r}
              href={`/admin/duka-pay?range=${r}`}
              role="tab"
              aria-selected={r === range}
              className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${r === range ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"}`}
            >
              {RANGE_LABEL[r]}
            </Link>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label={`Duka income · ${RANGE_LABEL[range]}`} value={formatCurrency(totals.dukaFees)} hint={`${fee}% of each payment`} />
        <Kpi label="Processed (GMV)" value={formatCurrency(totals.gross)} hint={`${totals.payments} payment${totals.payments === 1 ? "" : "s"}`} />
        <Kpi label="Paid to stores" value={formatCurrency(totals.toStores)} hint={`after ${formatCurrency(totals.paystackFees)} Paystack fees`} />
        <Kpi label="Stores on Duka Pay" value={String(connectedStores)} hint="payout account connected" />
      </div>

      <ColumnChart title={`Duka income per day · last ${range === "all" ? 90 : EARNINGS_RANGES[range]} days`} data={series} format="naira" />

      <Panel title={`Stores by Duka income · ${RANGE_LABEL[range]}`}>
        {stores.length === 0 ? (
          <EmptyState icon={Wallet} title="No Duka Pay payments yet" text="Once stores connect Duka Pay and take payments, they appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-400">
                  <th className="px-3 py-1.5 font-medium">Store</th>
                  <th className="px-3 py-1.5 text-right font-medium">Payments</th>
                  <th className="px-3 py-1.5 text-right font-medium">Processed</th>
                  <th className="px-3 py-1.5 text-right font-medium">Duka income</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 tabular-nums dark:divide-zinc-800">
                {stores.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="px-3 py-1.5">
                      <Link href={`/admin/vendors/${s.id}`} className="font-semibold hover:underline" style={{ color: "var(--text-primary)" }}>
                        {s.name}
                      </Link>
                      <span className="ml-1.5 text-zinc-400">/{s.slug}</span>
                    </td>
                    <td className="px-3 py-1.5 text-right text-zinc-500">{s.payments}</td>
                    <td className="px-3 py-1.5 text-right" style={{ color: "var(--text-primary)" }}>{formatCurrency(s.gross)}</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-emerald-700 dark:text-emerald-400">{formatCurrency(s.dukaFees)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

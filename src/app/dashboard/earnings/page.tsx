import Link from "next/link";
import { Landmark, Wallet } from "lucide-react";
import { verifySession } from "@/lib/auth";
import { getPageStore } from "@/lib/access";
import { queryOne } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { platformFeePercent } from "@/lib/duka-pay";
import { EARNINGS_RANGES, parseRange, storeEarnings, type EarningsRange } from "@/lib/duka-pay-earnings";
import { EmptyState, Kpi, PageHeader, Panel } from "@/components/dashboard/ui";

export const dynamic = "force-dynamic";

const RANGE_LABEL: Record<EarningsRange, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days", all: "All time" };
const CHANNEL: Record<string, string> = { card: "Card", bank_transfer: "Transfer", bank: "Bank", ussd: "USSD", mobile_money: "Mobile money", qr: "QR" };

export default async function EarningsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await verifySession();
  const store = await getPageStore(user!, "owner");
  const range = parseRange((await searchParams).range);

  const [{ totals, rows }, payout] = await Promise.all([
    storeEarnings(store.id, range),
    queryOne<{ duka_pay_status: string | null; bank_name: string | null; bank_account_number: string | null; bank_account_name: string | null }>(
      "SELECT duka_pay_status, bank_name, bank_account_number, bank_account_name FROM stores WHERE id = $1",
      [store.id]
    ),
  ]);
  const connected = payout?.duka_pay_status === "active";
  const fee = platformFeePercent();

  return (
    <div className="space-y-3 pt-1 lg:pt-0">
      <PageHeader
        subtitle={
          connected ? (
            <span className="inline-flex items-center gap-1.5">
              <Landmark className="h-3.5 w-3.5" />
              Paid to {payout?.bank_account_name} · {payout?.bank_name} ••••{payout?.bank_account_number?.slice(-4)} — usually the next working day
            </span>
          ) : (
            "Online payments through Duka Pay, and what you receive from each."
          )
        }
        actions={
          <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800" role="tablist" aria-label="Period">
            {(Object.keys(EARNINGS_RANGES) as EarningsRange[]).map((r) => (
              <Link
                key={r}
                href={`/dashboard/earnings?range=${r}`}
                role="tab"
                aria-selected={r === range}
                className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${r === range ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"}`}
              >
                {RANGE_LABEL[r]}
              </Link>
            ))}
          </div>
        }
      />

      {!connected && totals.payments === 0 ? (
        <Panel>
          <EmptyState
            icon={Wallet}
            title="Turn on Duka Pay to get paid online"
            text="Customers pay by card, transfer or USSD and the money goes straight to your bank. Each payment shows up here with its fees."
            action={
              <Link href="/dashboard/settings#payments" className="inline-flex h-8 items-center rounded-md bg-accent-400 px-3 text-[13px] font-bold text-black hover:bg-accent-500">
                Set up Duka Pay
              </Link>
            }
          />
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <Kpi label="Received online" value={formatCurrency(totals.gross)} hint={`${totals.payments} payment${totals.payments === 1 ? "" : "s"}`} />
            <Kpi label="Paystack fees" value={formatCurrency(totals.paystackFees)} hint="card / transfer processing" />
            <Kpi label={`Duka fee · ${fee}%`} value={formatCurrency(totals.dukaFees)} hint="of each successful payment" />
            <Kpi label="Paid to you" value={formatCurrency(totals.toStores)} hint="settled to your bank" />
          </div>

          <Panel title={`Payments · ${RANGE_LABEL[range]}`}>
            {rows.length === 0 ? (
              <EmptyState icon={Wallet} title="No Duka Pay payments in this period" text="Online payments will appear here as customers pay." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-400">
                      <th className="px-3 py-1.5 font-medium">Date</th>
                      <th className="px-3 py-1.5 font-medium">Order</th>
                      <th className="hidden px-3 py-1.5 font-medium md:table-cell">Paid with</th>
                      <th className="px-3 py-1.5 text-right font-medium">Amount</th>
                      <th className="hidden px-3 py-1.5 text-right font-medium sm:table-cell">Paystack</th>
                      <th className="hidden px-3 py-1.5 text-right font-medium sm:table-cell">Duka</th>
                      <th className="px-3 py-1.5 text-right font-medium">You get</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 tabular-nums dark:divide-zinc-800">
                    {rows.map((r) => (
                      <tr key={r.reference} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="whitespace-nowrap px-3 py-1.5 text-zinc-500">
                          {new Date(r.settledAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                        </td>
                        <td className="px-3 py-1.5">
                          {r.orderId ? (
                            <Link href={`/dashboard/orders?id=${r.orderId}`} className="font-semibold text-zinc-900 hover:underline dark:text-white">
                              {r.orderNumber}
                            </Link>
                          ) : (
                            <span className="text-zinc-400">{r.reference}</span>
                          )}
                          {r.customerName && <span className="ml-1.5 hidden text-zinc-400 lg:inline">· {r.customerName}</span>}
                        </td>
                        <td className="hidden px-3 py-1.5 text-zinc-500 md:table-cell">{r.channel ? CHANNEL[r.channel] ?? r.channel : "—"}</td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right text-zinc-900 dark:text-white">{formatCurrency(r.amount)}</td>
                        <td className="hidden whitespace-nowrap px-3 py-1.5 text-right text-zinc-500 sm:table-cell">−{formatCurrency(r.paystackFee)}</td>
                        <td className="hidden whitespace-nowrap px-3 py-1.5 text-right text-zinc-500 sm:table-cell">−{formatCurrency(r.dukaFee)}</td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right font-semibold text-emerald-700 dark:text-emerald-400">{formatCurrency(r.storeShare)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <p className="px-1 text-[11px] text-zinc-400">
            Amounts are as Paystack split each payment. Paystack sends your share to your bank on its normal schedule; refunds are handled with the customer directly.
          </p>
        </>
      )}
    </div>
  );
}

// Duka Pay money, as Paystack actually split it. Every settled Duka Pay order
// payment records its fees (lib/payments → feesFromCharge): Paystack's fee,
// Duka's share and the store's share. Older rows without the split fall back
// to Duka's requested fee and "amount minus fees".
import { query, queryMany, queryOne } from './db'

export const EARNINGS_RANGES = { '7d': 7, '30d': 30, '90d': 90, all: null } as const
export type EarningsRange = keyof typeof EARNINGS_RANGES

export function parseRange(v: string | null | undefined): EarningsRange {
  return v && v in EARNINGS_RANGES ? (v as EarningsRange) : '30d'
}

const DUKA_FEE = 'COALESCE(pa.platform_share, pa.platform_fee, 0)'
const PAYSTACK_FEE = 'COALESCE(pa.paystack_fee, 0)'
const STORE_SHARE = `COALESCE(pa.store_share, pa.amount - ${DUKA_FEE} - ${PAYSTACK_FEE})`
/** Settled Duka Pay order payments, optionally within the last N days ($2) */
const BASE = `
  FROM payment_attempts pa
  WHERE pa.kind = 'order' AND pa.status = 'success' AND pa.subaccount_code IS NOT NULL
    AND ($2::int IS NULL OR pa.settled_at > NOW() - make_interval(days => $2::int))`

export interface EarningsTotals {
  payments: number
  gross: number
  paystackFees: number
  dukaFees: number
  toStores: number
}

/** $1 = one store, or null for every store */
const totalsSql = () => `
  SELECT COUNT(*)::int AS payments,
         COALESCE(SUM(pa.amount), 0) AS gross,
         COALESCE(SUM(${PAYSTACK_FEE}), 0) AS paystack_fees,
         COALESCE(SUM(${DUKA_FEE}), 0) AS duka_fees,
         COALESCE(SUM(${STORE_SHARE}), 0) AS to_stores
  ${BASE} AND ($1::uuid IS NULL OR pa.store_id = $1::uuid)`

function toTotals(r: Record<string, unknown> | null): EarningsTotals {
  const n = (v: unknown) => Number(v ?? 0)
  return { payments: n(r?.payments), gross: n(r?.gross), paystackFees: n(r?.paystack_fees), dukaFees: n(r?.duka_fees), toStores: n(r?.to_stores) }
}

export interface EarningRow {
  reference: string
  settledAt: string
  orderId: string | null
  orderNumber: string | null
  customerName: string | null
  channel: string | null
  amount: number
  paystackFee: number
  dukaFee: number
  storeShare: number
}

/** One store: totals and its payments, newest first. */
export async function storeEarnings(storeId: string, range: EarningsRange): Promise<{ totals: EarningsTotals; rows: EarningRow[] }> {
  const days = EARNINGS_RANGES[range]
  const [totals, rows] = await Promise.all([
    queryOne<Record<string, unknown>>(totalsSql(), [storeId, days]),
    queryMany<Record<string, unknown>>(
      `SELECT pa.reference, pa.settled_at, pa.amount, pa.channel,
              ${PAYSTACK_FEE} AS paystack_fee, ${DUKA_FEE} AS duka_fee, ${STORE_SHARE} AS store_share,
              o.id AS order_id, o.order_number, o.customer_name
       FROM payment_attempts pa
       LEFT JOIN orders o ON o.id::text = pa.target_id AND o.store_id = pa.store_id
       WHERE pa.kind = 'order' AND pa.status = 'success' AND pa.subaccount_code IS NOT NULL
         AND pa.store_id = $1
         AND ($2::int IS NULL OR pa.settled_at > NOW() - make_interval(days => $2::int))
       ORDER BY pa.settled_at DESC
       LIMIT 300`,
      [storeId, days]
    ),
  ])
  return {
    totals: toTotals(totals),
    rows: rows.map((r) => ({
      reference: String(r.reference),
      settledAt: new Date(r.settled_at as string).toISOString(),
      orderId: (r.order_id as string) ?? null,
      orderNumber: (r.order_number as string) ?? null,
      customerName: (r.customer_name as string) ?? null,
      channel: (r.channel as string) ?? null,
      amount: Number(r.amount),
      paystackFee: Number(r.paystack_fee),
      dukaFee: Number(r.duka_fee),
      storeShare: Number(r.store_share),
    })),
  }
}

/** Duka as a whole: totals, Duka's income per day, and the top stores. */
export async function platformEarnings(range: EarningsRange) {
  const days = EARNINGS_RANGES[range]
  const seriesDays = days ?? 90
  const [totals, series, stores, connected] = await Promise.all([
    queryOne<Record<string, unknown>>(totalsSql(), [null, days]),
    queryMany<{ date: string; value: string }>(
      `SELECT to_char(d, 'YYYY-MM-DD') AS date, COALESCE(SUM(${DUKA_FEE}), 0) AS value
       FROM generate_series((NOW() AT TIME ZONE 'Africa/Lagos')::date - ($1::int - 1), (NOW() AT TIME ZONE 'Africa/Lagos')::date, INTERVAL '1 day') AS d
       LEFT JOIN payment_attempts pa
         ON pa.kind = 'order' AND pa.status = 'success' AND pa.subaccount_code IS NOT NULL
        AND (pa.settled_at AT TIME ZONE 'Africa/Lagos')::date = d::date
       GROUP BY d ORDER BY d`,
      [seriesDays]
    ),
    queryMany<Record<string, unknown>>(
      `SELECT s.id, s.name, s.slug, COUNT(*)::int AS payments,
              COALESCE(SUM(pa.amount), 0) AS gross, COALESCE(SUM(${DUKA_FEE}), 0) AS duka_fees
       FROM payment_attempts pa JOIN stores s ON s.id = pa.store_id
       WHERE pa.kind = 'order' AND pa.status = 'success' AND pa.subaccount_code IS NOT NULL
         AND ($1::int IS NULL OR pa.settled_at > NOW() - make_interval(days => $1::int))
       GROUP BY s.id ORDER BY SUM(${DUKA_FEE}) DESC LIMIT 50`,
      [days]
    ),
    query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM stores WHERE duka_pay_status = 'active' AND paystack_subaccount_code IS NOT NULL`, []),
  ])
  return {
    totals: toTotals(totals),
    series: series.map((s) => ({ date: s.date, value: Number(s.value) })),
    stores: stores.map((s) => ({ id: String(s.id), name: String(s.name), slug: String(s.slug), payments: Number(s.payments), gross: Number(s.gross), dukaFees: Number(s.duka_fees) })),
    connectedStores: Number(connected[0]?.n ?? 0),
  }
}

// Duka Pay — online payments for every store on Duka's own Paystack account.
//
// Each store connects a payout bank account, which becomes a Paystack
// *subaccount*. Every checkout is then initialised with that subaccount:
//   • Paystack settles the store's share straight to the store's bank
//     (Duka never holds store money),
//   • Duka keeps DUKA_PAY_FEE_PERCENT (default 1%) of the amount, set per
//     transaction with `transaction_charge`, and
//   • `bearer: subaccount` puts Paystack's own fee on the store's share, so
//     Duka's cut is exactly the percentage.
// One webhook (/api/paystack/webhook) confirms payments for every store.
import { getOrSet } from './redis'

const PAYSTACK_BASE = 'https://api.paystack.co'

/** Duka's cut of each successful Duka Pay checkout, in percent. */
export function platformFeePercent(): number {
  const v = Number(process.env.DUKA_PAY_FEE_PERCENT ?? 1)
  return Number.isFinite(v) && v >= 0 && v <= 10 ? v : 1
}

/** Duka's fee for a charge, in kobo (rounded, never the whole amount). */
export function platformFeeKobo(amountKobo: number, percent = platformFeePercent()): number {
  if (!(amountKobo > 0) || !(percent > 0)) return 0
  return Math.min(amountKobo - 1, Math.round((amountKobo * percent) / 100))
}

/** Online checkout channels shown on the Paystack page. */
export const DUKA_PAY_CHANNELS = ['card', 'bank_transfer', 'ussd', 'bank'] as const

export interface SplitParams {
  subaccount: string
  bearer: 'subaccount'
  transaction_charge: number // kobo for Duka
}

/** Paystack initialise parameters that route a charge to a store. */
export function splitFor(subaccountCode: string, amountKobo: number): SplitParams {
  return { subaccount: subaccountCode, bearer: 'subaccount', transaction_charge: platformFeeKobo(amountKobo) }
}

export interface DukaPayStore {
  duka_pay_status?: string | null
  paystack_subaccount_code?: string | null
}

/** A store can take online payments once its payout account is connected. */
export function dukaPayActive(store: DukaPayStore | null | undefined): boolean {
  return !!store && store.duka_pay_status === 'active' && !!store.paystack_subaccount_code
}

/** What Paystack reported splitting, in Naira. Null when it wasn't a split charge. */
export function feesFromCharge(charge: {
  fees?: number | null
  fees_split?: { paystack?: number; integration?: number; subaccount?: number } | null
}): { paystackFee: number | null; platformShare: number | null; storeShare: number | null } {
  const s = charge.fees_split
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v / 100 : null)
  return {
    paystackFee: n(s?.paystack ?? charge.fees),
    platformShare: n(s?.integration),
    storeShare: n(s?.subaccount),
  }
}

/* ───────────────────────────── Paystack API ───────────────────────────── */

async function paystack<T>(path: string, init?: { method?: string; body?: unknown }): Promise<{ ok: boolean; status: number; message: string; data: T | null }> {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) return { ok: false, status: 500, message: 'Payments are not configured', data: null }
  try {
    const res = await fetch(`${PAYSTACK_BASE}${path}`, {
      method: init?.method ?? 'GET',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(15_000),
    })
    const json = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T }
    return { ok: res.ok && json.status === true, status: res.status, message: json.message ?? '', data: json.data ?? null }
  } catch {
    return { ok: false, status: 502, message: 'Could not reach Paystack', data: null }
  }
}

export interface Bank {
  name: string
  code: string
}

/** Nigerian banks and wallets Paystack can settle to (cached for a day). */
export async function listBanks(): Promise<Bank[]> {
  const banks = await getOrSet<Bank[]>(
    'paystack:banks:ng',
    async () => {
      const r = await paystack<{ name: string; code: string; active?: boolean; is_deleted?: boolean }[]>('/bank?country=nigeria&perPage=300')
      if (!r.ok || !r.data) return null
      const seen = new Set<string>()
      return r.data
        .filter((b) => b.active !== false && !b.is_deleted && b.code && !seen.has(b.code) && seen.add(b.code))
        .map((b) => ({ name: b.name, code: b.code }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    86_400
  )
  return banks ?? []
}

/** The name on a bank account, straight from the bank. */
export async function resolveAccount(accountNumber: string, bankCode: string): Promise<{ ok: true; accountName: string } | { ok: false; error: string }> {
  if (!/^\d{10}$/.test(accountNumber)) return { ok: false, error: 'Account number must be 10 digits' }
  if (!/^[0-9A-Za-z-]{2,20}$/.test(bankCode)) return { ok: false, error: 'Choose your bank' }
  const r = await paystack<{ account_name: string }>(`/bank/resolve?account_number=${accountNumber}&bank_code=${encodeURIComponent(bankCode)}`)
  if (!r.ok || !r.data?.account_name) return { ok: false, error: "We couldn't find that account at the bank you chose. Check the number and bank." }
  return { ok: true, accountName: r.data.account_name }
}

/**
 * Create the store's subaccount, or point an existing one at a new bank
 * account. Paystack's `percentage_charge` is Duka's share — used only if a
 * charge ever lacks its own transaction_charge.
 */
export async function upsertSubaccount(opts: {
  existingCode?: string | null
  businessName: string
  bankCode: string
  accountNumber: string
  email?: string | null
  phone?: string | null
  storeId: string
}): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const body = {
    business_name: opts.businessName.slice(0, 100),
    settlement_bank: opts.bankCode,
    account_number: opts.accountNumber,
    percentage_charge: platformFeePercent(),
    description: `Duka store ${opts.storeId}`,
    primary_contact_email: opts.email || undefined,
    primary_contact_phone: opts.phone || undefined,
    metadata: { store_id: opts.storeId },
  }
  const r = opts.existingCode
    ? await paystack<{ subaccount_code: string }>(`/subaccount/${encodeURIComponent(opts.existingCode)}`, { method: 'PUT', body: { ...body, active: true } })
    : await paystack<{ subaccount_code: string }>('/subaccount', { method: 'POST', body })
  if (!r.ok) return { ok: false, error: r.message || 'Paystack could not save the payout account' }
  const code = r.data?.subaccount_code ?? opts.existingCode
  return code ? { ok: true, code } : { ok: false, error: 'Paystack did not return a subaccount' }
}

export type CheckoutMethod = 'paystack' | 'transfer' | 'pay_on_delivery'

/**
 * Payment options a store's checkout offers, Duka Pay first (the default).
 * Used by the checkout page and re-checked by the order API, so they agree.
 */
export function checkoutMethods(store: DukaPayStore & {
  payment_preference?: string | null
  bank_account_number?: string | null
}, payOnDeliveryEnabled: boolean): CheckoutMethod[] {
  const pref = store.payment_preference ?? 'paystack'
  const online = dukaPayActive(store)
  const wantsOnline = pref === 'paystack' || pref === 'both'
  const out: CheckoutMethod[] = []
  if (online && wantsOnline) out.push('paystack')
  // Manual transfer when chosen — or as the fallback for an "online only"
  // store whose payout account isn't connected yet, so checkout never dead-ends
  if (pref === 'bank_transfer' || pref === 'both' || (wantsOnline && !online && store.bank_account_number)) out.push('transfer')
  if (payOnDeliveryEnabled) out.push('pay_on_delivery')
  return out
}

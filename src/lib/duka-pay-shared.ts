// Duka Pay rules with no server dependencies, so browser code (Settings,
// checkout) can use them too. Server code imports these via lib/duka-pay.

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

export type CheckoutMethod = 'paystack' | 'transfer' | 'pay_on_delivery'

export interface CheckoutStore extends DukaPayStore {
  /** The three switches (Settings → Payments). Null/undefined = not migrated yet */
  duka_pay_enabled?: boolean | null
  bank_transfer_enabled?: boolean | null
  /** Older single choice, used only when the switches aren't set */
  payment_preference?: string | null
  bank_account_number?: string | null
}

/** The store's Duka Pay and bank-transfer switches (falling back to the old single choice). */
export function paymentSwitches(store: CheckoutStore): { dukaPay: boolean; bankTransfer: boolean } {
  const pref = store.payment_preference ?? 'paystack'
  return {
    dukaPay: store.duka_pay_enabled ?? (pref === 'paystack' || pref === 'both'),
    bankTransfer: store.bank_transfer_enabled ?? (pref === 'bank_transfer' || pref === 'both'),
  }
}

/**
 * Payment options a store's checkout offers, Duka Pay first (the default).
 * Used by the checkout page and re-checked by the order API, so they agree.
 * `allowTransfers: false` is the platform switch (Admin → Settings) that
 * retires manual "transfer, then confirm" payments everywhere.
 */
export function checkoutMethods(
  store: CheckoutStore,
  payOnDeliveryEnabled: boolean,
  opts: { allowTransfers?: boolean } = {}
): CheckoutMethod[] {
  const { dukaPay, bankTransfer } = paymentSwitches(store)
  const online = dukaPayActive(store)
  const transfersAllowed = opts.allowTransfers !== false
  const out: CheckoutMethod[] = []
  if (online && dukaPay) out.push('paystack')
  // Manual transfer when switched on — or as the fallback while a store that
  // wants Duka Pay hasn't connected its payout account, so checkout never dead-ends
  if (transfersAllowed && (bankTransfer || (dukaPay && !online && store.bank_account_number))) out.push('transfer')
  if (payOnDeliveryEnabled) out.push('pay_on_delivery')
  return out
}

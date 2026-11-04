// ─── Paystack helpers ─────────────────────────────────────────────
const PAYSTACK_BASE = 'https://api.paystack.co'

// Every callback URL Paystack redirects customers back to after payment is
// built from NEXT_PUBLIC_APP_URL. If that env var is ever missing/blank on
// a live deployment, the naive `${process.env.NEXT_PUBLIC_APP_URL}/...`
// pattern silently produces "undefined/api/paystack/callback?..." (or, in
// two of the three call sites, falls back to http://localhost:3000 — just
// as broken for a real customer) — Paystack still accepts it as a
// syntactically valid string, the payment still succeeds on Paystack's
// side, and the customer's browser then fails to redirect anywhere
// useful. That looks exactly like "the payment failed", even though it
// didn't. Centralized here with a hardcoded production fallback (never
// localhost) so that failure mode can't happen silently again — and it
// logs loudly if the fallback is ever actually used, since that always
// means the env var is misconfigured on whatever server is running this.
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (url) return url.replace(/\/$/, '')
  console.error(
    '[paystack] NEXT_PUBLIC_APP_URL is not set — falling back to https://dukanigeria.com. ' +
    'Payment callback URLs will be wrong if this deployment is not actually dukanigeria.com.'
  )
  return 'https://dukanigeria.com'
}

interface PaystackInitResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

interface PaystackVerifyResponse {
  status: boolean
  message: string
  data: {
    status: 'success' | 'failed' | 'abandoned'
    reference: string
    amount: number // in kobo
    currency?: string
    customer: { email: string }
    channel?: string
    fees?: number | null
    fees_split?: { paystack?: number; integration?: number; subaccount?: number } | null
    subaccount?: { subaccount_code?: string } | null
  }
}

export async function initializeTransaction(opts: {
  email: string
  amount: number   // in Naira — we convert to kobo
  reference: string
  callbackUrl: string
  metadata?: Record<string, unknown>
  /** Duka Pay: send the store's share to its subaccount, Duka keeps transaction_charge (kobo) */
  split?: { subaccount: string; bearer: 'subaccount' | 'account'; transaction_charge: number }
  channels?: readonly string[]
}): Promise<PaystackInitResponse> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: opts.email,
      amount: Math.round(opts.amount * 100), // kobo
      reference: opts.reference,
      callback_url: opts.callbackUrl,
      metadata: opts.metadata,
      ...(opts.split ?? {}),
      ...(opts.channels ? { channels: opts.channels } : {}),
    }),
  })
  return res.json()
}

export async function verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  })
  return res.json()
}

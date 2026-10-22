// All Paystack payments go through here: orders, subscriptions and theme
// purchases.
//
//  • startPayment()   — one checkout per thing being paid for. Clicking "Pay"
//                       again re-opens the same Paystack page instead of
//                       creating a second charge, and if that checkout was in
//                       fact already paid it settles it rather than charging
//                       again.
//  • settlePayment()  — the only way a payment is applied. Called by the
//                       webhook (primary), the return page and the reconcile
//                       job. Nothing happens unless Paystack confirms a
//                       *successful* charge of the *exact* amount in NGN for
//                       that reference, and each attempt is claimed once —
//                       so a payment can never be applied twice, and an
//                       unfinished/abandoned Paystack checkout never
//                       completes anything on Duka.
//  • reconcilePendingPayments() — cron safety net for missed webhooks.
import type { PoolClient } from 'pg'
import { query, queryOne, withTransaction } from './db'
import { initializeTransaction, verifyTransaction, getAppUrl } from './paystack'
import { markOrderPaidOnline } from './order-payments'
import { fulfillSubscriptionPayment } from './billing-fulfillment'
import { clearOwnedThemes } from './theme-access'

export type PaymentKind = 'order' | 'subscription' | 'theme'

export interface PaymentAttempt {
  id: string
  reference: string
  kind: PaymentKind
  store_id: string | null
  target_id: string
  amount: string | number
  currency: string
  email: string | null
  authorization_url: string | null
  status: 'pending' | 'success' | 'failed' | 'duplicate'
  created_at: string | Date
}

/** What Paystack says about a charge (webhook payload or verify response). */
export interface PaystackCharge {
  status?: string
  reference?: string
  amount?: number // kobo
  currency?: string
}

/** A reused checkout must still be open on Paystack's side. */
const REUSE_WINDOW_MS = 30 * 60_000

export function koboOf(naira: number | string): number {
  return Math.round(Number(naira) * 100)
}

/** The charge is exactly what we asked for, and it went through. */
export function chargeMatches(charge: PaystackCharge | null | undefined, attempt: Pick<PaymentAttempt, 'reference' | 'amount' | 'currency'>): boolean {
  return (
    !!charge &&
    charge.status === 'success' &&
    charge.reference === attempt.reference &&
    (charge.currency ?? 'NGN').toUpperCase() === (attempt.currency || 'NGN').toUpperCase() &&
    Number(charge.amount) === koboOf(attempt.amount)
  )
}

/**
 * Payment target keys. Theme and subscription keys include the store, so
 * one store buying a theme never looks like another store already has it.
 */
export const targets = {
  theme: (storeId: string, themeId: string) => `${storeId}:${themeId}`,
  monthly: (storeId: string) => `monthly:${storeId}`,
  setupFee: (storeId: string) => `setup_fee:${storeId}`,
  plan: (storeId: string, planId: string) => `plan:${planId}:${storeId}`,
}

export function subscriptionTypeOf(target: string): 'plan' | 'monthly' | 'setup_fee' {
  return target.startsWith('plan:') ? 'plan' : target.startsWith('setup_fee:') ? 'setup_fee' : 'monthly'
}

export function callbackUrlFor(reference: string): string {
  return `${getAppUrl()}/api/payments/callback?reference=${encodeURIComponent(reference)}`
}

export type StartResult =
  | { ok: true; authorizationUrl: string; reference: string; reused: boolean }
  | { ok: true; alreadyPaid: true; reference: string }
  | { ok: false; error: string; status: number }

/**
 * Begin (or resume) a Paystack checkout for one thing. Serialised per
 * (kind, target) with an advisory lock, so two clicks can't open two
 * checkouts.
 */
export async function startPayment(opts: {
  kind: PaymentKind
  storeId: string | null
  targetId: string
  amount: number
  email: string
  referencePrefix: string
  metadata?: Record<string, unknown>
  /** Runs inside the lock after a new checkout is created (e.g. a subscription_payments row). */
  onCreated?: (client: PoolClient, reference: string) => Promise<void>
}): Promise<StartResult> {
  if (!(opts.amount > 0)) return { ok: false, error: 'Nothing to pay', status: 400 }

  // Any successful attempt already? Then there is nothing to start.
  const done = await queryOne<{ reference: string }>(
    `SELECT reference FROM payment_attempts WHERE kind = $1 AND target_id = $2 AND status = 'success' LIMIT 1`,
    [opts.kind, opts.targetId]
  )
  if (done && opts.kind !== 'subscription') return { ok: true, alreadyPaid: true, reference: done.reference }

  // An open checkout for the same amount? Check Paystack before reusing it:
  // if it was paid (webhook not here yet) settle it instead of charging again.
  const open = await queryOne<PaymentAttempt>(
    `SELECT * FROM payment_attempts
     WHERE kind = $1 AND target_id = $2 AND status = 'pending' AND amount = $3
       AND created_at > NOW() - make_interval(secs => $4) AND authorization_url IS NOT NULL
     ORDER BY created_at DESC LIMIT 1`,
    [opts.kind, opts.targetId, opts.amount, REUSE_WINDOW_MS / 1000]
  )
  if (open) {
    const settled = await settlePayment(open.reference, 'callback')
    if (settled.state === 'applied' || settled.state === 'already_settled') {
      return { ok: true, alreadyPaid: true, reference: open.reference }
    }
    if (settled.state === 'not_paid' && settled.paystackStatus !== 'failed' && settled.paystackStatus !== 'abandoned') {
      return { ok: true, authorizationUrl: open.authorization_url!, reference: open.reference, reused: true }
    }
    if (settled.state === 'not_paid') {
      // Paystack says that checkout is dead — close it so a fresh one opens
      await query(`UPDATE payment_attempts SET status = 'failed' WHERE reference = $1 AND status = 'pending'`, [open.reference])
    }
  }

  return withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`pay:${opts.kind}:${opts.targetId}`])
    // Someone else may have opened one while we waited for the lock
    const raced = await client.query<PaymentAttempt>(
      `SELECT * FROM payment_attempts
       WHERE kind = $1 AND target_id = $2 AND status = 'pending' AND amount = $3
         AND created_at > NOW() - make_interval(secs => 60) AND authorization_url IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [opts.kind, opts.targetId, opts.amount]
    )
    if (raced.rows[0]) {
      return { ok: true as const, authorizationUrl: raced.rows[0].authorization_url!, reference: raced.rows[0].reference, reused: true }
    }

    const reference = `${opts.referencePrefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    const init = await initializeTransaction({
      email: opts.email,
      amount: opts.amount,
      reference,
      callbackUrl: callbackUrlFor(reference),
      metadata: { ...opts.metadata, kind: opts.kind, target: opts.targetId },
    })
    if (!init.status || !init.data?.authorization_url) {
      return { ok: false as const, error: init.message || 'Could not start the payment', status: 502 }
    }
    await client.query(
      `INSERT INTO payment_attempts (reference, kind, store_id, target_id, amount, email, authorization_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [reference, opts.kind, opts.storeId, opts.targetId, opts.amount, opts.email, init.data.authorization_url]
    )
    if (opts.onCreated) await opts.onCreated(client, reference)
    return { ok: true as const, authorizationUrl: init.data.authorization_url, reference, reused: false }
  })
}

export type SettleResult =
  | { state: 'applied'; attempt: PaymentAttempt }
  | { state: 'already_settled'; attempt: PaymentAttempt }
  | { state: 'duplicate'; attempt: PaymentAttempt }
  | { state: 'not_paid'; attempt: PaymentAttempt; paystackStatus: string | null }
  | { state: 'unknown_reference' }

/**
 * Apply a payment, once, if and only if Paystack confirms it. `charge` is the
 * signature-verified webhook payload; without it Paystack is asked directly.
 */
export async function settlePayment(
  reference: string,
  via: 'webhook' | 'callback' | 'reconcile',
  charge?: PaystackCharge
): Promise<SettleResult> {
  const attempt = await queryOne<PaymentAttempt>('SELECT * FROM payment_attempts WHERE reference = $1', [reference])
  if (!attempt) return { state: 'unknown_reference' }
  if (attempt.status === 'success') return { state: 'already_settled', attempt }
  if (attempt.status === 'duplicate') return { state: 'duplicate', attempt }

  let data: PaystackCharge | null = charge ?? null
  if (!data) {
    try {
      data = (await verifyTransaction(reference))?.data ?? null
    } catch {
      data = null
    }
  }
  await query('UPDATE payment_attempts SET paystack_status = $2, last_checked_at = NOW() WHERE id = $1', [
    attempt.id,
    data?.status ?? null,
  ])

  if (!chargeMatches(data, attempt)) {
    if (data?.status === 'success') {
      // Paid, but not what we asked for (amount/currency/reference) — never apply
      console.error('[payments] charge mismatch, not applied', { reference, kind: attempt.kind })
    }
    return { state: 'not_paid', attempt, paystackStatus: data?.status ?? null }
  }

  // Claim the attempt: exactly one caller gets past this line per reference.
  const claimed = await queryOne<{ id: string }>(
    `UPDATE payment_attempts SET status = 'success', settled_at = NOW(), settled_via = $2
     WHERE id = $1 AND status IN ('pending', 'failed') RETURNING id`,
    [attempt.id, via]
  )
  if (!claimed) return { state: 'already_settled', attempt }

  const applied = await applyPayment(attempt)
  if (!applied) {
    // Money arrived for something already paid by another attempt
    await query(`UPDATE payment_attempts SET status = 'duplicate' WHERE id = $1`, [attempt.id])
    console.error('[payments] duplicate payment — refund needed', { reference, kind: attempt.kind, target: attempt.target_id })
    return { state: 'duplicate', attempt }
  }
  return { state: 'applied', attempt }
}

/** The business effect of a confirmed payment. False = the target was already paid. */
async function applyPayment(a: PaymentAttempt): Promise<boolean> {
  switch (a.kind) {
    case 'order':
      return markOrderPaidOnline(a.target_id)
    case 'theme': {
      const themeId = a.target_id.slice(a.target_id.indexOf(':') + 1)
      const row = await queryOne(
        `INSERT INTO theme_purchases (store_id, theme_id, amount, reference) VALUES ($1, $2, $3, $4)
         ON CONFLICT (store_id, theme_id) DO NOTHING RETURNING id`,
        [a.store_id, themeId, a.amount, a.reference]
      )
      if (a.store_id) await clearOwnedThemes(a.store_id)
      return !!row
    }
    case 'subscription': {
      const r = await fulfillSubscriptionPayment(a.reference, subscriptionTypeOf(a.target_id))
      return r.ok
    }
  }
}

/**
 * Safety net (cron): ask Paystack about checkouts still pending. Paid ones
 * are settled (a webhook that never arrived), failed/abandoned ones older
 * than two hours are closed so they can never complete later.
 */
export async function reconcilePendingPayments(limit = 50): Promise<{ checked: number; settled: number; closed: number }> {
  const pending = await query<{ reference: string; created_at: string | Date }>(
    `SELECT reference, created_at FROM payment_attempts
     WHERE status = 'pending'
       AND created_at < NOW() - INTERVAL '5 minutes'
       AND created_at > NOW() - INTERVAL '3 days'
       AND (last_checked_at IS NULL OR last_checked_at < NOW() - INTERVAL '10 minutes')
     ORDER BY created_at ASC LIMIT $1`,
    [limit]
  )
  let settled = 0
  let closed = 0
  for (const p of pending) {
    const r = await settlePayment(p.reference, 'reconcile')
    if (r.state === 'applied' || r.state === 'duplicate') settled++
    else if (r.state === 'not_paid') {
      const ageMs = Date.now() - new Date(p.created_at).getTime()
      // Only Paystack's own "no" closes a checkout — never a network error
      const finalNo = r.paystackStatus === 'failed' || r.paystackStatus === 'abandoned'
      if (finalNo && ageMs > 2 * 3_600_000) {
        await query(`UPDATE payment_attempts SET status = 'failed' WHERE reference = $1 AND status = 'pending'`, [p.reference])
        closed++
      }
    }
  }
  return { checked: pending.length, settled, closed }
}

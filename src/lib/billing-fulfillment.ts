import { query, queryOne } from '@/lib/db'
import { invalidatePlanCache } from './plan'
import { getPlatformSettings } from '@/lib/admin-auth'
import { sendWebPushToAllAdmins } from '@/lib/webpush'

type PaymentType = 'setup_fee' | 'monthly' | 'plan'

interface SubscriptionPayment {
  id: string
  store_id: string
  type: string
  payment_status: string
  plan_id: string | null
  amount: number
  /** 'yearly' buys 12 months; null/'monthly' one month (column may not exist yet) */
  billing_cycle: string | null
}

/**
 * When a newly bought plan period starts.
 * - Same plan, still running: straight after the current end (renewing early
 *   loses nothing).
 * - Different plan while the current one still runs: the unused time is
 *   carried over at the two plans' price ratio (₦ value kept), so switching
 *   mid-way through a prepaid year never throws paid time away.
 * - Nothing running: today.
 */
export function planPeriodStart(opts: {
  now: Date
  newPlanId: string
  newPlanPrice: number
  currentPlanId: string | null
  currentPlanPrice: number | null
  currentEnd: Date | null
}): Date {
  const { now, currentEnd } = opts
  if (!currentEnd || currentEnd <= now || !opts.currentPlanId) return now
  if (opts.currentPlanId === opts.newPlanId) return currentEnd
  const oldPrice = Number(opts.currentPlanPrice ?? 0)
  const newPrice = Number(opts.newPlanPrice)
  if (!(oldPrice > 0) || !(newPrice > 0)) return now
  const credit = (currentEnd.getTime() - now.getTime()) * (oldPrice / newPrice)
  return new Date(now.getTime() + Math.round(credit))
}

/**
 * Marks a subscription payment as paid and applies the business effect
 * (store activation, subscription extension, plan assignment, referral reward).
 *
 * Idempotent: returns false if the payment is already paid or not found.
 * Validates that the stored payment type matches the expected type to prevent
 * URL-manipulation attacks where someone swaps ?type=setup_fee to ?type=monthly.
 */
export async function fulfillSubscriptionPayment(
  reference: string,
  expectedType: PaymentType
): Promise<{ ok: boolean; error?: string }> {
  // billing_cycle read through to_jsonb so this works before and after
  // migrations/yearly_billing.sql (no column yet = every payment is monthly)
  const payment = await queryOne<SubscriptionPayment>(
    `SELECT sp.id, sp.store_id, sp.type, sp.payment_status, sp.plan_id, sp.amount, to_jsonb(sp) ->> 'billing_cycle' AS billing_cycle
     FROM subscription_payments sp WHERE sp.payment_reference = $1`,
    [reference]
  )

  if (!payment) return { ok: false, error: 'payment_not_found' }
  if (payment.payment_status === 'paid') return { ok: false, error: 'already_paid' }

  // Guard against type-swapping: stored type must match what we were told
  if (payment.type !== expectedType) return { ok: false, error: 'type_mismatch' }

  // Claim the payment atomically. The webhook, the return page and the
  // reconcile job can all arrive at once; only the one whose UPDATE flips
  // the row applies the effects below (it used to be read-then-write, so
  // two of them could both extend the plan and pay the referral reward).
  // 'failed' is claimable too: an early return page once marked a payment
  // failed before Paystack finished, and the real success must still land.
  const claimed = await queryOne<{ id: string }>(
    `UPDATE subscription_payments SET payment_status = 'paid'
     WHERE payment_reference = $1 AND type = $2 AND payment_status IN ('pending', 'failed')
     RETURNING id`,
    [reference, expectedType]
  )
  if (!claimed) return { ok: false, error: 'already_paid' }

  const settings = await getPlatformSettings()
  const now = new Date()

  if (expectedType === 'setup_fee') {
    const expiresAt = new Date(now)
    expiresAt.setMonth(expiresAt.getMonth() + settings.setup_fee_duration_months)

    await query(
      `UPDATE stores
       SET subscription_status = 'setup_fee_paid',
           setup_fee_paid_at   = NOW(),
           subscription_expires_at = $1,
           status              = 'pending_approval',
           updated_at          = NOW()
       WHERE id = $2`,
      [expiresAt.toISOString(), payment.store_id]
    )

    await query(
      `UPDATE subscription_payments SET period_start = $1, period_end = $2 WHERE payment_reference = $3`,
      [now.toISOString(), expiresAt.toISOString(), reference]
    )
  }

  if (expectedType === 'monthly') {
    const expiresAt = new Date(now)
    expiresAt.setMonth(expiresAt.getMonth() + 1)

    await query(
      `UPDATE stores
       SET subscription_status = 'subscribed',
           subscription_expires_at = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [expiresAt.toISOString(), payment.store_id]
    )

    await query(
      `UPDATE subscription_payments SET period_start = $1, period_end = $2 WHERE payment_reference = $3`,
      [now.toISOString(), expiresAt.toISOString(), reference]
    )
  }

  if (expectedType === 'plan') {
    const planId = payment.plan_id
    if (!planId) return { ok: false, error: 'missing_plan_id' }

    // A month, or 12 for a yearly payment — added after any time still left
    // (see planPeriodStart).
    const yearly = payment.billing_cycle === 'yearly'
    const [current, newPlan] = await Promise.all([
      queryOne<{ current_plan_id: string | null; plan_expires_at: string | Date | null; current_price: number | null; name: string }>(
        `SELECT s.current_plan_id, s.plan_expires_at, s.name, p.price_monthly AS current_price
         FROM stores s LEFT JOIN plans p ON p.id = s.current_plan_id WHERE s.id = $1`,
        [payment.store_id]
      ),
      queryOne<{ name: string; price_monthly: number }>('SELECT name, price_monthly FROM plans WHERE id = $1', [planId]),
    ])
    const currentEnd = current?.plan_expires_at ? new Date(current.plan_expires_at) : null
    const startFrom = planPeriodStart({
      now,
      newPlanId: planId,
      newPlanPrice: Number(newPlan?.price_monthly ?? 0),
      currentPlanId: current?.current_plan_id ?? null,
      currentPlanPrice: current?.current_price ?? null,
      currentEnd,
    })
    const expiresAt = new Date(startFrom)
    expiresAt.setMonth(expiresAt.getMonth() + (yearly ? 12 : 1))

    await query(
      `UPDATE stores
       SET current_plan_id = $1,
           plan_expires_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [planId, expiresAt.toISOString(), payment.store_id]
    )
    invalidatePlanCache(payment.store_id)

    await query(
      `UPDATE subscription_payments SET period_start = $1, period_end = $2 WHERE payment_reference = $3`,
      [startFrom.toISOString(), expiresAt.toISOString(), reference]
    )

    // Reward the referrer on this store's *first* successful plan payment.
    // Unlike the old setup-fee flow, plan payments recur every renewal, so
    // idempotency is load-bearing here, not just defensive: the atomic
    // UPDATE below flips referrals.status 'signed_up' -> 'rewarded' exactly
    // once, ever, for a given (referrer, referred) pair — on any later
    // renewal it matches zero rows and the reward is skipped.
    await rewardReferrerOnFirstPlanPayment(payment.store_id, now)
    await rewardAffiliateOnFirstPlanPayment(payment.store_id)

    // Duka hears about every yearly subscription (a year of revenue upfront)
    if (yearly) {
      sendWebPushToAllAdmins({
        title: '🎉 New yearly subscription',
        body: `${current?.name ?? 'A store'} · ${newPlan?.name ?? 'Plan'} for a year · ₦${Number(payment.amount).toLocaleString('en-NG')} · until ${expiresAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        url: `/admin/vendors/${payment.store_id}`,
      }).catch(() => {})
    }
  }

  return { ok: true }
}

const REFERRAL_FREE_DAYS = 30
const AFFILIATE_COMMISSION = 2000 // ₦2,000 per activated referral

/**
 * Grants the referring store 1 free month of Pro when the store they
 * referred completes its first successful plan payment. Extends
 * plan_expires_at if the referrer already has an active paid plan;
 * otherwise auto-grants Pro from now. No-ops on renewals (see call site)
 * and on self-referral (structurally shouldn't happen — a store's own
 * referral_code doesn't exist until after its row is created — guarded
 * explicitly anyway since it's cheap).
 */
async function rewardReferrerOnFirstPlanPayment(referredStoreId: string, now: Date): Promise<void> {
  const referredStore = await queryOne<{ referred_by_store_id: string | null }>(
    'SELECT referred_by_store_id FROM stores WHERE id = $1',
    [referredStoreId]
  )
  const referrerId = referredStore?.referred_by_store_id
  if (!referrerId || referrerId === referredStoreId) return

  const rewarded = await query<{ id: string }>(
    `UPDATE referrals SET status = 'rewarded'
     WHERE referrer_store_id = $1 AND referred_store_id = $2 AND status != 'rewarded'
     RETURNING id`,
    [referrerId, referredStoreId]
  )
  if (rewarded.length === 0) return // already rewarded on an earlier payment — renewal, no-op

  const referrer = await queryOne<{ current_plan_id: string | null; plan_expires_at: string | null }>(
    'SELECT current_plan_id, plan_expires_at FROM stores WHERE id = $1',
    [referrerId]
  )
  const referrerHasActivePaidPlan = !!(
    referrer?.current_plan_id &&
    referrer.plan_expires_at &&
    new Date(referrer.plan_expires_at) > now
  )

  if (referrerHasActivePaidPlan) {
    await query(
      `UPDATE stores
       SET plan_expires_at  = plan_expires_at + ($1 * INTERVAL '1 day'),
           referral_credits = referral_credits + 1,
           updated_at       = NOW()
       WHERE id = $2`,
      [REFERRAL_FREE_DAYS, referrerId]
    )
    return
  }

  const proPlan = await queryOne<{ id: string }>(
    `SELECT id FROM plans WHERE name = 'Pro' AND is_active = true LIMIT 1`,
    []
  )
  if (!proPlan) return // Pro plan missing/deactivated — referral_credits alone still records the reward below

  const grantExpiresAt = new Date(now)
  grantExpiresAt.setDate(grantExpiresAt.getDate() + REFERRAL_FREE_DAYS)

  await query(
    `UPDATE stores
     SET current_plan_id  = $1,
         plan_expires_at  = $2,
         referral_credits = referral_credits + 1,
         updated_at       = NOW()
     WHERE id = $3`,
    [proPlan.id, grantExpiresAt.toISOString(), referrerId]
  )
  invalidatePlanCache(referrerId)
}

/**
 * Credits the referring affiliate's commission when the store they referred
 * completes its first successful plan payment. affiliate_referrals already
 * has UNIQUE(store_id), so the status flip below is naturally one-shot —
 * gating the balance credit on it actually having flipped is what makes
 * this idempotent (the previous version credited the balance unconditionally,
 * which re-fired every renewal once re-pointed to the recurring plan flow).
 */
async function rewardAffiliateOnFirstPlanPayment(referredStoreId: string): Promise<void> {
  const referredStore = await queryOne<{ referred_by_affiliate_id: string | null }>(
    'SELECT referred_by_affiliate_id FROM stores WHERE id = $1',
    [referredStoreId]
  )
  const affiliateId = referredStore?.referred_by_affiliate_id
  if (!affiliateId) return

  const activated = await query<{ id: string }>(
    `UPDATE affiliate_referrals
     SET status = 'active', commission_amount = $1, rewarded_at = NOW()
     WHERE store_id = $2 AND status = 'pending'
     RETURNING id`,
    [AFFILIATE_COMMISSION, referredStoreId]
  )
  if (activated.length === 0) return // already activated on an earlier payment — renewal, no-op

  await query(
    `UPDATE affiliates
     SET payout_balance   = payout_balance + $1,
         earnings_total   = earnings_total + $1,
         active_referrals = active_referrals + 1,
         updated_at       = NOW()
     WHERE id = $2`,
    [AFFILIATE_COMMISSION, affiliateId]
  )
}

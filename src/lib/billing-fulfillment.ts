import { query, queryOne } from '@/lib/db'
import { getPlatformSettings } from '@/lib/admin-auth'

type PaymentType = 'setup_fee' | 'monthly' | 'plan'

interface SubscriptionPayment {
  id: string
  store_id: string
  type: string
  payment_status: string
  plan_id: string | null
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
  const payment = await queryOne<SubscriptionPayment>(
    'SELECT id, store_id, type, payment_status, plan_id FROM subscription_payments WHERE payment_reference = $1',
    [reference]
  )

  if (!payment) return { ok: false, error: 'payment_not_found' }
  if (payment.payment_status === 'paid') return { ok: false, error: 'already_paid' }

  // Guard against type-swapping: stored type must match what we were told
  if (payment.type !== expectedType) return { ok: false, error: 'type_mismatch' }

  // Mark payment as paid
  await query(
    `UPDATE subscription_payments SET payment_status = 'paid' WHERE payment_reference = $1`,
    [reference]
  )

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

    const expiresAt = new Date(now)
    expiresAt.setMonth(expiresAt.getMonth() + 1)

    await query(
      `UPDATE stores
       SET current_plan_id = $1,
           plan_expires_at = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [planId, expiresAt.toISOString(), payment.store_id]
    )

    await query(
      `UPDATE subscription_payments SET period_start = $1, period_end = $2 WHERE payment_reference = $3`,
      [now.toISOString(), expiresAt.toISOString(), reference]
    )

    // Reward the referrer on this store's *first* successful plan payment.
    // Unlike the old setup-fee flow, plan payments recur every renewal, so
    // idempotency is load-bearing here, not just defensive: the atomic
    // UPDATE below flips referrals.status 'signed_up' -> 'rewarded' exactly
    // once, ever, for a given (referrer, referred) pair — on any later
    // renewal it matches zero rows and the reward is skipped.
    await rewardReferrerOnFirstPlanPayment(payment.store_id, now)
    await rewardAffiliateOnFirstPlanPayment(payment.store_id)
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

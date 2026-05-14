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

    // Reward referrer with 1 free month
    const referredStore = await queryOne<{ referred_by_store_id: string | null }>(
      'SELECT referred_by_store_id FROM stores WHERE id = $1',
      [payment.store_id]
    )
    if (referredStore?.referred_by_store_id) {
      await query(
        `UPDATE stores
         SET subscription_expires_at = GREATEST(COALESCE(subscription_expires_at, NOW()), NOW()) + INTERVAL '30 days',
             referral_credits = referral_credits + 1
         WHERE id = $1`,
        [referredStore.referred_by_store_id]
      )
      await query(
        `INSERT INTO referrals (referrer_store_id, referred_store_id, status)
         VALUES ($1, $2, 'rewarded')
         ON CONFLICT DO NOTHING`,
        [referredStore.referred_by_store_id, payment.store_id]
      )
    }
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
  }

  return { ok: true }
}

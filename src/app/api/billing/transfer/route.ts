import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { queryOne, query } from '@/lib/db'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { getPlatformSettings } from '@/lib/admin-auth'

const Schema = z.object({
  type:    z.enum(['setup_fee', 'monthly', 'plan']),
  plan_id: z.string().uuid().optional().nullable(),
})

export async function POST(req: NextRequest) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { type, plan_id } = parsed.data

  const store = await queryOne<{
    id: string
    subscription_status: string
    status: string
  }>('SELECT id, subscription_status, status FROM stores WHERE owner_id = $1', [user.firebaseUid])

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const settings = await getPlatformSettings()

  if (type === 'setup_fee') {
    if (
      store.subscription_status === 'setup_fee_paid' ||
      store.subscription_status === 'subscribed'
    ) {
      return NextResponse.json({ error: 'Setup fee already paid' }, { status: 409 })
    }
  }

  if (type === 'monthly') {
    if (!settings.require_subscription) {
      return NextResponse.json({ error: 'Subscription not required' }, { status: 400 })
    }
  }

  if (type === 'plan') {
    if (!plan_id) return NextResponse.json({ error: 'plan_id required' }, { status: 400 })
    if (!settings.require_plan_subscription) {
      return NextResponse.json({ error: 'Plan subscription not required' }, { status: 400 })
    }
    const plan = await queryOne<{ id: string; is_active: boolean }>(
      'SELECT id, is_active FROM plans WHERE id = $1',
      [plan_id]
    )
    if (!plan || !plan.is_active) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }
  }

  // Check for an existing pending_transfer for this store + type to avoid duplicates
  const existing = await queryOne(
    `SELECT id FROM subscription_payments
     WHERE store_id = $1 AND type = $2 AND payment_status = 'pending_transfer'`,
    [store.id, type]
  )
  if (existing) {
    return NextResponse.json({ error: 'You already have a pending transfer for this payment. Admin will confirm it shortly.' }, { status: 409 })
  }

  const amounts: Record<string, number> = {
    setup_fee: settings.setup_fee_amount,
    monthly:   settings.monthly_fee_amount,
  }

  let amount = amounts[type] ?? 0
  if (type === 'plan' && plan_id) {
    const plan = await queryOne<{ price_monthly: number }>(
      'SELECT price_monthly FROM plans WHERE id = $1',
      [plan_id]
    )
    amount = plan?.price_monthly ?? 0
  }

  const reference = `TRF-${store.id.slice(0, 8).toUpperCase()}-${uuidv4().slice(0, 8).toUpperCase()}`

  await query(
    `INSERT INTO subscription_payments
       (store_id, type, amount, payment_reference, payment_status, payment_method, plan_id)
     VALUES ($1, $2, $3, $4, 'pending_transfer', 'bank_transfer', $5)`,
    [store.id, type, amount, reference, plan_id ?? null]
  )

  // Mark store as awaiting (only for setup_fee)
  if (type === 'setup_fee') {
    await query(
      `UPDATE stores SET subscription_status = 'setup_fee_pending', updated_at = NOW() WHERE id = $1`,
      [store.id]
    )
  }

  return NextResponse.json({ success: true, reference })
}

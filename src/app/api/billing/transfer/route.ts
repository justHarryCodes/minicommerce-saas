import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { queryOne, query } from '@/lib/db'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { sendWebPushToAllAdmins } from '@/lib/webpush'
import { getPlatformSettings } from '@/lib/admin-auth'
import { priceFor } from '@/lib/plan-pricing'
import { YEARLY_NOT_READY, yearlyBillingReady } from '@/lib/yearly-billing'

const Schema = z.object({
  type:    z.literal('plan'),
  plan_id: z.string().uuid().optional().nullable(),
  cycle:   z.enum(['monthly', 'yearly']).optional().default('monthly'),
})

export async function POST(req: NextRequest) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { type, plan_id, cycle } = parsed.data
  if (cycle === 'yearly' && !(await yearlyBillingReady())) {
    return NextResponse.json({ error: YEARLY_NOT_READY }, { status: 503 })
  }

  const store = await queryOne<{
    id: string
    name: string
    subscription_status: string
    subscription_expires_at: string | null
    status: string
  }>(
    'SELECT id, name, subscription_status, subscription_expires_at, status FROM stores WHERE owner_id = $1',
    [user.firebaseUid]
  )

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  // Bank transfers are only for monthly plans (the one subscription Duka has)
  if (!plan_id) return NextResponse.json({ error: 'plan_id required' }, { status: 400 })
  const plan = await queryOne<{ id: string; is_active: boolean; price_monthly: number }>(
    'SELECT id, is_active, price_monthly FROM plans WHERE id = $1',
    [plan_id]
  )
  if (!plan || !plan.is_active) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  // Check for an existing pending_transfer for this store + type to avoid duplicates
  const existing = await queryOne(
    `SELECT id FROM subscription_payments
     WHERE store_id = $1 AND type = $2 AND payment_status = 'pending_transfer'`,
    [store.id, type]
  )
  if (existing) {
    return NextResponse.json(
      { error: 'You already have a pending transfer for this payment. Admin will confirm it shortly.' },
      { status: 409 }
    )
  }

  const { yearly_discount_percent } = await getPlatformSettings()
  const amount = priceFor(plan.price_monthly, cycle, yearly_discount_percent)

  const reference = `TRF-${store.id.slice(0, 8).toUpperCase()}-${uuidv4().slice(0, 8).toUpperCase()}`

  if (cycle === 'yearly') {
    await query(
      `INSERT INTO subscription_payments
         (store_id, type, amount, payment_reference, payment_status, payment_method, plan_id, billing_cycle)
       VALUES ($1, $2, $3, $4, 'pending_transfer', 'bank_transfer', $5, 'yearly')`,
      [store.id, type, amount, reference, plan_id ?? null]
    )
  } else {
    await query(
      `INSERT INTO subscription_payments
         (store_id, type, amount, payment_reference, payment_status, payment_method, plan_id)
       VALUES ($1, $2, $3, $4, 'pending_transfer', 'bank_transfer', $5)`,
      [store.id, type, amount, reference, plan_id ?? null]
    )
  }

  // Fire-and-forget — a vendor's payment submission must never wait on
  // (or fail because of) notifying admins.
  sendWebPushToAllAdmins({
    title: 'Bank transfer awaiting confirmation',
    body: `${store.name} · plan${cycle === 'yearly' ? ' (YEARLY)' : ''} · ₦${amount.toLocaleString('en-NG')}`,
    url: '/admin/transfers',
  }).catch(() => {})

  return NextResponse.json({ success: true, reference })
}

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { queryOne, query } from '@/lib/db'
import { getPlatformSettings } from '@/lib/admin-auth'
import { initializeTransaction } from '@/lib/paystack'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const plan_id: string | undefined = body?.plan_id
  if (!plan_id || !uuidRe.test(plan_id)) {
    return NextResponse.json({ error: 'plan_id must be a valid UUID' }, { status: 400 })
  }

  const [store, plan] = await Promise.all([
    queryOne<{ id: string; name: string; status: string }>(
      'SELECT id, name, status FROM stores WHERE owner_id = $1 AND is_active = true',
      [user.firebaseUid]
    ),
    queryOne<{ id: string; name: string; price_monthly: number; is_active: boolean }>(
      'SELECT id, name, price_monthly, is_active FROM plans WHERE id = $1',
      [plan_id]
    ),
  ])

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  if (!plan.is_active) return NextResponse.json({ error: 'Plan is not available' }, { status: 400 })

  const settings = await getPlatformSettings()
  if (!settings.require_plan_subscription) {
    return NextResponse.json({ error: 'Plan subscriptions are not required' }, { status: 400 })
  }

  const reference = `PLAN-${store.id}-${uuidv4().slice(0, 8).toUpperCase()}`
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const paystackRes = await initializeTransaction({
    email: user.email,
    amount: plan.price_monthly,
    reference,
    callbackUrl: `${baseUrl}/api/billing/verify?type=plan&reference=${reference}`,
    metadata: {
      store_id: store.id,
      store_name: store.name,
      plan_id: plan.id,
      plan_name: plan.name,
      type: 'plan',
    },
  })

  if (!paystackRes.status) {
    return NextResponse.json({ error: paystackRes.message }, { status: 400 })
  }

  await query(
    `INSERT INTO subscription_payments (store_id, type, amount, payment_reference, payment_status, plan_id)
     VALUES ($1, 'plan', $2, $3, 'pending', $4)`,
    [store.id, plan.price_monthly, reference, plan.id]
  )

  return NextResponse.json({ authorization_url: paystackRes.data.authorization_url, reference })
}

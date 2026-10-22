import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { getPlatformSettings } from '@/lib/admin-auth'
import { startPayment, targets } from '@/lib/payments'

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

  // One open checkout per store and plan: clicking again reopens it, and a
  // checkout that was already paid is settled instead of charged again.
  const started = await startPayment({
    kind: 'subscription',
    storeId: store.id,
    targetId: targets.plan(store.id, plan.id),
    amount: plan.price_monthly,
    email: user.email,
    referencePrefix: 'PLAN',
    metadata: { store_id: store.id, store_name: store.name, plan_id: plan.id, plan_name: plan.name, type: 'plan' },
    onCreated: async (client, reference) => {
      await client.query(
        `INSERT INTO subscription_payments (store_id, type, amount, payment_reference, payment_status, plan_id)
         VALUES ($1, 'plan', $2, $3, 'pending', $4)`,
        [store.id, plan.price_monthly, reference, plan.id]
      )
    },
  })
  if (!started.ok) return NextResponse.json({ error: started.error }, { status: started.status })
  if ('alreadyPaid' in started) return NextResponse.json({ alreadyPaid: true, reference: started.reference })
  return NextResponse.json({ authorization_url: started.authorizationUrl, reference: started.reference })
}

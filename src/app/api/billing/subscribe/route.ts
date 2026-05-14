import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { queryOne, query } from '@/lib/db'
import { getPlatformSettings } from '@/lib/admin-auth'
import { initializeTransaction } from '@/lib/paystack'
import { v4 as uuidv4 } from 'uuid'

export async function POST(_req: NextRequest) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const store = await queryOne<{
    id: string
    name: string
    subscription_status: string
    setup_fee_paid_at: string | null
  }>('SELECT id, name, subscription_status, setup_fee_paid_at FROM stores WHERE owner_id = $1', [
    user.firebaseUid,
  ])

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const settings = await getPlatformSettings()

  if (!settings.require_subscription) {
    return NextResponse.json({ error: 'Subscription is not required' }, { status: 400 })
  }

  // If setup fee is still required and unpaid, block monthly subscription
  if (
    settings.require_setup_fee &&
    store.subscription_status !== 'setup_fee_paid' &&
    store.subscription_status !== 'subscribed' &&
    store.subscription_status !== 'expired'
  ) {
    return NextResponse.json({ error: 'Pay setup fee first' }, { status: 400 })
  }

  const reference = `SUB-${store.id}-${uuidv4().slice(0, 8).toUpperCase()}`
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const paystackRes = await initializeTransaction({
    email: user.email,
    amount: settings.monthly_fee_amount,
    reference,
    callbackUrl: `${baseUrl}/api/billing/verify?type=monthly&reference=${reference}`,
    metadata: {
      store_id: store.id,
      store_name: store.name,
      type: 'monthly',
    },
  })

  if (!paystackRes.status) {
    return NextResponse.json({ error: paystackRes.message }, { status: 400 })
  }

  await query(
    `INSERT INTO subscription_payments (store_id, type, amount, payment_reference, payment_status)
     VALUES ($1, 'monthly', $2, $3, 'pending')`,
    [store.id, settings.monthly_fee_amount, reference]
  )

  return NextResponse.json({ authorization_url: paystackRes.data.authorization_url, reference })
}

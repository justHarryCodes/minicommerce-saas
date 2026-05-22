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
    subscription_expires_at: string | null
    setup_fee_paid_at: string | null
  }>(
    'SELECT id, name, subscription_status, subscription_expires_at, setup_fee_paid_at FROM stores WHERE owner_id = $1',
    [user.firebaseUid]
  )

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const settings = await getPlatformSettings()

  if (!settings.require_subscription) {
    return NextResponse.json({ error: 'Subscription is not required' }, { status: 400 })
  }

  // Setup fee must be paid first
  const setupPaid = (
    store.subscription_status === 'setup_fee_paid' ||
    store.subscription_status === 'subscribed' ||
    store.subscription_status === 'expired'
  )
  if (settings.require_setup_fee && !setupPaid) {
    return NextResponse.json({ error: 'Pay the one-time setup fee first before subscribing.' }, { status: 400 })
  }

  // If subscription is currently active, only allow renewal during the window (day 25–end of month)
  // or within 7 days of expiry — whichever is earlier.
  const now = new Date()
  const expiresAt = store.subscription_expires_at ? new Date(store.subscription_expires_at) : null
  const isExpired = expiresAt ? expiresAt < now : false

  if (store.subscription_status === 'subscribed' && !isExpired) {
    const today = now.getDate()
    const msUntilExpiry = expiresAt ? expiresAt.getTime() - now.getTime() : Infinity
    const daysUntilExpiry = msUntilExpiry / (1000 * 60 * 60 * 24)

    // Allow if in last 7 days of subscription OR in calendar renewal window (day 25+)
    const inRenewalWindow = today >= 25 || daysUntilExpiry <= 7
    if (!inRenewalWindow) {
      return NextResponse.json(
        { error: 'Your subscription is still active. Renewal opens on the 25th of each month or within 7 days of your expiry date.' },
        { status: 400 }
      )
    }
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

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
    slug: string
    subscription_status: string
    setup_fee_paid_at: string | null
  }>('SELECT id, name, slug, subscription_status, setup_fee_paid_at FROM stores WHERE owner_id = $1', [
    user.firebaseUid,
  ])

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const settings = await getPlatformSettings()

  if (!settings.require_setup_fee) {
    return NextResponse.json({ error: 'Setup fee is not required' }, { status: 400 })
  }

  if (
    store.subscription_status === 'setup_fee_paid' ||
    store.subscription_status === 'subscribed'
  ) {
    return NextResponse.json({ error: 'Setup fee already paid' }, { status: 409 })
  }

  const reference = `SETUP-${store.id}-${uuidv4().slice(0, 8).toUpperCase()}`
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const paystackRes = await initializeTransaction({
    email: user.email,
    amount: settings.setup_fee_amount,
    reference,
    callbackUrl: `${baseUrl}/api/billing/verify?type=setup_fee&reference=${reference}`,
    metadata: {
      store_id: store.id,
      store_name: store.name,
      type: 'setup_fee',
    },
  })

  if (!paystackRes.status) {
    return NextResponse.json({ error: paystackRes.message }, { status: 400 })
  }

  // Record a pending payment row
  await query(
    `INSERT INTO subscription_payments (store_id, type, amount, payment_reference, payment_status)
     VALUES ($1, 'setup_fee', $2, $3, 'pending')`,
    [store.id, settings.setup_fee_amount, reference]
  )

  // Mark store as awaiting payment
  await query(
    `UPDATE stores SET subscription_status = 'setup_fee_pending', updated_at = NOW() WHERE id = $1`,
    [store.id]
  )

  return NextResponse.json({ authorization_url: paystackRes.data.authorization_url, reference })
}

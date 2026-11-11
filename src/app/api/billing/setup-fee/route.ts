import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { getPlatformSettings } from '@/lib/admin-auth'
import { startPayment, targets } from '@/lib/payments'

// One-time setup fee, paid online with Paystack. Only used when an admin
// turns on "Require setup fee" (Admin → Settings); while it's on, the
// dashboard sends unpaid stores to Billing, so this route must work.
// Same rules as every other payment: one open checkout per store, applied
// once the webhook confirms the exact amount (lib/payments).
export async function POST(_req: NextRequest) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const store = await queryOne<{ id: string; name: string; subscription_status: string | null }>(
    'SELECT id, name, subscription_status FROM stores WHERE owner_id = $1',
    [user.firebaseUid]
  )
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const settings = await getPlatformSettings()
  if (!settings.require_setup_fee) {
    return NextResponse.json({ error: 'No setup fee is needed — your store is already active.' }, { status: 400 })
  }

  // Already paid (or past it): nothing to charge — the page reloads
  if (['setup_fee_paid', 'subscribed', 'expired'].includes(store.subscription_status ?? '')) {
    return NextResponse.json({ alreadyPaid: true })
  }

  // A bank transfer for it is waiting on an admin — don't take the money twice
  const transfer = await queryOne(
    `SELECT 1 FROM subscription_payments
     WHERE store_id = $1 AND type = 'setup_fee' AND payment_status = 'pending_transfer' LIMIT 1`,
    [store.id]
  )
  if (transfer) {
    return NextResponse.json(
      { error: "You've already sent a bank transfer for the setup fee. We'll activate your store as soon as it's confirmed." },
      { status: 409 }
    )
  }

  const amount = Number(settings.setup_fee_amount)
  if (!(amount > 0)) return NextResponse.json({ error: 'The setup fee is not configured yet.' }, { status: 400 })

  const started = await startPayment({
    kind: 'subscription',
    storeId: store.id,
    targetId: targets.setupFee(store.id),
    amount,
    email: user.email,
    referencePrefix: 'SETUP',
    metadata: { store_id: store.id, store_name: store.name, type: 'setup_fee' },
    onCreated: async (client, reference) => {
      await client.query(
        `INSERT INTO subscription_payments (store_id, type, amount, payment_reference, payment_status)
         VALUES ($1, 'setup_fee', $2, $3, 'pending')`,
        [store.id, amount, reference]
      )
    },
  })
  if (!started.ok) return NextResponse.json({ error: started.error }, { status: started.status })
  if ('alreadyPaid' in started) return NextResponse.json({ alreadyPaid: true, reference: started.reference })
  return NextResponse.json({ authorization_url: started.authorizationUrl, reference: started.reference })
}

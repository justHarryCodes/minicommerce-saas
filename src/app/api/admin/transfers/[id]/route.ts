import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { queryOne, query } from '@/lib/db'
import { fulfillSubscriptionPayment } from '@/lib/billing-fulfillment'
import { z } from 'zod'

const Schema = z.object({
  action: z.enum(['confirm', 'reject']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const payment = await queryOne<{
    id: string
    type: string
    payment_reference: string
    payment_status: string
    payment_method: string
  }>(
    'SELECT id, type, payment_reference, payment_status, payment_method FROM subscription_payments WHERE id = $1',
    [id]
  )

  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (payment.payment_method !== 'bank_transfer') {
    return NextResponse.json({ error: 'Not a bank transfer payment' }, { status: 400 })
  }
  if (payment.payment_status !== 'pending_transfer') {
    return NextResponse.json({ error: 'Payment is not pending confirmation' }, { status: 409 })
  }

  if (parsed.data.action === 'reject') {
    await query(
      `UPDATE subscription_payments SET payment_status = 'rejected' WHERE id = $1`,
      [id]
    )
    return NextResponse.json({ success: true, status: 'rejected' })
  }

  // Confirm: run the same fulfillment logic as the Paystack verify route
  const validTypes = ['setup_fee', 'monthly', 'plan']
  if (!validTypes.includes(payment.type)) {
    return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 })
  }

  const result = await fulfillSubscriptionPayment(
    payment.payment_reference,
    payment.type as 'setup_fee' | 'monthly' | 'plan'
  )

  if (!result.ok && result.error !== 'already_paid') {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true, status: 'confirmed' })
}

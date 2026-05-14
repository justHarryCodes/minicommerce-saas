import { NextRequest, NextResponse } from 'next/server'
import { verifyTransaction } from '@/lib/paystack'
import { query } from '@/lib/db'
import { fulfillSubscriptionPayment } from '@/lib/billing-fulfillment'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const reference = searchParams.get('reference')
  const type = searchParams.get('type') as 'setup_fee' | 'monthly' | 'plan' | null

  if (!reference || !type || !['setup_fee', 'monthly', 'plan'].includes(type)) {
    return NextResponse.redirect(new URL('/dashboard/billing?error=invalid_params', req.url))
  }

  // Verify with Paystack before touching the DB
  const paystackRes = await verifyTransaction(reference)

  if (!paystackRes.status || paystackRes.data.status !== 'success') {
    await query(
      `UPDATE subscription_payments SET payment_status = 'failed' WHERE payment_reference = $1 AND payment_status = 'pending'`,
      [reference]
    )
    return NextResponse.redirect(new URL('/dashboard/billing?error=payment_failed', req.url))
  }

  const result = await fulfillSubscriptionPayment(reference, type)

  if (result.error === 'already_paid') {
    return NextResponse.redirect(new URL('/dashboard/billing?success=already_paid', req.url))
  }
  if (result.error === 'payment_not_found') {
    return NextResponse.redirect(new URL('/dashboard/billing?error=not_found', req.url))
  }
  if (result.error === 'type_mismatch') {
    return NextResponse.redirect(new URL('/dashboard/billing?error=invalid_params', req.url))
  }
  if (!result.ok) {
    return NextResponse.redirect(new URL('/dashboard/billing?error=payment_failed', req.url))
  }

  return NextResponse.redirect(new URL('/dashboard/billing?success=paid', req.url))
}

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyTransaction } from '@/lib/paystack'

export async function GET(req: NextRequest) {
  const ref     = req.nextUrl.searchParams.get('ref')
  const orderId = req.nextUrl.searchParams.get('orderId')
  if (!ref || !orderId) return NextResponse.redirect(new URL('/store-not-found', req.url))

  const res = await verifyTransaction(ref)
  if (res.status && res.data.status === 'success') {
    await query(
      "UPDATE orders SET payment_status='paid', order_status='confirmed' WHERE id=$1",
      [orderId]
    )
    return NextResponse.redirect(new URL(`/order-success?orderId=${orderId}`, req.url))
  }
  return NextResponse.redirect(new URL(`/order-failed?orderId=${orderId}`, req.url))
}

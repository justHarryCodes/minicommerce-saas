import { NextRequest, NextResponse } from 'next/server'
import { queryOne, query } from '@/lib/db'
import { initializeTransaction } from '@/lib/paystack'

export async function POST(req: NextRequest) {
  const { orderId, email } = await req.json()
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  const order = await queryOne<{
    id: string; total: number; order_number: string; payment_reference: string | null
  }>('SELECT * FROM orders WHERE id=$1', [orderId])
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const ref = `ORD-${order.order_number}-${Date.now()}`
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const res = await initializeTransaction({
    email: email || 'customer@shopforge.co',
    amount: Number(order.total),
    reference: ref,
    callbackUrl: `${baseUrl}/api/paystack/callback?orderId=${orderId}`,
    metadata: { orderId, orderNumber: order.order_number },
  })

  if (!res.status) return NextResponse.json({ error: res.message }, { status: 400 })
  await query('UPDATE orders SET payment_reference=$1 WHERE id=$2', [ref, orderId])

  return NextResponse.json({ authorization_url: res.data.authorization_url, reference: ref })
}

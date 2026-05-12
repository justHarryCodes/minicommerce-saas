import { NextRequest, NextResponse } from 'next/server'
import { verifySession, getUserStore } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: Promise<{ orderId: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { orderId } = await params
  const order = await queryOne(
    'SELECT * FROM orders WHERE id=$1 AND store_id=$2',
    [orderId, store.id]
  )
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const items = await query('SELECT * FROM order_items WHERE order_id=$1', [orderId])
  return NextResponse.json({ data: { ...order, items } })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { orderId } = await params
  const { orderStatus, paymentStatus } = await req.json()
  const sets: string[] = []; const vals: unknown[] = []; let i = 1

  if (orderStatus)   { sets.push(`order_status=$${i++}`);   vals.push(orderStatus) }
  if (paymentStatus) { sets.push(`payment_status=$${i++}`); vals.push(paymentStatus) }
  if (!sets.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  sets.push(`updated_at = NOW()`)
  vals.push(orderId, store.id)

  const rows = await query(
    `UPDATE orders SET ${sets.join(',')} WHERE id=$${i++} AND store_id=$${i} RETURNING *`,
    vals
  )
  return NextResponse.json({ data: rows[0] })
}

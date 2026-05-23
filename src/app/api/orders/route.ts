import { NextRequest, NextResponse } from 'next/server'
import { verifySession, getUserStore } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { searchParams } = req.nextUrl
  const page   = parseInt(searchParams.get('page') ?? '1')
  const limit  = parseInt(searchParams.get('limit') ?? '20')
  const status = searchParams.get('status')
  const offset = (page - 1) * limit

  let sql = `
    SELECT o.*,
      COALESCE(o.total_amount, o.total, o.subtotal) AS total_amount,
      json_agg(json_build_object(
        'id', oi.id, 'product_id', oi.product_id, 'product_name', oi.product_name,
        'product_image', oi.product_image, 'price', oi.price,
        'quantity', oi.quantity, 'subtotal', oi.subtotal
      ) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL) AS items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.store_id = $1
  `
  const vals: unknown[] = [store.id]
  let i = 2
  if (status) { sql += ` AND o.order_status = $${i++}`; vals.push(status) }
  sql += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT $${i++} OFFSET $${i++}`
  vals.push(limit, offset)

  const orders = await query(sql, vals)
  const [{ count }] = await query('SELECT COUNT(*) FROM orders WHERE store_id=$1', [store.id]) as { count: string }[]

  return NextResponse.json({ data: orders, total: parseInt(count), page, limit })
}

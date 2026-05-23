import { NextResponse } from 'next/server'
import { verifySession, getUserStore } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET() {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totals, todayRow, pendingRow, productRow, recent] = await Promise.all([
    queryOne<{ total_orders: string; total_revenue: string }>(
      `SELECT COUNT(*) AS total_orders,
              COALESCE(SUM(total_amount), 0) AS total_revenue
       FROM orders WHERE store_id = $1 AND payment_status = 'paid'`,
      [store.id]
    ),
    queryOne<{ today_orders: string; today_revenue: string }>(
      `SELECT COUNT(*) AS today_orders,
              COALESCE(SUM(total_amount), 0) AS today_revenue
       FROM orders WHERE store_id = $1 AND payment_status = 'paid' AND created_at >= $2`,
      [store.id, today.toISOString()]
    ),
    queryOne<{ pending_orders: string }>(
      `SELECT COUNT(*) AS pending_orders FROM orders WHERE store_id = $1 AND order_status = 'pending'`,
      [store.id]
    ),
    queryOne<{ total_products: string }>(
      `SELECT COUNT(*) AS total_products FROM products WHERE store_id = $1 AND is_active = true`,
      [store.id]
    ),
    query(
      `SELECT o.id, o.order_number, o.customer_name, o.customer_phone,
              o.total_amount, o.order_status, o.payment_status, o.payment_method,
              o.created_at, o.updated_at
       FROM orders o WHERE o.store_id = $1
       ORDER BY o.created_at DESC LIMIT 10`,
      [store.id]
    ),
  ])

  return NextResponse.json({
    totalOrders:    parseInt(totals?.total_orders ?? '0'),
    totalRevenue:   parseFloat(totals?.total_revenue ?? '0'),
    todayOrders:    parseInt(todayRow?.today_orders ?? '0'),
    todayRevenue:   parseFloat(todayRow?.today_revenue ?? '0'),
    pendingOrders:  parseInt(pendingRow?.pending_orders ?? '0'),
    totalProducts:  parseInt(productRow?.total_products ?? '0'),
    recentOrders:   recent,
  })
}

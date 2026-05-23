import { NextRequest, NextResponse } from 'next/server'
import { verifySession, getUserStore } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const days = Math.min(30, parseInt(req.nextUrl.searchParams.get('days') ?? '7') || 7)

  const rows = await query<{ day: string; revenue: string; orders: string }>(
    `SELECT
       TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS day,
       COALESCE(SUM(total_amount), 0)::text                  AS revenue,
       COUNT(*)::text                                         AS orders
     FROM orders
     WHERE store_id = $1
       AND payment_status = 'paid'
       AND created_at >= NOW() - ($2 || ' days')::interval
     GROUP BY day
     ORDER BY day ASC`,
    [store.id, days]
  )

  // Fill gaps so every day in the range is present
  const result: { day: string; revenue: number; orders: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const found = rows.find((r) => r.day === key)
    result.push({
      day:     key,
      revenue: found ? parseFloat(found.revenue) : 0,
      orders:  found ? parseInt(found.orders)    : 0,
    })
  }

  return NextResponse.json({ data: result, days })
}

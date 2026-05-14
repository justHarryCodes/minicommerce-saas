import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { query } from '@/lib/db'

export async function GET() {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await query(
    `SELECT
       sp.id, sp.type, sp.amount, sp.payment_reference, sp.payment_status,
       sp.plan_id, sp.created_at,
       s.name  AS store_name,
       s.slug  AS store_slug,
       s.id    AS store_id,
       p.name  AS plan_name
     FROM subscription_payments sp
     JOIN stores s ON s.id = sp.store_id
     LEFT JOIN plans p ON p.id = sp.plan_id
     WHERE sp.payment_method = 'bank_transfer'
     ORDER BY sp.created_at DESC`,
    []
  )
  return NextResponse.json({ data: rows })
}

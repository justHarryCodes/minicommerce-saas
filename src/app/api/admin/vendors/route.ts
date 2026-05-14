import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { query } from '@/lib/db'

export async function GET() {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const vendors = await query<{
    id: string
    name: string
    slug: string
    owner_email: string | null
    primary_category: string | null
    status: string
    subscription_status: string
    subscription_expires_at: string | null
    nin_verified: boolean
    nin_number: string | null
    is_active: boolean
    created_at: string
  }>(
    `SELECT
       id, name, slug, owner_email, primary_category,
       status, subscription_status, subscription_expires_at,
       nin_verified, nin_number, is_active, created_at
     FROM stores
     ORDER BY created_at DESC`,
    []
  )

  const counts = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*) as count FROM stores GROUP BY status`,
    []
  )

  const subRevenue = await query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM subscription_payments
     WHERE payment_status = 'paid'
       AND created_at >= date_trunc('month', NOW())`,
    []
  )

  return NextResponse.json({
    data: {
      vendors,
      counts: Object.fromEntries(counts.map((c) => [c.status, parseInt(c.count)])),
      revenue_this_month: Number(subRevenue[0]?.total ?? 0),
    },
  })
}

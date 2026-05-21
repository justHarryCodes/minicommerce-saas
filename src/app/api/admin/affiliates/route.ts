import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { query } from '@/lib/db'

export async function GET() {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const affiliates = await query<{
    id: string
    name: string
    email: string
    referral_code: string
    earnings_total: number
    payout_balance: number
    total_referrals: number
    active_referrals: number
    is_active: boolean
    created_at: string
    pending_payouts: number
  }>(
    `SELECT a.id, a.name, a.email, a.referral_code,
            a.earnings_total, a.payout_balance,
            a.total_referrals, a.active_referrals,
            a.is_active, a.created_at,
            COUNT(ap.id) FILTER (WHERE ap.status = 'pending') AS pending_payouts
     FROM affiliates a
     LEFT JOIN affiliate_payouts ap ON ap.affiliate_id = a.id
     GROUP BY a.id
     ORDER BY a.created_at DESC`
  )

  return NextResponse.json({ affiliates })
}

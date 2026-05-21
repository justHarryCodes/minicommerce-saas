import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { query, queryOne } from '@/lib/db'

interface Params { params: Promise<{ affiliateId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { affiliateId } = await params

  const affiliate = await queryOne<{
    id: string; name: string; email: string; referral_code: string
    earnings_total: number; payout_balance: number; total_referrals: number
    active_referrals: number; is_active: boolean; bank_name: string | null
    account_number: string | null; account_name: string | null; created_at: string
  }>(
    `SELECT id, name, email, referral_code, earnings_total, payout_balance,
            total_referrals, active_referrals, is_active,
            bank_name, account_number, account_name, created_at
     FROM affiliates WHERE id = $1`,
    [affiliateId]
  )
  if (!affiliate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const referrals = await query(
    `SELECT ar.id, ar.store_id, s.name AS store_name, ar.status,
            ar.commission_amount, ar.created_at, ar.rewarded_at
     FROM affiliate_referrals ar
     JOIN stores s ON s.id = ar.store_id
     WHERE ar.affiliate_id = $1
     ORDER BY ar.created_at DESC`,
    [affiliateId]
  )

  const payouts = await query(
    `SELECT id, amount, status, bank_name, account_number, account_name,
            admin_note, requested_at, processed_at
     FROM affiliate_payouts WHERE affiliate_id = $1
     ORDER BY requested_at DESC`,
    [affiliateId]
  )

  return NextResponse.json({ affiliate, referrals, payouts })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { affiliateId } = await params
  const { isActive } = await req.json()

  await queryOne(
    'UPDATE affiliates SET is_active = $1, updated_at = NOW() WHERE id = $2',
    [isActive, affiliateId]
  )

  return NextResponse.json({ ok: true })
}

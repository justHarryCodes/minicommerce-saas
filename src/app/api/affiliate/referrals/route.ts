import { NextResponse } from 'next/server'
import { verifyAffiliateSession } from '@/lib/affiliate-auth'
import { query } from '@/lib/db'

export async function GET() {
  const session = await verifyAffiliateSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const referrals = await query<{
    id: string
    store_id: string
    store_name: string
    store_slug: string
    status: string
    commission_amount: number | null
    created_at: string
    rewarded_at: string | null
  }>(
    `SELECT ar.id, ar.store_id, s.name AS store_name, s.slug AS store_slug,
            ar.status, ar.commission_amount, ar.created_at, ar.rewarded_at
     FROM affiliate_referrals ar
     JOIN stores s ON s.id = ar.store_id
     WHERE ar.affiliate_id = $1
     ORDER BY ar.created_at DESC`,
    [session.id]
  )

  return NextResponse.json({ referrals })
}

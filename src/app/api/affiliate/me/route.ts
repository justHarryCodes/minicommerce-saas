import { NextResponse } from 'next/server'
import { verifyAffiliateSession } from '@/lib/affiliate-auth'
import { queryOne } from '@/lib/db'
import { z } from 'zod'

const BankSchema = z.object({
  bankName:      z.string().min(1).max(100).nullable().optional(),
  accountNumber: z.string().min(10).max(20).nullable().optional(),
  accountName:   z.string().min(1).max(150).nullable().optional(),
})

interface AffiliateProfile {
  id: string
  email: string
  name: string
  referral_code: string
  earnings_total: number
  payout_balance: number
  total_referrals: number
  active_referrals: number
  bank_name: string | null
  account_number: string | null
  account_name: string | null
  created_at: string
}

export async function GET() {
  const session = await verifyAffiliateSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const affiliate = await queryOne<AffiliateProfile>(
    `SELECT id, email, name, referral_code, earnings_total, payout_balance,
            total_referrals, active_referrals, bank_name, account_number, account_name, created_at
     FROM affiliates WHERE id = $1 AND is_active = true`,
    [session.id]
  )

  if (!affiliate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ affiliate })
}

export async function PATCH(req: Request) {
  const session = await verifyAffiliateSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = BankSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }
  const { bankName, accountNumber, accountName } = parsed.data

  await queryOne(
    `UPDATE affiliates SET bank_name = $1, account_number = $2, account_name = $3, updated_at = NOW()
     WHERE id = $4`,
    [bankName ?? null, accountNumber ?? null, accountName ?? null, session.id]
  )

  return NextResponse.json({ ok: true })
}

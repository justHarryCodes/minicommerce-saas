import { NextRequest, NextResponse } from 'next/server'
import { verifyAffiliateSession } from '@/lib/affiliate-auth'
import { query, queryOne, withTransaction } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const MIN_PAYOUT = 5000

const PayoutSchema = z.object({
  amount:        z.number().int().min(MIN_PAYOUT),
  bankName:      z.string().min(1).max(100),
  accountNumber: z.string().min(10).max(20),
  accountName:   z.string().min(1).max(150),
})

export async function GET() {
  const session = await verifyAffiliateSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payouts = await query<{
    id: string
    amount: number
    status: string
    bank_name: string | null
    account_number: string | null
    account_name: string | null
    admin_note: string | null
    requested_at: string
    processed_at: string | null
  }>(
    `SELECT id, amount, status, bank_name, account_number, account_name,
            admin_note, requested_at, processed_at
     FROM affiliate_payouts WHERE affiliate_id = $1
     ORDER BY requested_at DESC`,
    [session.id]
  )

  return NextResponse.json({ payouts })
}

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, {
    key: 'rl:affiliate-payout',
    max: 5,
    window: 3600,
    message: 'Too many payout requests. Please wait before trying again.',
  })
  if (limited) return limited

  const session = await verifyAffiliateSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = PayoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }
  const { amount, bankName, accountNumber, accountName } = parsed.data

  const affiliate = await queryOne<{ payout_balance: number }>(
    'SELECT payout_balance FROM affiliates WHERE id = $1 AND is_active = true',
    [session.id]
  )

  if (!affiliate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (affiliate.payout_balance < amount) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  const pendingPayout = await queryOne(
    `SELECT id FROM affiliate_payouts WHERE affiliate_id = $1 AND status = 'pending'`,
    [session.id]
  )
  if (pendingPayout) {
    return NextResponse.json({ error: 'You already have a pending payout request' }, { status: 400 })
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE affiliates SET payout_balance = payout_balance - $1, bank_name = $2,
       account_number = $3, account_name = $4, updated_at = NOW() WHERE id = $5`,
      [amount, bankName, accountNumber, accountName, session.id]
    )
    await client.query(
      `INSERT INTO affiliate_payouts (affiliate_id, amount, status, bank_name, account_number, account_name)
       VALUES ($1, $2, 'pending', $3, $4, $5)`,
      [session.id, amount, bankName, accountNumber, accountName]
    )
  })

  return NextResponse.json({ ok: true })
}

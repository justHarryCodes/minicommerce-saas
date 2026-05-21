import { NextResponse } from 'next/server'
import { verifyAffiliateSession } from '@/lib/affiliate-auth'
import { query, queryOne } from '@/lib/db'

const MIN_PAYOUT = 5000

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

export async function POST(req: Request) {
  const session = await verifyAffiliateSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount, bankName, accountNumber, accountName } = await req.json()

  if (!amount || typeof amount !== 'number' || amount < MIN_PAYOUT) {
    return NextResponse.json({ error: `Minimum payout is ₦${MIN_PAYOUT.toLocaleString()}` }, { status: 400 })
  }

  if (!bankName || !accountNumber || !accountName) {
    return NextResponse.json({ error: 'Bank details are required' }, { status: 400 })
  }

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

  // Deduct balance and create payout record atomically
  await query(
    `UPDATE affiliates SET payout_balance = payout_balance - $1, updated_at = NOW() WHERE id = $2`,
    [amount, session.id]
  )

  await query(
    `INSERT INTO affiliate_payouts (affiliate_id, amount, status, bank_name, account_number, account_name)
     VALUES ($1, $2, 'pending', $3, $4, $5)`,
    [session.id, amount, bankName, accountNumber, accountName]
  )

  // Save bank details to affiliate profile for future requests
  await query(
    `UPDATE affiliates SET bank_name = $1, account_number = $2, account_name = $3 WHERE id = $4`,
    [bankName, accountNumber, accountName, session.id]
  )

  return NextResponse.json({ ok: true })
}

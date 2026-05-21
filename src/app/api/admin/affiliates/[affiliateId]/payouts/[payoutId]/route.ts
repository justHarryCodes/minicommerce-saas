import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession, logAdminAction } from '@/lib/admin-auth'
import { query, queryOne } from '@/lib/db'
import { z } from 'zod'

const Schema = z.object({
  action:    z.enum(['approve', 'reject', 'mark_paid']),
  adminNote: z.string().max(500).optional(),
})

interface Params { params: Promise<{ affiliateId: string; payoutId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { affiliateId, payoutId } = await params

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 422 })

  const { action, adminNote } = parsed.data

  const payout = await queryOne<{ id: string; status: string; amount: number; affiliate_id: string }>(
    'SELECT id, status, amount, affiliate_id FROM affiliate_payouts WHERE id = $1 AND affiliate_id = $2',
    [payoutId, affiliateId]
  )
  if (!payout) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (action === 'mark_paid') {
    if (payout.status !== 'approved') {
      return NextResponse.json({ error: 'Can only mark approved payouts as paid' }, { status: 400 })
    }
    await query(
      `UPDATE affiliate_payouts SET status = 'paid', processed_at = NOW() WHERE id = $1`,
      [payoutId]
    )
    await logAdminAction({
      adminUid: admin.firebaseUid,
      adminEmail: admin.email,
      action: 'affiliate_payout_paid',
      targetType: 'affiliate_payout',
      targetId: payoutId,
      details: { amount: payout.amount },
    })
    return NextResponse.json({ ok: true })
  }

  if (payout.status !== 'pending') {
    return NextResponse.json({ error: 'Payout already processed' }, { status: 400 })
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected'

  await query(
    `UPDATE affiliate_payouts
     SET status = $1, admin_note = $2, processed_at = NOW()
     WHERE id = $3`,
    [newStatus, adminNote ?? null, payoutId]
  )

  // If rejected, refund the balance
  if (action === 'reject') {
    await query(
      'UPDATE affiliates SET payout_balance = payout_balance + $1, updated_at = NOW() WHERE id = $2',
      [payout.amount, affiliateId]
    )
  }

  await logAdminAction({
    adminUid: admin.firebaseUid,
    adminEmail: admin.email,
    action: `affiliate_payout_${newStatus}`,
    targetType: 'affiliate_payout',
    targetId: payoutId,
    details: { amount: payout.amount, adminNote },
  })

  return NextResponse.json({ ok: true })
}

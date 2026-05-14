import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { query } from '@/lib/db'
import { z } from 'zod'

const Schema = z.object({
  bank_name:      z.string().min(1).max(100),
  account_number: z.string().min(6).max(20),
  account_name:   z.string().min(2).max(150),
  sort_order:     z.number().int().optional().default(0),
})

export async function GET() {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accounts = await query(
    'SELECT * FROM platform_bank_accounts ORDER BY sort_order, created_at',
    []
  )
  return NextResponse.json({ data: accounts })
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const d = parsed.data
  const rows = await query(
    `INSERT INTO platform_bank_accounts (bank_name, account_number, account_name, sort_order)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [d.bank_name, d.account_number, d.account_name, d.sort_order]
  )
  return NextResponse.json({ data: rows[0] }, { status: 201 })
}

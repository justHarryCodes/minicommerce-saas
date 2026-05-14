import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { query, queryOne } from '@/lib/db'
import { z } from 'zod'

const Schema = z.object({
  bank_name:      z.string().min(1).max(100).optional(),
  account_number: z.string().min(6).max(20).optional(),
  account_name:   z.string().min(2).max(150).optional(),
  is_active:      z.boolean().optional(),
  sort_order:     z.number().int().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const d = parsed.data
  const fields: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (d.bank_name      !== undefined) { fields.push(`bank_name = $${idx++}`);      values.push(d.bank_name) }
  if (d.account_number !== undefined) { fields.push(`account_number = $${idx++}`); values.push(d.account_number) }
  if (d.account_name   !== undefined) { fields.push(`account_name = $${idx++}`);   values.push(d.account_name) }
  if (d.is_active      !== undefined) { fields.push(`is_active = $${idx++}`);      values.push(d.is_active) }
  if (d.sort_order     !== undefined) { fields.push(`sort_order = $${idx++}`);     values.push(d.sort_order) }

  if (fields.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  values.push(id)
  const rows = await query(
    `UPDATE platform_bank_accounts SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: rows[0] })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await queryOne('SELECT id FROM platform_bank_accounts WHERE id = $1', [id])
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await query('DELETE FROM platform_bank_accounts WHERE id = $1', [id])
  return NextResponse.json({ success: true })
}

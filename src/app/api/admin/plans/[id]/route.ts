import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession, logAdminAction } from '@/lib/admin-auth'
import { query, queryOne } from '@/lib/db'
import { z } from 'zod'

const UpdateSchema = z.object({
  name:          z.string().min(1).max(80).optional(),
  description:   z.string().max(200).optional(),
  price_monthly: z.number().int().min(0).optional(),
  max_products:  z.number().int().min(1).optional(),
  is_active:     z.boolean().optional(),
  sort_order:    z.number().int().min(0).optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const plan = await queryOne<{ id: string; name: string }>(
    'SELECT id, name FROM plans WHERE id = $1',
    [id]
  )
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const d = parsed.data
  const sets: string[] = []
  const vals: unknown[] = []
  let i = 1

  if (d.name !== undefined)          { sets.push(`name = $${i++}`);          vals.push(d.name) }
  if (d.description !== undefined)   { sets.push(`description = $${i++}`);   vals.push(d.description) }
  if (d.price_monthly !== undefined) { sets.push(`price_monthly = $${i++}`); vals.push(d.price_monthly) }
  if (d.max_products !== undefined)  { sets.push(`max_products = $${i++}`);  vals.push(d.max_products) }
  if (d.is_active !== undefined)     { sets.push(`is_active = $${i++}`);     vals.push(d.is_active) }
  if (d.sort_order !== undefined)    { sets.push(`sort_order = $${i++}`);    vals.push(d.sort_order) }

  if (sets.length === 0) return NextResponse.json({ success: true })

  vals.push(id)
  await query(`UPDATE plans SET ${sets.join(', ')} WHERE id = $${i}`, vals)

  await logAdminAction({
    adminUid: admin.firebaseUid,
    adminEmail: admin.email,
    action: 'update_plan',
    targetType: 'plan',
    targetId: id,
    details: { plan_name: plan.name, changes: d },
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await query('DELETE FROM plans WHERE id = $1', [id])

  await logAdminAction({
    adminUid: admin.firebaseUid,
    adminEmail: admin.email,
    action: 'delete_plan',
    targetType: 'plan',
    targetId: id,
  })

  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession, logAdminAction } from '@/lib/admin-auth'
import { query } from '@/lib/db'
import { z } from 'zod'

const PlanSchema = z.object({
  name:          z.string().min(1).max(80),
  description:   z.string().max(200).optional(),
  price_monthly: z.number().int().min(0),
  max_products:  z.number().int().min(1),
  sort_order:    z.number().int().min(0).optional(),
})

export async function GET() {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const plans = await query(
    `SELECT id, name, description, price_monthly, max_products, is_active, sort_order, created_at
     FROM plans ORDER BY sort_order, created_at`,
    []
  )
  return NextResponse.json({ data: plans })
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = PlanSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { name, description, price_monthly, max_products, sort_order = 0 } = parsed.data

  const [plan] = await query<{ id: string }>(
    `INSERT INTO plans (name, description, price_monthly, max_products, sort_order)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [name, description ?? null, price_monthly, max_products, sort_order]
  )

  await logAdminAction({
    adminUid: admin.firebaseUid,
    adminEmail: admin.email,
    action: 'create_plan',
    targetType: 'plan',
    targetId: plan.id,
    details: { name, price_monthly, max_products },
  })

  return NextResponse.json({ success: true, id: plan.id }, { status: 201 })
}

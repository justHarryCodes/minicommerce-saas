import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { queryOne, query } from '@/lib/db'
import { z } from 'zod'

const CreateSchema = z.object({
  code:             z.string().min(2).max(30).toUpperCase(),
  discount_type:    z.enum(['percentage', 'fixed']),
  discount_value:   z.number().positive(),
  min_order_amount: z.number().min(0).default(0),
  max_uses:         z.number().int().positive().optional(),
  expires_at:       z.string().datetime().optional(),
})

async function getStore(uid: string) {
  return queryOne<{ id: string }>('SELECT id FROM stores WHERE owner_id = $1 AND is_active = true', [uid])
}

export async function GET() {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  const coupons = await query(
    `SELECT id, code, discount_type, discount_value, min_order_amount,
            max_uses, uses_count, expires_at, is_active, created_at
     FROM coupons WHERE store_id = $1 ORDER BY created_at DESC`,
    [store.id]
  )
  return NextResponse.json({ data: coupons })
}

export async function POST(req: NextRequest) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const d = parsed.data
  if (d.discount_type === 'percentage' && d.discount_value > 100) {
    return NextResponse.json({ error: 'Percentage discount cannot exceed 100' }, { status: 422 })
  }

  const existing = await queryOne('SELECT id FROM coupons WHERE store_id = $1 AND code = $2', [store.id, d.code])
  if (existing) return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 })

  const [coupon] = await query<{ id: string }>(
    `INSERT INTO coupons (store_id, code, discount_type, discount_value, min_order_amount, max_uses, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [store.id, d.code, d.discount_type, d.discount_value, d.min_order_amount, d.max_uses ?? null, d.expires_at ?? null]
  )
  return NextResponse.json({ success: true, id: coupon.id }, { status: 201 })
}

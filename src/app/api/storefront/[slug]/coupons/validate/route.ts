import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'

interface RouteParams { params: Promise<{ slug: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  const { code, order_amount } = await req.json()
  if (!code || !order_amount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const store = await queryOne<{ id: string }>('SELECT id FROM stores WHERE slug = $1 AND is_active = true', [slug])
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const coupon = await queryOne<{
    id: string; discount_type: string; discount_value: number
    min_order_amount: number; max_uses: number | null; uses_count: number; expires_at: string | null
  }>(
    `SELECT id, discount_type, discount_value, min_order_amount, max_uses, uses_count, expires_at
     FROM coupons WHERE store_id = $1 AND code = $2 AND is_active = true`,
    [store.id, code.toUpperCase()]
  )

  if (!coupon) return NextResponse.json({ valid: false, error: 'Invalid or inactive coupon code' })
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'Coupon has expired' })
  }
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return NextResponse.json({ valid: false, error: 'Coupon usage limit reached' })
  }
  if (Number(order_amount) < Number(coupon.min_order_amount)) {
    return NextResponse.json({ valid: false, error: `Minimum order amount is ₦${Number(coupon.min_order_amount).toLocaleString()}` })
  }

  const discount_amount = coupon.discount_type === 'percentage'
    ? Math.round((Number(order_amount) * Number(coupon.discount_value)) / 100)
    : Math.min(Number(coupon.discount_value), Number(order_amount))

  return NextResponse.json({
    valid: true,
    coupon_id: coupon.id,
    discount_amount,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
  })
}

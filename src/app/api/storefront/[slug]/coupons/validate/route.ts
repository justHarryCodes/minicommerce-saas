import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { checkCoupon } from '@/lib/coupons'

interface RouteParams { params: Promise<{ slug: string }> }

// Preview only — the order API re-checks the coupon against server-side
// prices when the order is actually placed.
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  const { code, order_amount } = await req.json()
  if (!code || !order_amount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const store = await queryOne<{ id: string }>('SELECT id FROM stores WHERE slug = $1 AND is_active = true', [slug])
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const result = await checkCoupon(store.id, String(code), Number(order_amount))
  if (!result.valid) return NextResponse.json({ valid: false, error: result.error })

  return NextResponse.json({
    valid: true,
    coupon_id: result.coupon.id,
    discount_amount: result.discount,
    discount_type: result.coupon.discount_type,
    discount_value: result.coupon.discount_value,
  })
}

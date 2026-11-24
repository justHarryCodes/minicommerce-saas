import { NextRequest, NextResponse } from 'next/server'
import { activeCouponCount, freeLimitsFor, planLimitResponse, requireFeature } from "@/lib/plan";
import { verifySession } from '@/lib/auth'
import { queryOne, query } from '@/lib/db'

interface RouteParams { params: Promise<{ id: string }> }

async function getStore(uid: string) {
  return queryOne<{ id: string }>('SELECT id FROM stores WHERE owner_id = $1 AND is_active = true', [uid])
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  const denied = await requireFeature(store.id, "coupons");
  if (denied) return denied;
  const { id } = await params
  const body = await req.json()
  if (body.is_active === true) {
    const limits = await freeLimitsFor(store.id)
    const already = await queryOne('SELECT 1 FROM coupons WHERE id = $1 AND store_id = $2 AND is_active = true', [id, store.id])
    if (limits && !already && (await activeCouponCount(store.id)) >= limits.activeCoupons) {
      return planLimitResponse('The Free plan includes 1 active discount code. Switch your other code off, or upgrade to Pro for unlimited codes.')
    }
  }
  if (typeof body.is_active === 'boolean') {
    await query('UPDATE coupons SET is_active = $1 WHERE id = $2 AND store_id = $3', [body.is_active, id, store.id])
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  const { id } = await params
  await query('DELETE FROM coupons WHERE id = $1 AND store_id = $2', [id, store.id])
  return NextResponse.json({ success: true })
}

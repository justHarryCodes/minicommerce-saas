import { NextResponse } from 'next/server'
import { verifySession, getUserStore } from '@/lib/auth'
import { getEffectivePlan } from '@/lib/plan'

export async function GET() {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const effectivePlan = await getEffectivePlan(store.id)

  return NextResponse.json({
    ...store,
    plan: {
      name: effectivePlan.name,
      maxProducts: effectivePlan.max_products,
      maxReels: effectivePlan.max_reels,
      isPro: effectivePlan.isPro,
    },
  })
}

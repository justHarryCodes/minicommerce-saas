import { redirect } from 'next/navigation'
import { verifySession, getUserStore } from '@/lib/auth'
import { queryMany } from '@/lib/db'
import { freeLimitsFor, getEffectivePlan, hasFeature } from '@/lib/plan'
import FreeLimitNote from '@/components/dashboard/FreeLimitNote'
import { ensureGrowthSchema } from '@/lib/growth-schema'
import { UpgradePrompt } from '@/components/dashboard/UpgradePrompt'
import CouponsClient from './CouponsClient'

export const metadata = { title: 'Coupons' }

export default async function CouponsPage() {
  const user = await verifySession()
  if (!user) redirect('/auth/login')
  const store = await getUserStore(user.firebaseUid)
  if (!store) redirect('/onboarding')

  const effectivePlan = await getEffectivePlan(store.id)
  if (!(await hasFeature(store.id, "coupons"))) {
    return <UpgradePrompt feature="Coupons" />
  }

  await ensureGrowthSchema()
  const coupons = await queryMany<{
    id: string; code: string; discount_type: string; discount_value: number
    min_order_amount: number; max_uses: number | null; uses_count: number
    expires_at: string | null; is_active: boolean; created_at: string
  }>("SELECT * FROM coupons WHERE store_id = $1 AND kind = 'standard' ORDER BY created_at DESC", [store.id])

  const limits = await freeLimitsFor(store.id)
  const now = Date.now()
  const active = coupons.filter((c) => c.is_active && (!c.expires_at || new Date(c.expires_at).getTime() > now)).length
  return (
    <>
      {limits && (
        <FreeLimitNote full={active >= limits.activeCoupons}>
          <strong>Free plan:</strong> {limits.activeCoupons} active discount code at a time ({active} in use). Go Pro for as many codes as you like, one for each influencer or sale.
        </FreeLimitNote>
      )}
      <CouponsClient initialCoupons={coupons} />
    </>
  )
}

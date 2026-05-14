import { redirect } from 'next/navigation'
import { verifySession, getUserStore } from '@/lib/auth'
import { queryMany } from '@/lib/db'
import CouponsClient from './CouponsClient'

export const metadata = { title: 'Coupons' }

export default async function CouponsPage() {
  const user = await verifySession()
  if (!user) redirect('/auth/login')
  const store = await getUserStore(user.firebaseUid)
  if (!store) redirect('/onboarding')

  const coupons = await queryMany<{
    id: string; code: string; discount_type: string; discount_value: number
    min_order_amount: number; max_uses: number | null; uses_count: number
    expires_at: string | null; is_active: boolean; created_at: string
  }>('SELECT * FROM coupons WHERE store_id = $1 ORDER BY created_at DESC', [store.id])

  return <CouponsClient initialCoupons={coupons} />
}

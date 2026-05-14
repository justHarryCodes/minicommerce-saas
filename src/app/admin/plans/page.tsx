import { verifyAdminSession } from '@/lib/admin-auth'
import { query } from '@/lib/db'
import PlansClient from './PlansClient'

export const metadata = { title: 'Plans' }

export default async function PlansPage() {
  await verifyAdminSession()

  const plans = await query<{
    id: string
    name: string
    description: string | null
    price_monthly: number
    max_products: number
    is_active: boolean
    sort_order: number
    created_at: string
  }>('SELECT * FROM plans ORDER BY sort_order, created_at', [])

  return <PlansClient initialPlans={plans} />
}

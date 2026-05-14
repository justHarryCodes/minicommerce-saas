import { redirect } from 'next/navigation'
import { verifySession, getUserStore } from '@/lib/auth'
import { queryMany } from '@/lib/db'
import ReviewsClient from './ReviewsClient'

export const metadata = { title: 'Reviews' }

export default async function ReviewsPage() {
  const user = await verifySession()
  if (!user) redirect('/auth/login')
  const store = await getUserStore(user.firebaseUid)
  if (!store) redirect('/onboarding')

  const reviews = await queryMany<{
    id: string; customer_name: string; customer_email: string | null
    rating: number; body: string | null; is_approved: boolean; created_at: string
    product_name: string; product_slug: string
  }>(
    `SELECT r.*, p.name as product_name, p.slug as product_slug
     FROM reviews r JOIN products p ON p.id = r.product_id
     WHERE r.store_id = $1 ORDER BY r.created_at DESC`,
    [store.id]
  )

  return <ReviewsClient initialReviews={reviews} />
}

import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { queryOne, query } from '@/lib/db'

export async function GET() {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await queryOne<{ id: string }>('SELECT id FROM stores WHERE owner_id = $1 AND is_active = true', [user.firebaseUid])
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  const reviews = await query(
    `SELECT r.id, r.customer_name, r.customer_email, r.rating, r.body, r.is_approved, r.created_at,
            p.name as product_name, p.slug as product_slug
     FROM reviews r
     JOIN products p ON p.id = r.product_id
     WHERE r.store_id = $1
     ORDER BY r.created_at DESC`,
    [store.id]
  )
  return NextResponse.json({ data: reviews })
}

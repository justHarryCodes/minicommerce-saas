import { NextRequest, NextResponse } from 'next/server'
import { queryOne, query } from '@/lib/db'
import { z } from 'zod'

interface RouteParams { params: Promise<{ slug: string }> }

const ReviewSchema = z.object({
  product_id:     z.string().uuid(),
  customer_name:  z.string().min(2).max(80),
  customer_email: z.string().email().optional(),
  rating:         z.number().int().min(1).max(5),
  body:           z.string().max(1000).optional(),
})

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('product_id')
  if (!productId) return NextResponse.json({ error: 'product_id required' }, { status: 400 })

  const store = await queryOne<{ id: string }>('SELECT id FROM stores WHERE slug = $1', [slug])
  if (!store) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const reviews = await query(
    `SELECT id, customer_name, rating, body, created_at
     FROM reviews WHERE product_id = $1 AND store_id = $2 AND is_approved = true
     ORDER BY created_at DESC LIMIT 50`,
    [productId, store.id]
  )
  const stats = await queryOne<{ avg_rating: string; total: string }>(
    `SELECT AVG(rating)::numeric(3,1) as avg_rating, COUNT(*) as total
     FROM reviews WHERE product_id = $1 AND store_id = $2 AND is_approved = true`,
    [productId, store.id]
  )
  return NextResponse.json({
    data: reviews,
    avg_rating: Number(stats?.avg_rating ?? 0),
    total: Number(stats?.total ?? 0),
  })
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  const body = await req.json()
  const parsed = ReviewSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const store = await queryOne<{ id: string }>('SELECT id FROM stores WHERE slug = $1 AND is_active = true', [slug])
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const d = parsed.data
  await query(
    `INSERT INTO reviews (store_id, product_id, customer_name, customer_email, rating, body)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [store.id, d.product_id, d.customer_name, d.customer_email ?? null, d.rating, d.body ?? null]
  )
  return NextResponse.json({ success: true, message: 'Review submitted and pending approval' }, { status: 201 })
}

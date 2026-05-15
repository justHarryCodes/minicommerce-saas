import { NextRequest, NextResponse } from 'next/server'
import { queryOne, query } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const q = req.nextUrl.searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const store = await queryOne<{ id: string }>(
    'SELECT id FROM stores WHERE slug = $1 AND is_active = true',
    [slug]
  )
  if (!store) return NextResponse.json({ results: [] })

  const pattern = `%${q}%`
  const results = await query<{
    id: string
    name: string
    slug: string
    price: number
    compare_price: number | null
    images: string[]
    image_url: string | null
    stock_quantity: number
  }>(
    `SELECT id, name, slug, price, compare_price, images, image_url, stock_quantity
     FROM products
     WHERE store_id = $1
       AND is_active = true
       AND stock_quantity > 0
       AND (name ILIKE $2 OR description ILIKE $2)
     ORDER BY
       CASE WHEN name ILIKE $2 THEN 0 ELSE 1 END,
       sort_order, created_at DESC
     LIMIT 24`,
    [store.id, pattern]
  )

  return NextResponse.json({ results })
}

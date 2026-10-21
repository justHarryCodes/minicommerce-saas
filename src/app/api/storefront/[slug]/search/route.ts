import { NextRequest, NextResponse } from 'next/server'
import { queryOne, query } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'

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
    has_sizes: boolean
  }>(
    `SELECT id, name, slug, price, compare_price, images, image_url, stock_quantity, has_sizes
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

/** Record a settled search (sent ~1.5s after typing stops) for store analytics. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const limited = await checkRateLimit(req, { key: 'rl:search-log', max: 60, window: 600 })
  if (limited) return limited
  const { slug } = await params
  const body = await req.json().catch(() => ({}))
  const q = typeof body.q === 'string' ? body.q.trim().toLowerCase().slice(0, 100) : ''
  const results = Number.isFinite(Number(body.results)) ? Math.max(0, Math.min(1000, Math.round(Number(body.results)))) : 0
  if (q.length < 2) return NextResponse.json({ ok: true })

  const store = await queryOne<{ id: string }>('SELECT id FROM stores WHERE slug = $1 AND is_active = true', [slug])
  if (!store) return NextResponse.json({ ok: true })
  await query('INSERT INTO search_queries (store_id, query, results) VALUES ($1, $2, $3)', [store.id, q, results]).catch(() => {})
  return NextResponse.json({ ok: true })
}

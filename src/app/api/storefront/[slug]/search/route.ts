import { NextRequest, NextResponse } from 'next/server'
import { queryOne, query } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { searchProducts } from '@/lib/storefront-search'

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

  const rows = await searchProducts(store.id, q, 24)
  const results = rows.map((p) => ({
    id: p.id, name: p.name, slug: p.slug, price: p.price, compare_price: p.compare_price ?? null,
    images: (p.images ?? []).slice(0, 1), image_url: p.image_url ?? null, stock_quantity: p.stock_quantity,
    has_sizes: p.has_sizes ?? false, is_bookable: p.is_bookable ?? false, category_name: (p as { category_name?: string }).category_name ?? null,
  }))

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

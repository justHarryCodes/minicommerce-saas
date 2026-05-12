import { NextRequest, NextResponse } from 'next/server'
import { queryOne, query, rowsToCamel, toCamel } from '@/lib/db'
import { cacheGet, cacheSet, CacheKey } from '@/lib/redis'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const cacheKey = CacheKey.store(slug)
  const cached = await cacheGet(cacheKey)
  if (cached) return NextResponse.json({ data: cached })

  const store = await queryOne('SELECT * FROM stores WHERE slug=$1 AND is_active=true', [slug])
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  const s = store as Record<string, unknown>

  // Categories (self-referencing table)
  const cats = await query(
    'SELECT * FROM categories WHERE store_id=$1 ORDER BY sort_order, name ASC',
    [s.id]
  )

  const products = await query(
    'SELECT * FROM products WHERE store_id=$1 AND is_active=true ORDER BY sort_order, created_at DESC',
    [s.id]
  )

  const data = {
    store:      toCamel(s),
    categories: rowsToCamel(cats as Record<string, unknown>[]),
    products:   rowsToCamel(products as Record<string, unknown>[]),
  }

  await cacheSet(cacheKey, data, 300)
  return NextResponse.json({ data })
}

// Subcategories are stored in the same `categories` table with a parent_id.
// This route is an alias that forwards to /api/categories with parentId set.
import { NextRequest, NextResponse } from 'next/server'
import { verifySession, getUserStore } from '@/lib/auth'
import { query, queryOne, toCamel } from '@/lib/db'
import { cacheDel, CacheKey } from '@/lib/redis'
import { slugify } from '@/lib/utils'
import { z } from 'zod'

const Schema = z.object({
  categoryId: z.string().uuid(),   // parent category
  name:       z.string().min(1).max(100),
  sortOrder:  z.number().int().optional().default(0),
})

export async function POST(req: NextRequest) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { categoryId, name, sortOrder } = parsed.data

  // Verify parent exists and belongs to this store
  const parent = await queryOne(
    'SELECT id FROM categories WHERE id=$1 AND store_id=$2 AND parent_id IS NULL',
    [categoryId, store.id]
  )
  if (!parent) return NextResponse.json({ error: 'Parent category not found' }, { status: 404 })

  let slug = slugify(name)
  const exists = await queryOne(
    'SELECT id FROM categories WHERE store_id=$1 AND slug=$2 AND parent_id=$3',
    [store.id, slug, categoryId]
  )
  if (exists) slug = `${slug}-${Date.now()}`

  const rows = await query(
    'INSERT INTO categories (store_id, parent_id, name, slug, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [store.id, categoryId, name, slug, sortOrder]
  )

  await cacheDel(CacheKey.categories(store.id))
  return NextResponse.json({ data: toCamel(rows[0] as Record<string, unknown>) }, { status: 201 })
}

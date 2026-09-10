import { NextRequest, NextResponse } from 'next/server'
import { verifySession, getUserStore } from '@/lib/auth'
import { query, queryOne, toCamel } from '@/lib/db'
import { cacheDelPattern } from '@/lib/redis'

type Params = { params: Promise<{ productId: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { productId } = await params
  const row = await queryOne('SELECT * FROM products WHERE id=$1 AND store_id=$2', [productId, store.id])
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: toCamel(row as Record<string, unknown>) })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { productId } = await params
  const body = await req.json()
  const allowed = ['name', 'description', 'short_description', 'price', 'compare_price',
    'stock_quantity', 'category_id', 'subcategory_id', 'image_url', 'images', 'is_active', 'is_featured', 'sort_order']
  const sets: string[] = []; const vals: unknown[] = []; let i = 1

  for (const [key, val] of Object.entries(body)) {
    const col = key.replace(/([A-Z])/g, c => `_${c.toLowerCase()}`)
    if (allowed.includes(col)) { sets.push(`${col}=$${i++}`); vals.push(val) }
  }
  if (!sets.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  sets.push(`updated_at = NOW()`)
  vals.push(productId, store.id)

  const rows = await query(
    `UPDATE products SET ${sets.join(',')} WHERE id=$${i++} AND store_id=$${i} RETURNING *`, vals
  )
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await cacheDelPattern(`products:${store.id}*`)
  return NextResponse.json({ data: toCamel(rows[0] as Record<string, unknown>) })
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { productId } = await params
  await query('DELETE FROM products WHERE id=$1 AND store_id=$2', [productId, store.id])
  await cacheDelPattern(`products:${store.id}*`)
  return NextResponse.json({ ok: true })
}

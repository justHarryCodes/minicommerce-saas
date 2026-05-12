import { NextRequest, NextResponse } from 'next/server'
import { verifySession, getUserStore } from '@/lib/auth'
import { query, queryOne, toCamel } from '@/lib/db'
import { cacheDel, CacheKey } from '@/lib/redis'

type Params = { params: Promise<{ categoryId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { categoryId } = await params
  const cat = await queryOne(
    'SELECT * FROM categories WHERE id = $1 AND store_id = $2',
    [categoryId, store.id]
  )
  if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const rows = await query(
    'UPDATE categories SET name=$1, sort_order=COALESCE($2,sort_order) WHERE id=$3 RETURNING *',
    [body.name ?? (cat as Record<string, unknown>).name, body.sortOrder ?? null, categoryId]
  )
  await cacheDel(CacheKey.categories(store.id))
  return NextResponse.json({ data: toCamel(rows[0] as Record<string, unknown>) })
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { categoryId } = await params
  await query('DELETE FROM categories WHERE id = $1 AND store_id = $2', [categoryId, store.id])
  await cacheDel(CacheKey.categories(store.id))
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { verifySession, getUserStore } from '@/lib/auth'
import { query, toCamel } from '@/lib/db'
import { cacheDel, CacheKey } from '@/lib/redis'

type Params = { params: Promise<{ subcategoryId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { subcategoryId } = await params
  const body = await req.json()
  const rows = await query(
    'UPDATE categories SET name=COALESCE($1,name) WHERE id=$2 AND store_id=$3 AND parent_id IS NOT NULL RETURNING *',
    [body.name, subcategoryId, store.id]
  )
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await cacheDel(CacheKey.categories(store.id))
  return NextResponse.json({ data: toCamel(rows[0] as Record<string, unknown>) })
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getUserStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const { subcategoryId } = await params
  await query(
    'DELETE FROM categories WHERE id=$1 AND store_id=$2 AND parent_id IS NOT NULL',
    [subcategoryId, store.id]
  )
  await cacheDel(CacheKey.categories(store.id))
  return NextResponse.json({ ok: true })
}

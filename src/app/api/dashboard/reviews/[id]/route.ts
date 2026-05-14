import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { queryOne, query } from '@/lib/db'

interface RouteParams { params: Promise<{ id: string }> }

async function getStore(uid: string) {
  return queryOne<{ id: string }>('SELECT id FROM stores WHERE owner_id = $1 AND is_active = true', [uid])
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  const { id } = await params
  const { is_approved } = await req.json()
  await query('UPDATE reviews SET is_approved = $1 WHERE id = $2 AND store_id = $3', [is_approved, id, store.id])
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  const { id } = await params
  await query('DELETE FROM reviews WHERE id = $1 AND store_id = $2', [id, store.id])
  return NextResponse.json({ success: true })
}

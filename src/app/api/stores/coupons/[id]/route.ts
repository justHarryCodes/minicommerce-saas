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
  const body = await req.json()
  if (typeof body.is_active === 'boolean') {
    await query('UPDATE coupons SET is_active = $1 WHERE id = $2 AND store_id = $3', [body.is_active, id, store.id])
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const store = await getStore(user.firebaseUid)
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  const { id } = await params
  await query('DELETE FROM coupons WHERE id = $1 AND store_id = $2', [id, store.id])
  return NextResponse.json({ success: true })
}

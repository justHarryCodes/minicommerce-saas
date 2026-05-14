import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { queryOne, query } from '@/lib/db'
import { z } from 'zod'

const Schema = z.object({
  nin: z.string().regex(/^\d{11}$/, 'NIN must be exactly 11 digits'),
})

export async function PATCH(req: NextRequest) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const store = await queryOne<{ id: string; nin_verified: boolean }>(
    'SELECT id, nin_verified FROM stores WHERE owner_id = $1',
    [user.firebaseUid]
  )
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  if (store.nin_verified) {
    return NextResponse.json({ error: 'NIN already verified' }, { status: 409 })
  }

  await query(
    `UPDATE stores SET nin_number = $1, nin_verified = false, nin_verified_at = NULL, updated_at = NOW() WHERE id = $2`,
    [parsed.data.nin, store.id]
  )

  return NextResponse.json({ success: true })
}

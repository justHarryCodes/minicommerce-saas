import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { queryOne, query, toCamel } from '@/lib/db'
import { cacheDel } from '@/lib/redis'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const user = await verifySession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { storeId } = await params
  const store = await queryOne<{ id: string; slug: string }>(
    'SELECT * FROM stores WHERE id = $1 AND owner_id = $2',
    [storeId, user.firebaseUid]
  )
  if (!store) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  // Allowed camelCase → snake_case mappings
  const fieldMap: Record<string, string> = {
    name: 'name',
    description: 'description',
    logoUrl: 'logo_url',
    phone: 'phone',
    whatsapp: 'whatsapp',
    storefrontThemeMode: 'storefront_theme_mode',
    storefrontAccentColor: 'storefront_accent_color',
    paymentPreference: 'payment_preference',
    bankName: 'bank_name',
    bankAccountNumber: 'bank_account_number',
    bankAccountName: 'bank_account_name',
    paystackPublicKey: 'paystack_public_key',
  }

  const sets: string[] = []
  const vals: unknown[] = []
  let i = 1

  for (const [key, val] of Object.entries(body)) {
    const col = fieldMap[key]
    if (col) {
      sets.push(`${col} = $${i++}`)
      vals.push(val)
    }
  }
  if (!sets.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  vals.push(storeId)
  const rows = await query(
    `UPDATE stores SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
    vals
  )

  // Invalidate cache
  await cacheDel(`store:${store.slug}`)

  return NextResponse.json({ data: toCamel(rows[0] as Record<string, unknown>) })
}

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { queryOne, query, toCamel } from '@/lib/db'
import { cacheDel } from '@/lib/redis'
import { parseZones } from '@/lib/delivery'
import { parseHours } from '@/lib/hours'

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
    storefrontFont: 'storefront_font',
    storefrontCardStyle: 'storefront_card_style',
    aiAssistantEnabled: 'ai_assistant_enabled',
    paymentPreference: 'payment_preference',
    bankName: 'bank_name',
    bankAccountNumber: 'bank_account_number',
    bankAccountName: 'bank_account_name',
    paystackPublicKey: 'paystack_public_key',
    return_policy: 'return_policy',
    deliveryTimeFrame: 'delivery_time_frame',
    deliveryZones: 'delivery_zones',
    freeDeliveryThreshold: 'free_delivery_threshold',
    pickupEnabled: 'pickup_enabled',
    pickupAddress: 'pickup_address',
    podEnabled: 'pod_enabled',
    podDepositPercent: 'pod_deposit_percent',
    customerNotificationsEnabled: 'customer_notifications_enabled',
    lowStockThreshold: 'low_stock_threshold',
    openingHours: 'opening_hours',
    allowPreorders: 'allow_preorders',
    minimumOrder: 'minimum_order',
    prepTimeMinutes: 'prep_time_minutes',
    bookingSlotMinutes: 'booking_slot_minutes',
    bookingBufferMinutes: 'booking_buffer_minutes',
    bookingWindowDays: 'booking_window_days',
    bookingMinNoticeMinutes: 'booking_min_notice_minutes',
  }

  // Normalise the checkout settings — they feed order pricing, so they're
  // never stored as sent.
  const clean: Record<string, (v: unknown) => unknown> = {
    deliveryZones: (v) => JSON.stringify(parseZones(v)),
    freeDeliveryThreshold: (v) => {
      const n = v === '' || v == null ? NaN : Number(v)
      return Number.isFinite(n) && n > 0 ? Math.round(n) : null
    },
    pickupEnabled: (v) => v === true,
    pickupAddress: (v) => (typeof v === 'string' ? v.trim().slice(0, 200) : '') || null,
    podEnabled: (v) => v === true,
    podDepositPercent: (v) => Math.min(90, Math.max(0, Math.round(Number(v) || 0))),
    customerNotificationsEnabled: (v) => v !== false,
    lowStockThreshold: (v) => Math.min(100000, Math.max(0, Math.round(Number(v) || 0))),
    openingHours: (v) => { const h = parseHours(v); return h ? JSON.stringify(h) : null },
    allowPreorders: (v) => v !== false,
    minimumOrder: (v) => { const n = v === '' || v == null ? NaN : Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n) : null },
    prepTimeMinutes: (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? Math.min(1440, n) : null },
    bookingSlotMinutes: (v) => ([15, 30, 60].includes(Number(v)) ? Number(v) : 30),
    bookingBufferMinutes: (v) => Math.min(120, Math.max(0, Math.round(Number(v) || 0))),
    bookingWindowDays: (v) => Math.min(180, Math.max(1, Math.round(Number(v) || 30))),
    bookingMinNoticeMinutes: (v) => Math.min(10080, Math.max(0, Math.round(Number(v) || 0))),
  }

  const sets: string[] = []
  const vals: unknown[] = []
  let i = 1

  for (const [key, raw] of Object.entries(body)) {
    const col = fieldMap[key]
    if (col) {
      let val = raw
      // Short free-text estimate; blank clears it (column is NULL-able, max 60).
      if (key === 'deliveryTimeFrame') {
        const s = typeof raw === 'string' ? raw.trim().slice(0, 60) : ''
        val = s || null
      }
      if (clean[key]) val = clean[key](raw)
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

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession, logAdminAction, getPlatformSettings } from '@/lib/admin-auth'
import { query } from '@/lib/db'
import { z } from 'zod'

const SettingsSchema = z.object({
  require_setup_fee:          z.boolean(),
  setup_fee_amount:           z.number().min(0),
  setup_fee_duration_months:  z.number().min(1).max(24),
  require_subscription:       z.boolean(),
  monthly_fee_amount:         z.number().min(0),
  require_nin_verification:   z.boolean(),
  allow_new_registrations:    z.boolean(),
  require_plan_subscription:  z.boolean(),
})

export async function GET() {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const settings = await getPlatformSettings()
  return NextResponse.json({ data: settings })
}

export async function PUT(req: NextRequest) {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = SettingsSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const s = parsed.data

  // Upsert each setting value
  const entries: [string, unknown][] = [
    ['require_setup_fee',          s.require_setup_fee],
    ['setup_fee_amount',           s.setup_fee_amount],
    ['setup_fee_duration_months',  s.setup_fee_duration_months],
    ['require_subscription',       s.require_subscription],
    ['monthly_fee_amount',         s.monthly_fee_amount],
    ['require_nin_verification',   s.require_nin_verification],
    ['allow_new_registrations',    s.allow_new_registrations],
    ['require_plan_subscription',  s.require_plan_subscription],
  ]

  for (const [key, value] of entries) {
    await query(
      `INSERT INTO platform_settings (key, value, updated_at, updated_by)
       VALUES ($1, $2::jsonb, NOW(), $3)
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
      [key, JSON.stringify(value), admin.firebaseUid]
    )
  }

  await logAdminAction({
    adminUid: admin.firebaseUid,
    adminEmail: admin.email,
    action: 'update_platform_settings',
    details: s as unknown as Record<string, unknown>,
  })

  return NextResponse.json({ success: true })
}

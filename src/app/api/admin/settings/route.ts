import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession, logAdminAction, getPlatformSettings } from '@/lib/admin-auth'
import { query } from '@/lib/db'
import { z } from 'zod'

// Billing is monthly plans only (Admin → Plans); the old setup-fee and
// flat-monthly switches are gone.
const SettingsSchema = z.object({
  require_nin_verification:   z.boolean(),
  allow_new_registrations:    z.boolean(),
  reels_monthly_limit:        z.number().int().min(1).max(500),
  allow_manual_transfers:     z.boolean(),
  yearly_discount_percent:    z.number().int().min(0).max(50),
  setup_reminders_enabled:    z.boolean(),
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
    ['require_nin_verification',   s.require_nin_verification],
    ['allow_new_registrations',    s.allow_new_registrations],
    ['reels_monthly_limit',        s.reels_monthly_limit],
    ['allow_manual_transfers',     s.allow_manual_transfers],
    ['yearly_discount_percent',    s.yearly_discount_percent],
    ['setup_reminders_enabled',    s.setup_reminders_enabled],
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

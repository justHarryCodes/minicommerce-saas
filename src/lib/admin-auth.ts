import { verifySession } from './auth'
import { queryOne, query } from './db'

export interface AdminUser {
  firebaseUid: string
  email: string
  name?: string
  role: 'super_admin' | 'admin'
}

export interface PlatformSettings {
  require_setup_fee: boolean
  setup_fee_amount: number
  setup_fee_duration_months: number
  require_subscription: boolean
  monthly_fee_amount: number
  require_nin_verification: boolean
  allow_new_registrations: boolean
  require_plan_subscription: boolean
}

const SETTING_DEFAULTS: PlatformSettings = {
  require_setup_fee: true,
  setup_fee_amount: 10000,
  setup_fee_duration_months: 2,
  require_subscription: false,
  monthly_fee_amount: 5000,
  require_nin_verification: false,
  allow_new_registrations: true,
  require_plan_subscription: false,
}

// Emails that are automatically granted super_admin on first login.
// Add ADMIN_EMAIL to your .env to override without touching code.
const ADMIN_EMAILS = new Set(
  [process.env.ADMIN_EMAIL, 'support@awarizon.com']
    .filter(Boolean)
    .map((e) => e!.toLowerCase())
)

// Verify the current session belongs to an active admin.
// Auto-seeds the admin_users row on the very first login for recognised admin emails.
export async function verifyAdminSession(): Promise<AdminUser | null> {
  const session = await verifySession()
  if (!session) return null

  let row = await queryOne<{
    firebase_uid: string
    email: string
    name: string | null
    role: string
    is_active: boolean
  }>('SELECT * FROM admin_users WHERE firebase_uid = $1 AND is_active = true', [
    session.firebaseUid,
  ])

  // Auto-seed: recognised admin email logging in for the first time
  if (!row && ADMIN_EMAILS.has(session.email.toLowerCase())) {
    await query(
      `INSERT INTO admin_users (firebase_uid, email, name, role)
       VALUES ($1, $2, $3, 'super_admin')
       ON CONFLICT (firebase_uid) DO UPDATE SET is_active = true`,
      [session.firebaseUid, session.email, session.displayName ?? null]
    )
    row = await queryOne<{
      firebase_uid: string
      email: string
      name: string | null
      role: string
      is_active: boolean
    }>('SELECT * FROM admin_users WHERE firebase_uid = $1', [session.firebaseUid])
  }

  if (!row) return null

  return {
    firebaseUid: row.firebase_uid,
    email: row.email,
    name: row.name ?? undefined,
    role: row.role as AdminUser['role'],
  }
}

// Write an entry to the admin audit log
export async function logAdminAction(opts: {
  adminUid: string
  adminEmail: string
  action: string
  targetType?: string
  targetId?: string
  details?: Record<string, unknown>
}) {
  await query(
    `INSERT INTO admin_audit_log (admin_uid, admin_email, action, target_type, target_id, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      opts.adminUid,
      opts.adminEmail,
      opts.action,
      opts.targetType ?? null,
      opts.targetId ?? null,
      opts.details ? JSON.stringify(opts.details) : null,
    ]
  )
}

// Fetch all platform settings, merging with defaults
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const rows = await query<{ key: string; value: unknown }>(
    'SELECT key, value FROM platform_settings',
    []
  )

  const raw = Object.fromEntries(rows.map((r) => [r.key, r.value]))

  return {
    require_setup_fee:
      typeof raw.require_setup_fee === 'boolean'
        ? raw.require_setup_fee
        : raw.require_setup_fee === 'true',
    setup_fee_amount: Number(raw.setup_fee_amount ?? SETTING_DEFAULTS.setup_fee_amount),
    setup_fee_duration_months: Number(
      raw.setup_fee_duration_months ?? SETTING_DEFAULTS.setup_fee_duration_months
    ),
    require_subscription:
      typeof raw.require_subscription === 'boolean'
        ? raw.require_subscription
        : raw.require_subscription === 'true',
    monthly_fee_amount: Number(raw.monthly_fee_amount ?? SETTING_DEFAULTS.monthly_fee_amount),
    require_nin_verification:
      typeof raw.require_nin_verification === 'boolean'
        ? raw.require_nin_verification
        : raw.require_nin_verification === 'true',
    allow_new_registrations:
      typeof raw.allow_new_registrations === 'boolean'
        ? raw.allow_new_registrations
        : raw.allow_new_registrations !== 'false',
    require_plan_subscription:
      typeof raw.require_plan_subscription === 'boolean'
        ? raw.require_plan_subscription
        : raw.require_plan_subscription === 'true',
  }
}

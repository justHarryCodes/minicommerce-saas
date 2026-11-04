import { NextRequest, NextResponse } from 'next/server'
import { invalidateStore } from "@/lib/store-cache";
import { verifyAdminSession, logAdminAction } from '@/lib/admin-auth'
import { query, queryOne } from '@/lib/db'
import { z } from 'zod'
import { invalidatePlanCache } from '@/lib/plan'
import { GIFT_MONTHS, giftPeriod, type GiftMonths } from '@/lib/plan-gift'

const ActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('set_status'), status: z.enum(['active', 'suspended', 'restricted']) }),
  z.object({ action: z.literal('verify_nin') }),
  z.object({ action: z.literal('reject_nin') }),
  z.object({ action: z.literal('confirm_registration') }),
  // Gift a paid plan for 1 / 3 / 6 / 12 months
  z.object({
    action: z.literal('gift_plan'),
    planId: z.string().uuid(),
    months: z.number().int().refine((m): m is GiftMonths => (GIFT_MONTHS as readonly number[]).includes(m), 'Choose 1, 3, 6 or 12 months'),
  }),
  // Back to the Free plan now
  z.object({ action: z.literal('end_plan') }),
])

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const store = await queryOne(
    `SELECT id, name, slug, description, owner_email, primary_category, logo_url,
            status, subscription_status, setup_fee_paid_at, subscription_expires_at,
            nin_number, nin_verified, nin_verified_at, nin_verified_by,
            is_active, created_at, updated_at,
            -- also pull owner_id so caller can fetch Firebase user info
            owner_id
     FROM stores WHERE id = $1`,
    [id]
  )

  if (!store) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const payments = await query(
    `SELECT id, type, amount, payment_status, period_start, period_end, created_at
     FROM subscription_payments WHERE store_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [id]
  )

  const auditLog = await query(
    `SELECT action, details, admin_email, created_at
     FROM admin_audit_log WHERE target_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [id]
  )

  return NextResponse.json({ data: { store, payments, auditLog } })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const admin = await verifyAdminSession()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const body = await req.json()
  const parsed = ActionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const store = await queryOne<{ id: string; name: string; current_plan_id: string | null; plan_expires_at: string | null }>(
    'SELECT id, name, current_plan_id, plan_expires_at FROM stores WHERE id = $1',
    [id]
  )
  if (!store) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const act = parsed.data

  if (act.action === 'set_status') {
    await query('UPDATE stores SET status = $1, updated_at = NOW() WHERE id = $2', [
      act.status,
      id,
    ])
    await logAdminAction({
      adminUid: admin.firebaseUid,
      adminEmail: admin.email,
      action: `set_vendor_status:${act.status}`,
      targetType: 'store',
      targetId: id,
      details: { store_name: store.name, new_status: act.status },
    })
    await invalidateStore(id)
    return NextResponse.json({ success: true, status: act.status })
  }

  if (act.action === 'verify_nin') {
    await query(
      `UPDATE stores
       SET nin_verified = true, nin_verified_at = NOW(), nin_verified_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [admin.firebaseUid, id]
    )
    await logAdminAction({
      adminUid: admin.firebaseUid,
      adminEmail: admin.email,
      action: 'verify_nin',
      targetType: 'store',
      targetId: id,
      details: { store_name: store.name },
    })
    await invalidateStore(id)
    return NextResponse.json({ success: true })
  }

  if (act.action === 'reject_nin') {
    await query(
      `UPDATE stores
       SET nin_verified = false, nin_number = NULL, nin_verified_at = NULL, nin_verified_by = NULL, updated_at = NOW()
       WHERE id = $1`,
      [id]
    )
    await logAdminAction({
      adminUid: admin.firebaseUid,
      adminEmail: admin.email,
      action: 'reject_nin',
      targetType: 'store',
      targetId: id,
      details: { store_name: store.name },
    })
    await invalidateStore(id)
    return NextResponse.json({ success: true })
  }

  if (act.action === 'confirm_registration') {
    await query(
      `UPDATE stores
       SET status = 'active',
           registration_confirmed = true,
           registration_confirmed_at = NOW(),
           registration_confirmed_by = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [admin.firebaseUid, id]
    )
    await logAdminAction({
      adminUid: admin.firebaseUid,
      adminEmail: admin.email,
      action: 'confirm_registration',
      targetType: 'store',
      targetId: id,
      details: { store_name: store.name },
    })
    await invalidateStore(id)
    return NextResponse.json({ success: true })
  }

  if (act.action === 'gift_plan') {
    const plan = await queryOne<{ id: string; name: string; price_monthly: number }>(
      'SELECT id, name, price_monthly FROM plans WHERE id = $1 AND is_active = true',
      [act.planId]
    )
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    if (!(Number(plan.price_monthly) > 0)) return NextResponse.json({ error: 'Choose a paid plan to gift' }, { status: 422 })

    const period = giftPeriod({ planId: store.current_plan_id, expiresAt: store.plan_expires_at }, plan.id, act.months as GiftMonths)
    await query(
      'UPDATE stores SET current_plan_id = $1, plan_expires_at = $2, updated_at = NOW() WHERE id = $3',
      [plan.id, period.expiresAt.toISOString(), id]
    )
    invalidatePlanCache(id)
    await logAdminAction({
      adminUid: admin.firebaseUid,
      adminEmail: admin.email,
      action: `gift_plan:${plan.name.toLowerCase()}:${act.months}m`,
      targetType: 'store',
      targetId: id,
      details: {
        store_name: store.name,
        plan: plan.name,
        months: act.months,
        extended: period.extended,
        expires_at: period.expiresAt.toISOString(),
        previous_plan_id: store.current_plan_id,
        previous_expires_at: store.plan_expires_at,
      },
    })
    await invalidateStore(id)
    return NextResponse.json({ success: true, plan: plan.name, expiresAt: period.expiresAt.toISOString(), extended: period.extended })
  }

  if (act.action === 'end_plan') {
    // Same as a new signup: the Free plan, with no end date to speak of
    const free = await queryOne<{ id: string }>(
      'SELECT id FROM plans WHERE price_monthly = 0 AND is_active = true ORDER BY sort_order LIMIT 1',
      []
    )
    await query(
      `UPDATE stores SET current_plan_id = $1, plan_expires_at = NOW() + INTERVAL '100 years', updated_at = NOW() WHERE id = $2`,
      [free?.id ?? null, id]
    )
    invalidatePlanCache(id)
    await logAdminAction({
      adminUid: admin.firebaseUid,
      adminEmail: admin.email,
      action: 'end_plan',
      targetType: 'store',
      targetId: id,
      details: { store_name: store.name, previous_plan_id: store.current_plan_id, previous_expires_at: store.plan_expires_at },
    })
    await invalidateStore(id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

import { NextResponse } from 'next/server'
import { queryOne } from './db'

export interface EffectivePlan {
  id: string
  name: string
  price_monthly: number
  max_products: number
  max_reels: number
  isPro: boolean       // price_monthly > 0
  isFallback: boolean  // true when we fell back to Free (no plan, or a paid plan that expired)
}

async function getFreePlan(): Promise<EffectivePlan> {
  const free = await queryOne<{
    id: string; name: string; price_monthly: number; max_products: number; max_reels: number
  }>(
    `SELECT id, name, price_monthly, max_products, max_reels FROM plans
     WHERE price_monthly = 0 AND is_active = true ORDER BY sort_order LIMIT 1`,
    []
  )
  if (!free) throw new Error('No Free plan configured — seed one via /admin/plans')
  return { ...free, isPro: false, isFallback: true }
}

// Resolves the plan that actually applies to a store right now. A store always
// resolves to at least the Free plan — an expired or missing paid plan falls
// back to Free limits rather than blocking the store entirely.
export async function getEffectivePlan(storeId: string): Promise<EffectivePlan> {
  const store = await queryOne<{ current_plan_id: string | null; plan_expires_at: string | null }>(
    'SELECT current_plan_id, plan_expires_at FROM stores WHERE id = $1',
    [storeId]
  )

  const active = !!(
    store?.current_plan_id &&
    store.plan_expires_at &&
    new Date(store.plan_expires_at) > new Date()
  )

  if (active) {
    const plan = await queryOne<{
      id: string; name: string; price_monthly: number; max_products: number; max_reels: number
    }>(
      'SELECT id, name, price_monthly, max_products, max_reels FROM plans WHERE id = $1 AND is_active = true',
      [store!.current_plan_id]
    )
    if (plan) return { ...plan, isPro: plan.price_monthly > 0, isFallback: false }
  }

  return getFreePlan()
}

// Returns a 403 NextResponse if the store's effective plan isn't Pro, else null.
// Mirrors requireSubscription() in src/lib/auth.ts — use in mutation routes for
// Pro-only features (Reels, Coupons).
export async function requirePro(storeId: string): Promise<NextResponse | null> {
  const effective = await getEffectivePlan(storeId)
  if (!effective.isPro) {
    return NextResponse.json(
      { error: 'This feature requires a Pro plan. Upgrade from Billing to unlock it.' },
      { status: 403 }
    )
  }
  return null
}

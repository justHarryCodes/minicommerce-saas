import { NextResponse } from 'next/server'
import * as React from 'react'
import { queryOne } from './db'
import { FEATURES, featuresForPlan, type Feature } from './features-shared'

// Per-request memo in server components; a plain call elsewhere (route
// handlers, scripts, tests) where React's cache isn't available.
const cache: <F extends (...args: never[]) => unknown>(fn: F) => F =
  (React as unknown as { cache?: <F>(fn: F) => F }).cache ?? ((fn) => fn)

export interface EffectivePlan {
  id: string
  name: string
  price_monthly: number
  max_products: number
  max_reels: number
  isPro: boolean       // price_monthly > 0
  isFallback: boolean  // true when we fell back to Free (no plan, or a paid plan that expired)
  /** Admin-chosen feature list; null = defaults (paid → all, Free → none) */
  features?: string[] | null
}

type PlanRow = { id: string; name: string; price_monthly: number; max_products: number; max_reels: number; features?: string[] | null }

async function getFreePlan(): Promise<EffectivePlan> {
  const free = await queryOne<PlanRow>(
    `SELECT id, name, price_monthly, max_products, max_reels, features FROM plans
     WHERE price_monthly = 0 AND is_active = true ORDER BY sort_order LIMIT 1`,
    []
  )
  if (!free) throw new Error('No Free plan configured — seed one via /admin/plans')
  return { ...free, isPro: false, isFallback: true }
}

// Plans are read on almost every request (feature gates), so the resolved
// plan is kept in memory for a short while. Anything that changes a store's
// plan calls invalidatePlanCache(); other server processes catch up within
// PLAN_TTL_MS.
const PLAN_TTL_MS = 30_000
const planMemo = new Map<string, { plan: EffectivePlan; at: number }>()

export function invalidatePlanCache(storeId?: string): void {
  if (storeId) planMemo.delete(storeId)
  else planMemo.clear()
}

// Resolves the plan that actually applies to a store right now. A store always
// resolves to at least the Free plan — an expired or missing paid plan falls
// back to Free limits rather than blocking the store entirely.
// Memoised per request so a page and its components share one lookup.
export const getEffectivePlan = cache(async (storeId: string): Promise<EffectivePlan> => {
  const memo = planMemo.get(storeId)
  if (memo && Date.now() - memo.at < PLAN_TTL_MS) return memo.plan
  const plan = await loadEffectivePlan(storeId)
  if (planMemo.size > 5000) planMemo.clear()
  planMemo.set(storeId, { plan, at: Date.now() })
  return plan
})

async function loadEffectivePlan(storeId: string): Promise<EffectivePlan> {
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
    const plan = await queryOne<PlanRow>(
      'SELECT id, name, price_monthly, max_products, max_reels, features FROM plans WHERE id = $1 AND is_active = true',
      [store!.current_plan_id]
    )
    if (plan) return { ...plan, isPro: plan.price_monthly > 0, isFallback: false }
  }

  return getFreePlan()
}

/** The paid features this store can use right now. */
export async function getStoreFeatures(storeId: string): Promise<Set<Feature>> {
  return new Set(featuresForPlan(await getEffectivePlan(storeId)))
}

export async function hasFeature(storeId: string, feature: Feature): Promise<boolean> {
  return (await getStoreFeatures(storeId)).has(feature)
}

export function planRequiredResponse(feature: Feature): NextResponse {
  return NextResponse.json(
    {
      error: `${FEATURES[feature].label} isn't included in your plan. Upgrade from Billing to unlock it.`,
      code: 'plan_required',
      feature,
    },
    { status: 403 }
  )
}

// Returns a 403 NextResponse if the store's plan doesn't include `feature`, else null.
export async function requireFeature(storeId: string, feature: Feature): Promise<NextResponse | null> {
  return (await hasFeature(storeId, feature)) ? null : planRequiredResponse(feature)
}

// Returns a 403 NextResponse if the store's effective plan isn't Pro, else null.
// Prefer requireFeature() — this remains for callers that gate on "any paid plan".
export async function requirePro(storeId: string): Promise<NextResponse | null> {
  const effective = await getEffectivePlan(storeId)
  if (!effective.isPro) {
    return NextResponse.json(
      { error: 'This feature requires a Pro plan. Upgrade from Billing to unlock it.', code: 'plan_required' },
      { status: 403 }
    )
  }
  return null
}

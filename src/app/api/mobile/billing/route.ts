import { NextResponse } from "next/server";
import { verifySession, getUserStore } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/admin-auth";
import { query, queryOne } from "@/lib/db";
import { yearlyBillingReady } from "@/lib/yearly-billing";

export const dynamic = "force-dynamic";

// Vendor app: the store's plan, the plans on offer and recent payments
// (same data as Dashboard -> Billing). Paying happens on the website's
// billing page. Owner only.
export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "Only the store owner can manage billing" }, { status: 403 });

  const row = await queryOne<{ current_plan_id: string | null; plan_expires_at: string | null; subscription_status: string | null }>(
    "SELECT current_plan_id, plan_expires_at, subscription_status FROM stores WHERE id = $1",
    [store.id]
  );

  const [settings, payments, plans, yearlyReady] = await Promise.all([
    getPlatformSettings(),
    query<{
      id: string; type: string; amount: number; payment_status: string; payment_method: string;
      period_start: string | null; period_end: string | null; created_at: string; billing_cycle: string | null; plan_name: string | null;
    }>(
      `SELECT sp.id, sp.type, sp.amount, sp.payment_status, sp.payment_method, sp.period_start, sp.period_end, sp.created_at,
              to_jsonb(sp) ->> 'billing_cycle' AS billing_cycle, p.name AS plan_name
       FROM subscription_payments sp LEFT JOIN plans p ON p.id = sp.plan_id
       WHERE sp.store_id = $1 ORDER BY sp.created_at DESC LIMIT 20`,
      [store.id]
    ),
    query<{ id: string; name: string; description: string | null; price_monthly: number; max_products: number; max_reels: number; features: string[] | null; sort_order: number }>(
      `SELECT DISTINCT ON (name) id, name, description, price_monthly, max_products, max_reels, features, sort_order
       FROM plans WHERE is_active = true ORDER BY name, sort_order, created_at`,
      []
    ),
    yearlyBillingReady(),
  ]);

  const sorted = [...plans].sort((a, b) => a.sort_order - b.sort_order || Number(a.price_monthly) - Number(b.price_monthly));
  const lastPaidPlan = payments.find((p) => p.type === "plan" && p.payment_status === "paid");
  const expired = !!row?.plan_expires_at && new Date(row.plan_expires_at) < new Date();
  // A lapsed paid plan falls back to the free plan
  const free = sorted.find((p) => Number(p.price_monthly) <= 0) ?? null;
  const currentId = row?.current_plan_id && !expired ? row.current_plan_id : free?.id ?? null;

  return NextResponse.json({
    currentPlanId: currentId,
    planExpiresAt: row?.plan_expires_at ?? null,
    expired,
    cycle: lastPaidPlan ? (lastPaidPlan.billing_cycle === "yearly" ? "yearly" : "monthly") : null,
    yearlyReady,
    yearlyDiscount: Number(settings.yearly_discount_percent ?? 0),
    plans: sorted.map((p) => ({ ...p, price_monthly: Number(p.price_monthly), features: p.features ?? [] })),
    payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
  });
}

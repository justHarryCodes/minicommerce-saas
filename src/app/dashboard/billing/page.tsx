import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/admin-auth";
import { queryOne, query } from "@/lib/db";
import BillingClient from "./BillingClient";
import { yearlyBillingReady } from "@/lib/yearly-billing";

export const metadata = { title: "Billing" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await verifySession();
  if (!user) redirect("/auth/login");

  const store = await queryOne<{
    id: string;
    name: string;
    status: string;
    subscription_status: string;
    setup_fee_paid_at: string | null;
    subscription_expires_at: string | null;
    current_plan_id: string | null;
    plan_expires_at: string | null;
    registration_confirmed: boolean;
  }>(
    `SELECT id, name, status,
            subscription_status, setup_fee_paid_at, subscription_expires_at,
            current_plan_id, plan_expires_at, registration_confirmed
     FROM stores WHERE owner_id = $1 AND is_active = true`,
    [user.firebaseUid]
  );

  if (!store) redirect("/onboarding");

  // Auto-expire subscriptions server-side so the UI always reflects truth.
  // Only update if the DB still says 'subscribed' but the expiry has passed.
  if (
    store.subscription_status === "subscribed" &&
    store.subscription_expires_at &&
    new Date(store.subscription_expires_at) < new Date()
  ) {
    await query(
      `UPDATE stores
       SET subscription_status = 'expired',
           status              = 'suspended',
           updated_at          = NOW()
       WHERE id = $1`,
      [store.id]
    );
    store.subscription_status = "expired";
    store.status = "suspended";
  }

  const [settings, payments, plans, bankAccounts, sp, yearlyReady, everPaid] = await Promise.all([
    getPlatformSettings(),
    query<{
      id: string;
      type: string;
      amount: number;
      payment_status: string;
      payment_method: string;
      period_start: string | null;
      period_end: string | null;
      created_at: string;
      billing_cycle: string | null;
      plan_name: string | null;
    }>(
      // billing_cycle via to_jsonb: works before and after migrations/yearly_billing.sql
      `SELECT sp.id, sp.type, sp.amount, sp.payment_status, sp.payment_method, sp.period_start, sp.period_end, sp.created_at,
              to_jsonb(sp) ->> billing_cycle AS billing_cycle, p.name AS plan_name
       FROM subscription_payments sp LEFT JOIN plans p ON p.id = sp.plan_id
       WHERE sp.store_id = $1 ORDER BY sp.created_at DESC LIMIT 20`,
      [store.id]
    ),
    // DISTINCT ON name guards against duplicate rows surviving the dedup migration
    query<{
      id: string;
      name: string;
      description: string | null;
      price_monthly: number;
      max_products: number;
      max_reels: number;
      is_active: boolean;
      features: string[] | null;
      sort_order: number;
    }>(
      `SELECT DISTINCT ON (name) id, name, description, price_monthly, max_products, max_reels, is_active, features, sort_order
       FROM plans WHERE is_active = true ORDER BY name, sort_order, created_at`,
      []
    ),
    query<{
      id: string;
      bank_name: string;
      account_number: string;
      account_name: string;
    }>(
      "SELECT id, bank_name, account_number, account_name FROM platform_bank_accounts WHERE is_active = true ORDER BY sort_order",
      []
    ),
    searchParams,
    yearlyBillingReady(),
    // Has this store ever paid for a plan? Never → Billing opens like a pricing page
    queryOne(`SELECT 1 FROM subscription_payments WHERE store_id = $1 AND type = plan AND payment_status = paid LIMIT 1`, [store.id]),
  ]);
  // Cheapest first, the order the pricing page uses
  const sortedPlans = [...plans].sort((a, b) => a.sort_order - b.sort_order || Number(a.price_monthly) - Number(b.price_monthly));
  const freePlan = sortedPlans.find((p) => Number(p.price_monthly) <= 0) ?? null;
  // The cycle of the latest paid plan payment (what they are on now)
  const lastPaidPlan = payments.find((p) => p.type === "plan" && p.payment_status === "paid");
  const currentCycle = lastPaidPlan ? (lastPaidPlan.billing_cycle === "yearly" ? "yearly" : "monthly") : null;

  const currentPlan = store.current_plan_id
    ? await queryOne<{
        id: string;
        name: string;
        description: string | null;
        price_monthly: number;
        max_products: number;
        max_reels: number;
        is_active: boolean;
        features: string[] | null;
      }>(
        "SELECT id, name, description, price_monthly, max_products, max_reels, is_active, features FROM plans WHERE id = $1",
        [store.current_plan_id]
      )
    : null;

  return (
    <BillingClient
      store={{
        id: store.id,
        name: store.name,
        status: store.status,
        subscriptionStatus: store.subscription_status,
        subscriptionExpiresAt: store.subscription_expires_at,
        setupFeePaidAt: store.setup_fee_paid_at,
        currentPlanId: store.current_plan_id,
        planExpiresAt: store.plan_expires_at,
        registrationConfirmed: store.registration_confirmed,
      }}
      settings={settings}
      payments={payments}
      plans={sortedPlans.filter((p) => p.price_monthly > 0)}
      freePlan={freePlan}
      yearlyDiscount={settings.yearly_discount_percent}
      yearlyReady={yearlyReady}
      hasEverPaid={!!everPaid}
      currentCycle={currentCycle}
      bankAccounts={bankAccounts}
      currentPlan={currentPlan ?? null}
      success={sp.success}
      error={sp.error}
    />
  );
}

import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/admin-auth";
import { queryOne, query } from "@/lib/db";
import BillingClient from "./BillingClient";

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

  const [settings, payments, plans, bankAccounts, sp] = await Promise.all([
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
    }>(
      `SELECT id, type, amount, payment_status, payment_method, period_start, period_end, created_at
       FROM subscription_payments WHERE store_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [store.id]
    ),
    query<{
      id: string;
      name: string;
      description: string | null;
      price_monthly: number;
      max_products: number;
      is_active: boolean;
    }>('SELECT id, name, description, price_monthly, max_products, is_active FROM plans WHERE is_active = true ORDER BY sort_order, created_at', []),
    query<{
      id: string;
      bank_name: string;
      account_number: string;
      account_name: string;
    }>('SELECT id, bank_name, account_number, account_name FROM platform_bank_accounts WHERE is_active = true ORDER BY sort_order', []),
    searchParams,
  ]);

  const currentPlan = store.current_plan_id
    ? await queryOne<{ id: string; name: string; description: string | null; price_monthly: number; max_products: number; is_active: boolean }>(
        'SELECT id, name, description, price_monthly, max_products, is_active FROM plans WHERE id = $1',
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
      plans={plans}
      bankAccounts={bankAccounts}
      currentPlan={currentPlan ?? null}
      success={sp.success}
      error={sp.error}
    />
  );
}

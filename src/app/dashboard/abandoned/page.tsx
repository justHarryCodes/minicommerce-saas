import { redirect } from "next/navigation";
import { featureGate } from "@/components/dashboard/FeatureGate";
import { verifySession } from "@/lib/auth";
import { getPageStore } from "@/lib/access";
import { query, queryOne } from "@/lib/db";
import { recoveryUrl } from "@/lib/notify/cart-reminders";
import { smsConfigured } from "@/lib/notify/providers";
import AbandonedClient, { type AbandonedCart } from "./AbandonedClient";

export const dynamic = "force-dynamic";

export default async function AbandonedCartsPage() {
  const user = await verifySession();
  if (!user) redirect("/auth/login");
  const store = await getPageStore(user, "abandoned");
  if (!store) redirect("/onboarding");
  const gate = await featureGate(store.id, "abandoned_carts");
  if (gate) return gate;

  const rows = await query<{
    id: string; token: string; customer_name: string | null; customer_phone: string; customer_email: string | null;
    items: { productId: string; quantity: number; size?: string | null }[]; subtotal: number;
    reminder_sent_at: string | null; updated_at: string;
  }>(
    `SELECT id, token, customer_name, customer_phone, customer_email, items, subtotal, reminder_sent_at, updated_at
     FROM checkout_sessions
     WHERE store_id = $1 AND status = 'open'
       AND updated_at < NOW() - INTERVAL '15 minutes'
       AND updated_at > NOW() - INTERVAL '14 days'
     ORDER BY updated_at DESC
     LIMIT 200`,
    [store.id]
  );

  // Product names for the item summaries
  const ids = Array.from(new Set(rows.flatMap((r) => r.items.map((i) => i.productId))));
  const products = ids.length
    ? await query<{ id: string; name: string }>("SELECT id, name FROM products WHERE store_id = $1 AND id = ANY($2::uuid[])", [store.id, ids])
    : [];
  const nameOf = new Map(products.map((p) => [p.id, p.name]));

  const stats = await queryOne<{ recovered: number; recovered_value: number; abandoned: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE cs.status = 'recovered')::int AS recovered,
       COALESCE(SUM(o.total_amount) FILTER (WHERE cs.status = 'recovered'), 0)::float AS recovered_value,
       COUNT(*) FILTER (WHERE cs.status <> 'recovered')::int AS abandoned
     FROM checkout_sessions cs LEFT JOIN orders o ON o.id = cs.order_id
     WHERE cs.store_id = $1 AND cs.created_at > NOW() - INTERVAL '30 days'`,
    [store.id]
  );

  const carts: AbandonedCart[] = rows.map((r) => ({
    id: r.id,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email,
    subtotal: Number(r.subtotal),
    items: r.items.map((i) => ({ name: nameOf.get(i.productId) ?? "Removed product", quantity: i.quantity, size: i.size ?? null })),
    reminderSentAt: r.reminder_sent_at,
    updatedAt: r.updated_at,
    recoveryLink: recoveryUrl(store.slug, r.token),
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-5 pt-4 lg:pt-0">
      <div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-white">Abandoned carts</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Shoppers who reached checkout, left their number, but didn&apos;t order. Nudge them back with one tap.
        </p>
      </div>
      <AbandonedClient
        carts={carts}
        storeName={store.name}
        autoReminders={smsConfigured() && (store.customerNotificationsEnabled ?? store.customer_notifications_enabled ?? true) !== false}
        stats={{
          recovered: stats?.recovered ?? 0,
          recoveredValue: stats?.recovered_value ?? 0,
          abandoned: stats?.abandoned ?? 0,
        }}
      />
    </div>
  );
}

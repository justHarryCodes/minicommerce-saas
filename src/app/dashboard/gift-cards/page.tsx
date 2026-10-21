import { redirect } from "next/navigation";
import { featureGate } from "@/components/dashboard/FeatureGate";
import { verifySession } from "@/lib/auth";
import { getPageAccess } from "@/lib/access";
import { query, queryOne } from "@/lib/db";
import type { GiftCardRow } from "@/lib/gift-cards";
import GiftCardsClient from "./GiftCardsClient";

export const dynamic = "force-dynamic";

export default async function GiftCardsPage() {
  const user = await verifySession();
  if (!user) redirect("/auth/login");
  const { store, role } = await getPageAccess(user, "giftcards");
  const gate = await featureGate(store.id, "gift_cards", role === "owner");
  if (gate) return gate;

  const [cards, settings, rewarded] = await Promise.all([
    query<GiftCardRow>("SELECT * FROM gift_cards WHERE store_id = $1 ORDER BY created_at DESC LIMIT 500", [store.id]),
    queryOne<{ loyalty_every_n: number | null; loyalty_percent: number }>(
      "SELECT loyalty_every_n, loyalty_percent FROM stores WHERE id = $1",
      [store.id]
    ),
    queryOne<{ n: number; total: string | null }>(
      "SELECT COUNT(*)::int AS n, SUM(loyalty_discount) AS total FROM orders WHERE store_id = $1 AND loyalty_discount > 0 AND order_status <> 'cancelled'",
      [store.id]
    ),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-4 lg:pt-0">
      <div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-white">Gift cards & loyalty</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Sell or give gift cards, refund as store credit, and reward customers who keep coming back.
        </p>
      </div>
      <GiftCardsClient
        canEditLoyalty={role === "owner"}
        loyalty={{ everyN: settings?.loyalty_every_n ?? null, percent: settings?.loyalty_percent ?? 10 }}
        rewardStats={{ orders: rewarded?.n ?? 0, total: Number(rewarded?.total ?? 0) }}
        cards={cards.map((c) => ({
          id: c.id,
          code: c.code,
          kind: c.kind,
          initialAmount: Number(c.initial_amount),
          balance: Number(c.balance),
          recipientName: c.recipient_name,
          recipientPhone: c.recipient_phone,
          recipientEmail: c.recipient_email,
          note: c.note,
          expiresAt: c.expires_at ? isoDay(c.expires_at) : null,
          isActive: c.is_active,
          createdAt: new Date(c.created_at).toISOString(),
        }))}
      />
    </div>
  );
}

function isoDay(v: string | Date): string {
  if (typeof v === "string") return v.slice(0, 10);
  return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
}

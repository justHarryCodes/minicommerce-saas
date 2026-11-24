import { verifySession } from "@/lib/auth";
import { getPageAccess } from "@/lib/access";
import { queryOne } from "@/lib/db";
import { getEffectivePlan, getStoreFeatures } from "@/lib/plan";
import { getStoreUrl } from "@/lib/utils";
import StoreHub from "@/components/dashboard/mobile/StoreHub";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your store" };

// The phone "Store" tab: the store at a glance plus every tool it can use.
export default async function StoreTabPage() {
  const user = await verifySession();
  const { store, role } = await getPageAccess(user!, "orders");
  const [plan, features, counts] = await Promise.all([
    getEffectivePlan(store.id),
    getStoreFeatures(store.id),
    queryOne<{ products: number; orders: number; visitors: number; waiting: number }>(
      `SELECT
         (SELECT COUNT(*)::int FROM products WHERE store_id = $1 AND is_active = true) AS products,
         (SELECT COUNT(*)::int FROM orders WHERE store_id = $1 AND order_status <> 'cancelled') AS orders,
         (SELECT COUNT(DISTINCT visitor_id)::int FROM store_visits WHERE store_id = $1 AND visited_at > (NOW() AT TIME ZONE 'Africa/Lagos')::date - 7) AS visitors,
         (SELECT COUNT(*)::int FROM orders WHERE store_id = $1 AND (order_status = 'pending' OR payment_status = 'pending_confirmation')) AS waiting`,
      [store.id],
    ).catch(() => null),
  ]);

  return (
    <StoreHub
      store={{ name: store.name, slug: store.slug, logoUrl: store.logoUrl ?? store.logo_url, url: getStoreUrl(store.slug, store.customDomain ?? store.custom_domain) }}
      plan={{ name: plan.name, isPro: plan.isPro }}
      stats={{ products: counts?.products ?? 0, orders: counts?.orders ?? 0, visitors: counts?.visitors ?? 0 }}
      role={role}
      features={[...features]}
      badges={{ "/dashboard/orders": counts?.waiting ?? 0 }}
    />
  );
}

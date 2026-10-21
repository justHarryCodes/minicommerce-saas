import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { getPageAccess, can } from "@/lib/access";
import { query } from "@/lib/db";
import { lowStockItems } from "@/lib/inventory";
import { waitingCounts } from "@/lib/stock-alerts";
import InventoryClient, { type Movement } from "./InventoryClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const user = await verifySession();
  if (!user) redirect("/auth/login");
  const { store, role } = await getPageAccess(user, "inventory");

  const threshold = Number(store.lowStockThreshold ?? store.low_stock_threshold ?? 3);
  const [low, movements, waiting] = await Promise.all([
    lowStockItems(store.id, threshold),
    query<Movement>(
      `SELECT m.id, m.product_id, m.product_name, m.variant_label, m.change, m.stock_after, m.reason, m.created_at,
              o.order_number
       FROM inventory_movements m LEFT JOIN orders o ON o.id = m.order_id
       WHERE m.store_id = $1
       ORDER BY m.created_at DESC
       LIMIT 300`,
      [store.id]
    ),
    waitingCounts(store.id),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-5 pt-4 lg:pt-0">
      <div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-white">Inventory</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          What&apos;s running low, and every stock change with the reason behind it.
        </p>
      </div>
      <InventoryClient
        storeId={store.id}
        threshold={threshold}
        lowStock={low.map((l) => ({
          ...l,
          stock: Number(l.stock),
          threshold: Number(l.threshold),
          // shoppers who asked to hear when it's back (this variant, or the whole product)
          waiting: (waiting.get(`${l.product_id}|${l.variant_label ?? ""}`) ?? 0) + (l.variant_label ? waiting.get(`${l.product_id}|`) ?? 0 : 0),
        }))}
        movements={movements}
        canEditProducts={can(role, "products")}
        canEditThreshold={role === "owner"}
      />
    </div>
  );
}

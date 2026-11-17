import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getAccessFor, can } from "@/lib/access";
import { requireFeature } from "@/lib/plan";
import { query } from "@/lib/db";
import { lowStockItems } from "@/lib/inventory";
import { waitingCounts } from "@/lib/stock-alerts";

export const dynamic = "force-dynamic";

// Vendor app: what's running low and the latest stock changes (same data
// as Dashboard -> Inventory). Restocking a product without sizes is a
// PATCH /api/products/<id> { stockQuantity }; that's logged in the history.
export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await getAccessFor(user, "inventory");
  if (!access) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { store, role } = access;
  const denied = await requireFeature(store.id, "inventory_tools");
  if (denied) return denied;

  const threshold = Number(store.lowStockThreshold ?? store.low_stock_threshold ?? 3);
  const [low, movements, waiting] = await Promise.all([
    lowStockItems(store.id, threshold),
    query<{
      id: string; product_id: string | null; product_name: string; variant_label: string | null;
      change: number; stock_after: number | null; reason: string; created_at: string; order_number: string | null;
    }>(
      `SELECT m.id, m.product_id, m.product_name, m.variant_label, m.change, m.stock_after, m.reason, m.created_at,
              o.order_number
       FROM inventory_movements m LEFT JOIN orders o ON o.id = m.order_id
       WHERE m.store_id = $1
       ORDER BY m.created_at DESC
       LIMIT 100`,
      [store.id]
    ),
    waitingCounts(store.id),
  ]);

  return NextResponse.json({
    threshold,
    canEditProducts: can(role, "products"),
    lowStock: low.map((l) => ({
      ...l,
      stock: Number(l.stock),
      threshold: Number(l.threshold),
      // shoppers who asked to hear when it's back (this variant, or the whole product)
      waiting: (waiting.get(`${l.product_id}|${l.variant_label ?? ""}`) ?? 0) + (l.variant_label ? waiting.get(`${l.product_id}|`) ?? 0 : 0),
    })),
    movements: movements.map((m) => ({ ...m, change: Number(m.change), stock_after: m.stock_after == null ? null : Number(m.stock_after) })),
  });
}

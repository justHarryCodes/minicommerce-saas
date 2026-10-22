// Inventory history + low-stock alerts.
//
// Every stock change (order, cancellation restock, manual edit, initial
// stock) is written to inventory_movements so merchants can see where stock
// went. When a change pushes a product (or variant) to/below its threshold
// the merchant gets one alert — on the crossing, not on every later sale.

import type { PoolClient } from "pg";
import { invalidateStoreSoon } from "@/lib/store-cache";
import { query, withTransaction } from "@/lib/db";
import { notifyStoreEvent } from "@/lib/push";
import { notifyBackInStock } from "@/lib/stock-alerts";
import { hasFeature } from "@/lib/plan";

export type MovementReason = "order" | "order_cancelled" | "manual" | "created";

export interface StockChange {
  productId: string;
  productName: string;
  variantLabel: string | null;
  change: number;
  stockAfter: number | null;
}

type Db = Pick<PoolClient, "query"> | { query: (sql: string, params?: unknown[]) => Promise<unknown> };

export async function recordMovements(
  db: Db,
  storeId: string,
  reason: MovementReason,
  changes: StockChange[],
  orderId: string | null = null
): Promise<void> {
  const rows = changes.filter((c) => c.change !== 0);
  if (!rows.length) return;
  const values: unknown[] = [];
  const tuples = rows.map((c, i) => {
    values.push(storeId, c.productId, c.productName, c.variantLabel, c.change, c.stockAfter, reason, orderId);
    const b = i * 8;
    return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8})`;
  });
  await db.query(
    `INSERT INTO inventory_movements (store_id, product_id, product_name, variant_label, change, stock_after, reason, order_id)
     VALUES ${tuples.join(",")}`,
    values
  );
}

/** True when stock moved from above the threshold to at/below it. */
export function crossedLowStock(before: number, after: number, threshold: number): boolean {
  return before > threshold && after <= threshold;
}

export function effectiveThreshold(productThreshold: number | null | undefined, storeThreshold: number | null | undefined): number {
  const t = productThreshold ?? storeThreshold ?? 3;
  return Number.isFinite(Number(t)) ? Math.max(0, Number(t)) : 3;
}

export function lowStockMessage(items: { name: string; label: string | null; stock: number }[]): { title: string; body: string } {
  const describe = (i: (typeof items)[number]) =>
    `${i.name}${i.label ? ` (${i.label})` : ""}: ${i.stock === 0 ? "sold out" : `${i.stock} left`}`;
  if (items.length === 1) {
    const i = items[0];
    return { title: i.stock === 0 ? "Sold out" : "Running low on stock", body: describe(i) };
  }
  return {
    title: `${items.length} items running low`,
    body: items.slice(0, 3).map(describe).join(" · ") + (items.length > 3 ? ` · +${items.length - 3} more` : ""),
  };
}

export async function alertLowStock(storeId: string, items: { productId: string; name: string; label: string | null; stock: number }[]): Promise<void> {
  if (!items.length) return;
  if (!(await hasFeature(storeId, "inventory_tools"))) return;
  const { title, body } = lowStockMessage(items);
  await notifyStoreEvent(storeId, {
    type: "low_stock",
    title,
    body,
    data: { productIds: items.map((i) => i.productId).join(",") },
    url: "/dashboard/inventory",
  });
}

/**
 * Put a cancelled order's items back into stock, once. Products that were
 * deleted since are skipped; a variant that no longer exists falls back to
 * the product-level count.
 */
export async function restockCancelledOrder(orderId: string, storeId: string): Promise<number> {
  // Items that came back from zero — their waiting shoppers get told after commit
  const backFromZero: { productId: string; label: string | null }[] = [];
  const restored = await withTransaction(async (client) => {
    const claimed = await client.query(
      "UPDATE orders SET stock_restored_at = NOW() WHERE id = $1 AND store_id = $2 AND stock_restored_at IS NULL RETURNING id",
      [orderId, storeId]
    );
    if (!claimed.rows.length) return 0;

    // Free any appointment slots this order held
    await client.query("UPDATE bookings SET status = 'cancelled' WHERE order_id = $1 AND status = 'confirmed'", [orderId]);

    // Services never had stock taken, so they get none back
    const items = await client.query<{ product_id: string | null; product_name: string; size: string | null; quantity: number }>(
      `SELECT oi.product_id, oi.product_name, oi.size, oi.quantity
       FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1 AND COALESCE(p.is_bookable, false) = false`,
      [orderId]
    );
    const changes: StockChange[] = [];
    for (const it of items.rows) {
      if (!it.product_id) continue;
      let variantAfter: number | null = null;
      if (it.size) {
        const v = await client.query<{ stock_quantity: number }>(
          "UPDATE product_sizes SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE product_id = $2 AND label = $3 RETURNING stock_quantity",
          [it.quantity, it.product_id, it.size]
        );
        variantAfter = v?.rows?.[0]?.stock_quantity ?? null;
      }
      const p = await client.query<{ stock_quantity: number }>(
        "UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2 AND store_id = $3 RETURNING stock_quantity",
        [it.quantity, it.product_id, storeId]
      );
      if (!p.rows.length) continue;
      const governing = it.size ? variantAfter : p.rows[0].stock_quantity;
      if (governing != null && governing - it.quantity <= 0) backFromZero.push({ productId: it.product_id, label: it.size });
      changes.push({
        productId: it.product_id,
        productName: it.product_name,
        variantLabel: it.size,
        change: it.quantity,
        stockAfter: p.rows[0].stock_quantity,
      });
    }
    await recordMovements(client, storeId, "order_cancelled", changes, orderId);
    return changes.length;
  });
  for (const b of backFromZero) void notifyBackInStock(storeId, b.productId, b.label);
  if (restored) invalidateStoreSoon(storeId);
  return restored;
}

/** Low-stock list for the dashboard: products and variants at/below threshold. */
export async function lowStockItems(storeId: string, storeThreshold: number) {
  return query<{
    product_id: string; name: string; slug: string; image_url: string | null; variant_label: string | null;
    stock: number; threshold: number;
  }>(
    `SELECT p.id AS product_id, p.name, p.slug, COALESCE(p.image_url, p.images[1]) AS image_url,
            NULL::text AS variant_label, p.stock_quantity AS stock,
            COALESCE(p.low_stock_threshold, $2)::int AS threshold
     FROM products p
     WHERE p.store_id = $1 AND p.is_active = true AND p.has_sizes = false AND p.is_bookable = false
       AND p.stock_quantity <= COALESCE(p.low_stock_threshold, $2)
     UNION ALL
     SELECT p.id, p.name, p.slug, COALESCE(p.image_url, p.images[1]),
            ps.label, ps.stock_quantity, COALESCE(p.low_stock_threshold, $2)::int
     FROM product_sizes ps JOIN products p ON p.id = ps.product_id
     WHERE p.store_id = $1 AND p.is_active = true AND p.has_sizes = true
       AND ps.stock_quantity <= COALESCE(p.low_stock_threshold, $2)
     ORDER BY stock ASC, name ASC
     LIMIT 200`,
    [storeId, storeThreshold]
  );
}

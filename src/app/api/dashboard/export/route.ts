import { NextResponse } from "next/server";
import { verifySession, getUserStore } from "@/lib/auth";
import { query } from "@/lib/db";

// Merchant-only. Bundles everything scoped to this store into one JSON
// download — a plain data dump, deliberately not a new abstraction.
export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const [categories, products, orders, orderItems, coupons, reels, reviews] = await Promise.all([
    query("SELECT * FROM categories WHERE store_id = $1 ORDER BY sort_order, name", [store.id]),
    query("SELECT * FROM products WHERE store_id = $1 ORDER BY created_at", [store.id]),
    query("SELECT * FROM orders WHERE store_id = $1 ORDER BY created_at", [store.id]),
    query(
      `SELECT oi.* FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.store_id = $1
       ORDER BY oi.id`,
      [store.id]
    ),
    query("SELECT * FROM coupons WHERE store_id = $1 ORDER BY created_at", [store.id]).catch(() => []),
    query(
      "SELECT id, title, description, video_url, thumbnail_url, duration_seconds, view_count, share_count, is_active, is_featured, created_at FROM reels WHERE store_id = $1 ORDER BY created_at",
      [store.id]
    ).catch(() => []),
    query("SELECT * FROM reviews WHERE store_id = $1 ORDER BY created_at", [store.id]).catch(() => []),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    store,
    categories,
    products,
    orders,
    orderItems,
    coupons,
    reels,
    reviews,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${store.slug}-export.json"`,
      "Cache-Control": "no-store",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";
import { verifySession, getUserStore } from "@/lib/auth";
import { z } from "zod";

const Schema = z.object({
  orderStatus: z
    .enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"])
    .optional(),
  paymentStatus: z.enum(["pending", "pending_confirmation", "paid", "failed", "refunded", "rejected"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await verifySession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const store = await getUserStore(user.firebaseUid);
    if (!store) return NextResponse.json({ error: "No store" }, { status: 404 });

    const { orderId } = await params;
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    // store.id is camelCase from toCamel — but the actual DB column is `id`
    const order = await queryOne(
      "SELECT id FROM orders WHERE id = $1 AND store_id = $2",
      [orderId, store.id]
    );
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (parsed.data.orderStatus) {
      sets.push(`order_status = $${idx++}`);
      values.push(parsed.data.orderStatus);
    }
    if (parsed.data.paymentStatus) {
      sets.push(`payment_status = $${idx++}`);
      values.push(parsed.data.paymentStatus);
    }

    if (!sets.length) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    sets.push(`updated_at = NOW()`);
    values.push(orderId);

    const rows = await query(
      `UPDATE orders SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    console.error("[merchant/orders] PATCH error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

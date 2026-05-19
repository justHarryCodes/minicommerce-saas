import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const { searchParams } = req.nextUrl;
  const orderNumber = searchParams.get("orderNumber")?.trim().toUpperCase();
  const phone       = searchParams.get("phone")?.trim().replace(/\s/g, "");

  if (!phone) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  const store = await queryOne<{ id: string }>(
    "SELECT id FROM stores WHERE slug = $1 AND is_active = true",
    [slug]
  );
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  // ── Single order lookup (order number + phone) ────────────────────────────
  if (orderNumber) {
    const order = await queryOne<{
      id: string;
      order_number: string;
      customer_name: string;
      customer_phone: string;
      delivery_address: string;
      delivery_city: string | null;
      delivery_state: string | null;
      delivery_note: string | null;
      subtotal: number;
      total: number;
      discount_amount: number;
      payment_method: string;
      payment_status: string;
      order_status: string;
      created_at: string;
    }>(
      `SELECT id, order_number, customer_name, customer_phone,
              delivery_address, delivery_city, delivery_state, delivery_note,
              subtotal, total, discount_amount,
              payment_method, payment_status, order_status, created_at
       FROM orders
       WHERE store_id = $1 AND order_number = $2 AND customer_phone = $3`,
      [store.id, orderNumber, phone]
    );

    if (!order) {
      return NextResponse.json(
        { error: "No order found. Please check your order number and phone number." },
        { status: 404 }
      );
    }

    const items = await query<{
      product_name: string;
      product_image: string | null;
      price: number;
      quantity: number;
      subtotal: number;
    }>(
      "SELECT product_name, product_image, price, quantity, subtotal FROM order_items WHERE order_id = $1",
      [order.id]
    );

    return NextResponse.json({ mode: "single", order, items });
  }

  // ── All orders for a phone number ─────────────────────────────────────────
  const orders = await query<{
    id: string;
    order_number: string;
    total: number;
    payment_status: string;
    order_status: string;
    created_at: string;
  }>(
    `SELECT id, order_number, total, payment_status, order_status, created_at
     FROM orders
     WHERE store_id = $1 AND customer_phone = $2
     ORDER BY created_at DESC
     LIMIT 20`,
    [store.id, phone]
  );

  if (orders.length === 0) {
    return NextResponse.json(
      { error: "No orders found for this phone number." },
      { status: 404 }
    );
  }

  return NextResponse.json({ mode: "list", orders });
}

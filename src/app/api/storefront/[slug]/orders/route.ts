import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, withTransaction } from "@/lib/db";
import { z } from "zod";

const OrderSchema = z.object({
  storeId: z.string().uuid(),
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().min(5),
  deliveryAddress: z.string().min(1),
  deliveryCity: z.string().optional().default(""),
  deliveryState: z.string().optional().default(""),
  deliveryNote: z.string().optional(),
  paymentMethod: z.enum(["paystack", "transfer"]),
  totalAmount: z.number().min(0),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1),
      unitPrice: z.number().min(0),
    })
  ).min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const store = await queryOne<{ id: string; is_active: boolean }>(
      "SELECT id, is_active FROM stores WHERE slug = $1",
      [slug]
    );
    if (!store || !store.is_active) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = OrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const d = parsed.data;
    if (d.storeId !== store.id) {
      return NextResponse.json({ error: "Invalid store" }, { status: 400 });
    }

    // Validate products and stock
    for (const item of d.items) {
      const product = await queryOne<{ id: string; stock_quantity: number }>(
        "SELECT id, stock_quantity FROM products WHERE id = $1 AND store_id = $2 AND is_active = true",
        [item.productId, store.id]
      );
      if (!product) {
        return NextResponse.json({ error: `Product not available` }, { status: 400 });
      }
      if (product.stock_quantity < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock` }, { status: 400 });
      }
    }

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    // Map "transfer" → "bank_transfer" for the CHECK constraint
    const dbPaymentMethod = d.paymentMethod === "transfer" ? "bank_transfer" : "paystack";

    const result = await withTransaction(async (client) => {
      const orderRows = await client.query(
        `INSERT INTO orders (
          store_id, order_number, customer_name, customer_email, customer_phone,
          delivery_address, delivery_city, delivery_state,
          subtotal, total, payment_method
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, order_number`,
        [
          store.id, orderNumber,
          d.customerName,
          d.customerEmail || null,
          d.customerPhone,
          d.deliveryAddress,
          d.deliveryCity || "N/A",
          d.deliveryState || "N/A",
          d.totalAmount,
          d.totalAmount,
          dbPaymentMethod,
        ]
      );

      const order = orderRows.rows[0];

      for (const item of d.items) {
        // Get product name for order_items
        const prod = await client.query(
          "SELECT name, image_url, images FROM products WHERE id = $1",
          [item.productId]
        );
        const p = prod.rows[0];
        const img = p.image_url || p.images?.[0] || null;

        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [order.id, item.productId, p.name, img, item.unitPrice, item.quantity, item.unitPrice * item.quantity]
        );

        await client.query(
          "UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2",
          [item.quantity, item.productId]
        );
      }

      return order;
    });

    return NextResponse.json(
      { orderId: result.id, orderNumber: result.order_number },
      { status: 201 }
    );
  } catch (err) {
    console.error("[storefront/orders] error:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

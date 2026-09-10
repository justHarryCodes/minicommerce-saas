import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, withTransaction } from "@/lib/db";
import { notifyStoreNewOrder } from "@/lib/push";
import { sendWebPushToSubject } from "@/lib/webpush";
import { z } from "zod";

// Thrown from inside the order transaction when a size's stock was raced
// out from under us between the pre-check and the atomic decrement —
// caught below and surfaced as 409, not a generic 500.
class InsufficientStockError extends Error {}

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
  couponCode: z.string().optional().nullable(),
  discountAmount: z.number().min(0).optional().default(0),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1),
      unitPrice: z.number().min(0),
      size: z.string().max(50).optional().nullable(),
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
      const flat = parsed.error.flatten();
      const firstField = Object.values(flat.fieldErrors)[0]?.[0];
      const firstForm  = flat.formErrors[0];
      const message    = firstField ?? firstForm ?? "Invalid request data";
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const d = parsed.data;
    if (d.storeId !== store.id) {
      return NextResponse.json({ error: "Invalid store" }, { status: 400 });
    }

    // Validate products and stock — when a size is specified and the
    // product actually has sizes, that size's own stock governs; otherwise
    // fall back to the plain product-level stock (unsized products, and any
    // stray size sent for a product that no longer has one).
    for (const item of d.items) {
      const product = await queryOne<{ id: string; stock_quantity: number; has_sizes: boolean }>(
        "SELECT id, stock_quantity, has_sizes FROM products WHERE id = $1 AND store_id = $2 AND is_active = true",
        [item.productId, store.id]
      );
      if (!product) {
        return NextResponse.json({ error: `Product not available` }, { status: 400 });
      }
      if (product.has_sizes && item.size) {
        const size = await queryOne<{ stock_quantity: number }>(
          "SELECT stock_quantity FROM product_sizes WHERE product_id = $1 AND label = $2",
          [item.productId, item.size]
        );
        if (!size) {
          return NextResponse.json({ error: `Size "${item.size}" is not available` }, { status: 400 });
        }
        if (size.stock_quantity < item.quantity) {
          return NextResponse.json({ error: `Insufficient stock for size "${item.size}"` }, { status: 400 });
        }
      } else if (product.has_sizes) {
        return NextResponse.json({ error: `Please select a size` }, { status: 400 });
      } else if (product.stock_quantity < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock` }, { status: 400 });
      }
    }

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    // Map "transfer" → "bank_transfer" for the CHECK constraint
    const dbPaymentMethod = d.paymentMethod === "transfer" ? "bank_transfer" : "paystack";

    const result = await withTransaction(async (client) => {
      const discountAmt = d.discountAmount ?? 0;
      const finalTotal = Math.max(0, d.totalAmount - discountAmt);

      const orderRows = await client.query(
        `INSERT INTO orders (
          store_id, order_number, customer_name, customer_email, customer_phone,
          delivery_address, delivery_city, delivery_state, delivery_note,
          subtotal, total, payment_method, coupon_code, discount_amount
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id, order_number`,
        [
          store.id, orderNumber,
          d.customerName,
          d.customerEmail || null,
          d.customerPhone,
          d.deliveryAddress,
          d.deliveryCity || null,
          d.deliveryState || null,
          d.deliveryNote || null,
          d.totalAmount,
          finalTotal,
          dbPaymentMethod,
          d.couponCode || null,
          discountAmt,
        ]
      );

      const order = orderRows.rows[0];

      for (const item of d.items) {
        // Get product name for order_items
        const prod = await client.query(
          "SELECT name, image_url, images, has_sizes FROM products WHERE id = $1",
          [item.productId]
        );
        const p = prod.rows[0];
        const img = p.image_url || p.images?.[0] || null;
        const size = p.has_sizes && item.size ? item.size : null;

        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, product_image, size, price, quantity, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [order.id, item.productId, p.name, img, size, item.unitPrice, item.quantity, item.unitPrice * item.quantity]
        );

        if (size) {
          // Re-check under the transaction to prevent a race between two
          // concurrent checkouts oversubscribing the same size.
          const sizeRow = await client.query(
            `UPDATE product_sizes SET stock_quantity = stock_quantity - $1, updated_at = NOW()
             WHERE product_id = $2 AND label = $3 AND stock_quantity >= $1 RETURNING id`,
            [item.quantity, item.productId, size]
          );
          if (sizeRow.rows.length === 0) {
            throw new InsufficientStockError(`Insufficient stock for size "${size}"`);
          }
        }

        // stock_quantity stays the sum for sized products too, so every
        // other consumer of that column keeps working unmodified.
        await client.query(
          "UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2",
          [item.quantity, item.productId]
        );
      }

      // Increment coupon usage if one was applied
      if (d.couponCode) {
        await client.query(
          "UPDATE coupons SET uses_count = uses_count + 1 WHERE store_id = $1 AND code = $2",
          [store.id, d.couponCode.toUpperCase()]
        );
      }

      return order;
    });

    // Fire-and-forget — don't await so push never delays the response.
    // Two independent channels for the same event: the existing Expo push
    // (duka-vendors mobile app) and Web Push (installed PWA/browser) — a
    // vendor may have either or both, so both fire rather than one
    // falling back to the other.
    notifyStoreNewOrder(
      store.id,
      result.id,
      result.order_number,
      d.customerName,
      d.totalAmount
    ).catch(() => {});

    sendWebPushToSubject("vendor", store.id, {
      title: "New Order Received",
      body: `${result.order_number} · ${d.customerName} · ₦${d.totalAmount.toLocaleString("en-NG")}`,
      url: "/dashboard/orders",
    }).catch(() => {});

    return NextResponse.json(
      { orderId: result.id, orderNumber: result.order_number },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[storefront/orders] error:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { queryOne, query, withTransaction } from "@/lib/db";
import { getCompany, verifySession, getOrCreateCustomer } from "@/lib/auth";
import { notifyStoreNewOrder } from "@/lib/push";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  AFFILIATE_COOKIE,
  resolveActiveAffiliate,
  computeCommission,
} from "@/lib/affiliates";
import { z } from "zod";

// Authenticated customers only. Places a real order for the "Add to Cart"
// purchase path (as opposed to /api/quote-requests, the no-payment lead path).
// Prices and totals are always computed server-side from the products table.
const OrderSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(5),
  deliveryAddress: z.string().min(1),
  deliveryCity: z.string().optional().default(""),
  deliveryState: z.string().optional().default(""),
  deliveryNote: z.string().optional(),
  paymentMethod: z.enum(["paystack", "transfer"]),
  // Sent by the client for display only. Used solely to detect a stale cart.
  totalAmount: z.number().min(0).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(1000),
        // Accepted for backwards compatibility but ignored.
        unitPrice: z.number().optional(),
      }),
    )
    .min(1),
  // customerEmail from the client is intentionally not part of the schema:
  // zod strips it, and we use the authenticated session's email instead.
});

class OrderError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

interface ProductRow {
  id: string;
  name: string;
  image_url: string | null;
  images: string[] | null;
  price: string | number;
  stock_quantity: number;
  is_purchasable: boolean;
}

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, {
    key: "rl:orders",
    max: 10,
    window: 600,
    message:
      "Too many requests. Please wait a few minutes before trying again.",
  });
  if (limited) return limited;

  try {
    // ── Auth: must be signed in ──
    const session = await verifySession();
    if (!session) {
      return NextResponse.json(
        { error: "Please sign in to place an order" },
        { status: 401 },
      );
    }

    const company = await getCompany();
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const customer = await getOrCreateCustomer(session);
    if (!customer) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = OrderSchema.safeParse(body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const firstField = Object.values(flat.fieldErrors)[0]?.[0];
      const firstForm = flat.formErrors[0];
      const message = firstField ?? firstForm ?? "Invalid request data";
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const d = parsed.data;
    const orderEmail = session.email || customer.email || null;

    // Merge duplicate product lines so quantities can't dodge stock checks,
    // and sort for a consistent lock order (avoids deadlocks).
    const merged = new Map<string, number>();
    for (const it of d.items) {
      merged.set(it.productId, (merged.get(it.productId) ?? 0) + it.quantity);
    }
    const lines = [...merged.entries()]
      .map(([productId, quantity]) => ({ productId, quantity }))
      .sort((a, b) => a.productId.localeCompare(b.productId));

    // Validate products and price everything from the database
    const priced: {
      product: ProductRow;
      quantity: number;
      unitPrice: number;
    }[] = [];
    for (const line of lines) {
      const product = await queryOne<ProductRow>(
        `SELECT id, name, image_url, images, price, stock_quantity, is_purchasable
         FROM products WHERE id = $1 AND store_id = $2 AND is_active = true`,
        [line.productId, company.id],
      );
      if (!product) {
        return NextResponse.json(
          { error: "Product not available" },
          { status: 400 },
        );
      }
      if (!product.is_purchasable) {
        return NextResponse.json(
          {
            error: `${product.name} is quote-only and can't be purchased directly`,
          },
          { status: 400 },
        );
      }
      if (product.stock_quantity < line.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 },
        );
      }
      priced.push({
        product,
        quantity: line.quantity,
        unitPrice: Number(product.price),
      });
    }

    const subtotal =
      Math.round(
        priced.reduce((s, l) => s + l.unitPrice * l.quantity, 0) * 100,
      ) / 100;
    const total = subtotal; // delivery fee is "to be arranged", so not part of the total yet

    // If the cart the customer saw doesn't match current prices, make them refresh
    if (d.totalAmount !== undefined && Math.abs(d.totalAmount - total) > 0.01) {
      return NextResponse.json(
        {
          error:
            "Some prices have changed. Please refresh your cart and try again.",
        },
        { status: 409 },
      );
    }

    // Affiliate attribution — stale/unknown/inactive code is ignored, never blocks checkout.
    const refCode = req.cookies.get(AFFILIATE_COOKIE)?.value;
    const affiliate = refCode
      ? await resolveActiveAffiliate(company.id, refCode)
      : null;
    const commissionAmount = affiliate
      ? computeCommission(subtotal, affiliate.commissionRate)
      : 0;

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const dbPaymentMethod =
      d.paymentMethod === "transfer" ? "bank_transfer" : "paystack";

    const result = await withTransaction(async (client) => {
      const orderRows = await client.query(
        `INSERT INTO orders (
          store_id, customer_id, order_number, customer_name, customer_email, customer_phone,
          delivery_address, delivery_city, delivery_state, delivery_note,
          subtotal, total, payment_method, affiliate_id, affiliate_code, commission_amount
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id, order_number`,
        [
          company.id,
          customer.id,
          orderNumber,
          d.customerName,
          orderEmail,
          d.customerPhone,
          d.deliveryAddress,
          d.deliveryCity || null,
          d.deliveryState || null,
          d.deliveryNote || null,
          subtotal,
          total,
          dbPaymentMethod,
          affiliate?.id ?? null,
          affiliate?.code ?? null,
          commissionAmount,
        ],
      );

      const order = orderRows.rows[0];

      for (const { product, quantity, unitPrice } of priced) {
        // Atomic stock decrement: fails if someone else bought the last units meanwhile
        const upd = await client.query(
          "UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND stock_quantity >= $1",
          [quantity, product.id],
        );
        if (upd.rowCount === 0) {
          throw new OrderError(`Insufficient stock for ${product.name}`);
        }

        const img = product.image_url || product.images?.[0] || null;
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            order.id,
            product.id,
            product.name,
            img,
            unitPrice,
            quantity,
            unitPrice * quantity,
          ],
        );
      }

      return order;
    });

    notifyStoreNewOrder(
      company.id,
      result.id,
      result.order_number,
      d.customerName,
      total,
    ).catch(() => {});

    // Save delivery details to the customer's profile — best-effort, never blocks the order.
    query(
      `UPDATE customers SET name = $1, phone = $2, address = $3, city = $4, state = $5, updated_at = NOW() WHERE id = $6`,
      [
        d.customerName,
        d.customerPhone,
        d.deliveryAddress,
        d.deliveryCity || null,
        d.deliveryState || null,
        customer.id,
      ],
    ).catch(() => {});
    // First order also seeds the address book (only if it's still empty)
    query(
      `INSERT INTO customer_addresses (customer_id, label, recipient_name, phone, address, city, state, is_default)
       SELECT $1, 'Home', $2, $3, $4, $5, $6, TRUE
       WHERE NOT EXISTS (SELECT 1 FROM customer_addresses WHERE customer_id = $1)`,
      [
        customer.id,
        d.customerName,
        d.customerPhone,
        d.deliveryAddress,
        d.deliveryCity || null,
        d.deliveryState || null,
      ],
    ).catch(() => {});

    return NextResponse.json(
      { orderId: result.id, orderNumber: result.order_number },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[orders] POST error:", err);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 },
    );
  }
}

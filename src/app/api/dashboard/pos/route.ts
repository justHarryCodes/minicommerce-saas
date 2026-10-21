import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/plan";
import { newOrderNumber } from "@/lib/order-number";
import { z } from "zod";
import { verifySession } from "@/lib/auth";
import { getAccessFor, can } from "@/lib/access";
import { queryOne, withTransaction } from "@/lib/db";
import { computeTotals } from "@/lib/order-pricing";
import { checkGiftCard, GiftCardBalanceError, redeemGiftCard } from "@/lib/gift-cards";
import { alertLowStock, crossedLowStock, effectiveThreshold, recordMovements, type StockChange } from "@/lib/inventory";
import { getStoreUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

class PosStockError extends Error {}

const SaleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(999),
        size: z.string().max(50).optional().nullable(),
      })
    )
    .min(1)
    .max(200),
  paymentMethod: z.enum(["cash", "transfer", "card_terminal"]),
  /** Flat ₦ off the sale — owners & managers only */
  discount: z.number().int().min(0).max(100_000_000).optional().default(0),
  giftCardCode: z.string().trim().max(40).optional().nullable(),
  customerName: z.string().trim().max(120).optional().nullable(),
  customerPhone: z.string().trim().max(30).optional().nullable(),
  customerEmail: z.string().trim().email().max(200).optional().nullable().or(z.literal("")),
  note: z.string().trim().max(300).optional().nullable(),
});

/**
 * Ring up an in-person sale. Same rules as an online order — prices come
 * from the database and stock is decremented atomically — but it's paid
 * and handed over on the spot, so it's created as paid + delivered.
 */
export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await getAccessFor(user, "pos");
  if (!access) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const denied = await requireFeature(access.store.id, "pos");
  if (denied) return denied;
  const { store, role } = access;

  const parsed = SaleSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid sale" }, { status: 422 });
  }
  const d = parsed.data;
  if (d.discount > 0 && !can(role, "products")) {
    return NextResponse.json({ error: "Only a manager or the owner can give a discount" }, { status: 403 });
  }

  // ── Price every line from the database ─────────────────────────────────
  const storeThreshold = Number(store.lowStockThreshold ?? store.low_stock_threshold ?? 3);
  const lines: { productId: string; name: string; image: string | null; size: string | null; price: number; quantity: number; threshold: number }[] = [];
  for (const item of d.items) {
    const product = await queryOne<{
      id: string; name: string; price: number; stock_quantity: number; has_sizes: boolean; image_url: string | null;
      images: string[] | null; low_stock_threshold: number | null; is_bookable: boolean | null;
    }>(
      `SELECT id, name, price, stock_quantity, has_sizes, image_url, images, low_stock_threshold, is_bookable
       FROM products WHERE id = $1 AND store_id = $2`,
      [item.productId, store.id]
    );
    if (!product) return NextResponse.json({ error: "A product in this sale no longer exists" }, { status: 400 });
    if (product.is_bookable) return NextResponse.json({ error: `${product.name} is a service — book it from Bookings` }, { status: 400 });

    let price = Number(product.price);
    let image = product.image_url || product.images?.[0] || null;
    if (product.has_sizes) {
      if (!item.size) return NextResponse.json({ error: `Choose a size for ${product.name}` }, { status: 400 });
      const size = await queryOne<{ stock_quantity: number; price: number | null; image_url: string | null }>(
        "SELECT stock_quantity, price, image_url FROM product_sizes WHERE product_id = $1 AND label = $2",
        [product.id, item.size]
      );
      if (!size) return NextResponse.json({ error: `${product.name}: size "${item.size}" not found` }, { status: 400 });
      if (size.stock_quantity < item.quantity) {
        return NextResponse.json({ error: `Only ${size.stock_quantity} × ${product.name} (${item.size}) in stock` }, { status: 400 });
      }
      if (size.price != null) price = Number(size.price);
      image = size.image_url || image;
    } else if (product.stock_quantity < item.quantity) {
      return NextResponse.json({ error: `Only ${product.stock_quantity} × ${product.name} in stock` }, { status: 400 });
    }
    lines.push({
      productId: product.id,
      name: product.name,
      image,
      size: product.has_sizes ? item.size ?? null : null,
      price,
      quantity: item.quantity,
      threshold: effectiveThreshold(product.low_stock_threshold, storeThreshold),
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  let giftCard: { id: string; code: string; balance: number } | null = null;
  if (d.giftCardCode) {
    const g = await checkGiftCard(store.id, d.giftCardCode);
    if (!g.ok) return NextResponse.json({ error: g.error }, { status: 400 });
    giftCard = g;
  }

  const totals = computeTotals({
    subtotal,
    discount: d.discount,
    deliveryFee: 0,
    payOnDelivery: false,
    depositPercent: 0,
    giftCardBalance: giftCard?.balance ?? 0,
  });
  const paymentMethod =
    totals.total === 0 && totals.giftCard > 0 ? "gift_card" : d.paymentMethod === "transfer" ? "bank_transfer" : d.paymentMethod;
  const orderNumber = newOrderNumber("POS");
  const lowStock: { productId: string; name: string; label: string | null; stock: number }[] = [];

  try {
    const order = await withTransaction(async (client) => {
      const res = await client.query<{ id: string; order_number: string; access_token: string }>(
        `INSERT INTO orders (
           store_id, order_number, customer_name, customer_email, customer_phone,
           delivery_address, delivery_city, delivery_state, delivery_note, delivery_method, delivery_fee,
           subtotal, total, total_amount, deposit_amount, payment_method, payment_status, order_status,
           discount_amount, gift_card_code, gift_card_amount, channel, created_by
         ) VALUES ($1,$2,$3,$4,$5,'In store',NULL,NULL,$6,'pickup',0,$7,$8,$8,0,$9,'paid','delivered',$10,$11,$12,'pos',$13)
         RETURNING id, order_number, access_token`,
        [
          store.id, orderNumber, d.customerName || "Walk-in customer", d.customerEmail || null, d.customerPhone || "",
          d.note || null, totals.subtotal, totals.total, paymentMethod, totals.discount,
          giftCard && totals.giftCard > 0 ? giftCard.code : null, totals.giftCard, user.firebaseUid,
        ]
      );
      const o = res.rows[0];

      const changes: StockChange[] = [];
      for (const line of lines) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, product_image, size, price, quantity, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [o.id, line.productId, line.name, line.image, line.size, line.price, line.quantity, line.price * line.quantity]
        );
        let variantAfter: number | null = null;
        if (line.size) {
          const v = await client.query<{ stock_quantity: number }>(
            `UPDATE product_sizes SET stock_quantity = stock_quantity - $1, updated_at = NOW()
             WHERE product_id = $2 AND label = $3 AND stock_quantity >= $1 RETURNING stock_quantity`,
            [line.quantity, line.productId, line.size]
          );
          if (!v.rows.length) throw new PosStockError(`${line.name} (${line.size}) just sold out`);
          variantAfter = v.rows[0].stock_quantity;
        }
        const p = await client.query<{ stock_quantity: number }>(
          `UPDATE products SET stock_quantity = stock_quantity - $1
           WHERE id = $2 AND store_id = $4 AND ($3::boolean OR stock_quantity >= $1) RETURNING stock_quantity`,
          [line.quantity, line.productId, !!line.size, store.id]
        );
        if (!p.rows.length) throw new PosStockError(`${line.name} just sold out`);
        const governing = line.size ? variantAfter : p.rows[0].stock_quantity;
        changes.push({ productId: line.productId, productName: line.name, variantLabel: line.size, change: -line.quantity, stockAfter: governing });
        if (governing != null && crossedLowStock(governing + line.quantity, governing, line.threshold)) {
          lowStock.push({ productId: line.productId, name: line.name, label: line.size, stock: governing });
        }
      }
      await recordMovements(client, store.id, "order", changes, o.id);

      if (giftCard && totals.giftCard > 0) await redeemGiftCard(client, giftCard.id, totals.giftCard, o.id);
      return o;
    });

    void alertLowStock(store.id, lowStock);

    const base = getStoreUrl(store.slug, store.customDomain ?? store.custom_domain ?? null);
    return NextResponse.json(
      {
        orderId: order.id,
        orderNumber: order.order_number,
        totals,
        paymentMethod,
        receiptUrl: `${base}/receipt/${order.order_number}?t=${order.access_token}`,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof PosStockError || err instanceof GiftCardBalanceError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[pos] sale failed:", err);
    return NextResponse.json({ error: "Couldn't complete the sale" }, { status: 500 });
  }
}

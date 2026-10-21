import { NextRequest, NextResponse } from "next/server";
import { queryOne, withTransaction } from "@/lib/db";
import { notifyStoreNewOrder } from "@/lib/push";
import { sendWebPushToSubject } from "@/lib/webpush";
import { checkCoupon } from "@/lib/coupons";
import { deliverySettingsOf, podSettingsOf, quoteDelivery } from "@/lib/delivery";
import { computeTotals } from "@/lib/order-pricing";
import { notifyCustomer } from "@/lib/notify/order-messages";
import { checkRateLimit } from "@/lib/rate-limit";
import { describeInstant, isOpenAt, lagosParts, nextOpening, parseHours } from "@/lib/hours";
import { BookingConflictError, reserveSlot } from "@/lib/bookings-server";
import { alertLowStock, crossedLowStock, effectiveThreshold, recordMovements, type StockChange } from "@/lib/inventory";
import { checkGiftCard, GiftCardBalanceError, redeemGiftCard } from "@/lib/gift-cards";
import { loyaltyDiscount, loyaltyFor } from "@/lib/loyalty";
import { z } from "zod";

// Thrown from inside the order transaction when a size's stock was raced
// out from under us between the pre-check and the atomic decrement —
// caught below and surfaced as 409, not a generic 500.
class InsufficientStockError extends Error {}

// Prices, discounts, delivery fees and totals are all computed here from
// the database. Any amounts the client sends (older checkout builds still
// send unitPrice/totalAmount/discountAmount) are ignored.
const OrderSchema = z.object({
  storeId: z.string().uuid(),
  customerName: z.string().trim().min(1).max(120),
  customerEmail: z.string().trim().email().optional().or(z.literal("")),
  customerPhone: z.string().trim().min(5).max(30),
  deliveryAddress: z.string().trim().max(300).optional().default(""),
  deliveryCity: z.string().trim().max(80).optional().default(""),
  deliveryState: z.string().trim().max(80).optional().default(""),
  deliveryNote: z.string().trim().max(500).optional(),
  deliveryMethod: z.enum(["delivery", "pickup", "appointment"]).optional().default("delivery"),
  deliveryZoneId: z.string().max(40).optional().nullable(),
  paymentMethod: z.enum(["paystack", "transfer", "pay_on_delivery"]),
  couponCode: z.string().max(40).optional().nullable(),
  giftCardCode: z.string().max(40).optional().nullable(),
  checkoutToken: z.string().max(64).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(999),
        size: z.string().max(50).optional().nullable(),
        // Bookable services: the chosen slot (and optionally a staff member)
        booking: z
          .object({ startsAt: z.string().datetime(), staffId: z.string().uuid().nullable().optional() })
          .optional()
          .nullable(),
      })
    )
    .min(1)
    .max(100),
});

type StoreRow = {
  id: string;
  is_active: boolean;
  payment_preference: string | null;
  delivery_zones: unknown;
  free_delivery_threshold: number | null;
  pickup_enabled: boolean;
  pickup_address: string | null;
  pod_enabled: boolean;
  pod_deposit_percent: number;
  low_stock_threshold?: number | null;
  opening_hours?: unknown;
  allow_preorders?: boolean;
  minimum_order?: number | null;
  loyalty_every_n?: number | null;
  loyalty_percent?: number | null;
  [key: string]: unknown;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const limited = await checkRateLimit(req, { key: "rl:order", max: 20, window: 600 });
    if (limited) return limited;

    const { slug } = await params;

    const store = await queryOne<StoreRow>(
      `SELECT id, is_active, payment_preference, delivery_zones, free_delivery_threshold,
              pickup_enabled, pickup_address, pod_enabled, pod_deposit_percent, low_stock_threshold,
              opening_hours, allow_preorders, minimum_order, booking_slot_minutes, booking_buffer_minutes,
              booking_window_days, booking_min_notice_minutes, loyalty_every_n, loyalty_percent
       FROM stores WHERE slug = $1`,
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
    if (d.deliveryMethod === "delivery" && !d.deliveryAddress && d.items.length > 0 && !d.items.every((i) => i.booking)) {
      return NextResponse.json({ error: "Delivery address is required" }, { status: 422 });
    }

    // ── Payment method allowed for this store? ─────────────────────────────
    const pref = store.payment_preference ?? "paystack";
    const pod = podSettingsOf(store);
    const allowed =
      d.paymentMethod === "pay_on_delivery"
        ? pod.enabled
        : d.paymentMethod === "paystack"
          ? pref === "paystack" || pref === "both"
          : pref === "bank_transfer" || pref === "both";
    if (!allowed) {
      return NextResponse.json({ error: "That payment method isn't available for this store" }, { status: 400 });
    }

    // ── Validate products + stock, and price every line from the DB ────────
    // When a size is specified and the product actually has sizes, that
    // size's own stock governs; otherwise the plain product-level stock.
    const lines: {
      productId: string; quantity: number; size: string | null; price: number; name: string; image: string | null;
      threshold: number;
      booking: { startsAt: string; staffId: string | null; durationMinutes: number | null } | null;
    }[] = [];
    const lagosToday = lagosParts(new Date()).date;
    for (const item of d.items) {
      const product = await queryOne<{
        id: string; name: string; price: number; stock_quantity: number; has_sizes: boolean;
        image_url: string | null; images: string[] | null; low_stock_threshold?: number | null;
        is_bookable?: boolean; duration_minutes?: number | null; sold_out_until?: string | Date | null;
      }>(
        `SELECT id, name, price, stock_quantity, has_sizes, image_url, images, low_stock_threshold,
                is_bookable, duration_minutes, sold_out_until
         FROM products WHERE id = $1 AND store_id = $2 AND is_active = true`,
        [item.productId, store.id]
      );
      if (!product) {
        return NextResponse.json({ error: `Product not available` }, { status: 400 });
      }
      if (product.sold_out_until && isoDate(product.sold_out_until) >= lagosToday) {
        return NextResponse.json({ error: `${product.name} is sold out for today` }, { status: 400 });
      }

      // Bookable services: one appointment per line, no stock to check.
      if (product.is_bookable) {
        if (!item.booking) {
          return NextResponse.json({ error: `Please choose a time for ${product.name}` }, { status: 400 });
        }
        lines.push({
          productId: product.id,
          quantity: 1,
          size: null,
          price: Number(product.price),
          name: product.name,
          image: product.image_url || product.images?.[0] || null,
          threshold: 0,
          booking: { startsAt: item.booking.startsAt, staffId: item.booking.staffId ?? null, durationMinutes: product.duration_minutes ?? null },
        });
        continue;
      }
      // A variant may carry its own price and photo (e.g. XXL costs more).
      let variantPrice: number | null = null;
      let variantImage: string | null = null;
      if (product.has_sizes && item.size) {
        const size = await queryOne<{ stock_quantity: number; price?: number | null; image_url?: string | null }>(
          "SELECT stock_quantity, price, image_url FROM product_sizes WHERE product_id = $1 AND label = $2",
          [item.productId, item.size]
        );
        if (!size) {
          return NextResponse.json({ error: `Size "${item.size}" is not available` }, { status: 400 });
        }
        if (size.stock_quantity < item.quantity) {
          return NextResponse.json({ error: `Insufficient stock for size "${item.size}"` }, { status: 400 });
        }
        variantPrice = size.price != null ? Number(size.price) : null;
        variantImage = size.image_url ?? null;
      } else if (product.has_sizes) {
        return NextResponse.json({ error: `Please select a size` }, { status: 400 });
      } else if (product.stock_quantity < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock` }, { status: 400 });
      }
      lines.push({
        productId: product.id,
        quantity: item.quantity,
        size: product.has_sizes && item.size ? item.size : null,
        price: variantPrice ?? Number(product.price),
        name: product.name,
        image: variantImage || product.image_url || product.images?.[0] || null,
        threshold: effectiveThreshold(product.low_stock_threshold, store.low_stock_threshold),
        booking: null,
      });
    }

    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    const allBookable = lines.every((l) => l.booking);
    const hasGoods = lines.some((l) => !l.booking);
    if (d.deliveryMethod === "appointment" && !allBookable) {
      return NextResponse.json({ error: "Please choose delivery or pickup for the products in your cart" }, { status: 400 });
    }

    // ── Opening hours: closed → schedule for the next opening (or refuse) ──
    let scheduledFor: Date | null = null;
    const hours = parseHours(store.opening_hours);
    if (hours && hasGoods && !isOpenAt(hours, new Date())) {
      const next = nextOpening(hours, new Date());
      if (store.allow_preorders === false || !next) {
        return NextResponse.json(
          { error: `We're closed right now${next ? ` — we open ${describeInstant(next, new Date())}` : ""}. Please order again then.` },
          { status: 400 }
        );
      }
      scheduledFor = next;
    }

    // ── Coupon (re-checked against real prices) ────────────────────────────
    let discount = 0;
    let couponCode: string | null = null;
    if (d.couponCode?.trim()) {
      const c = await checkCoupon(store.id, d.couponCode, subtotal);
      if (!c.valid) return NextResponse.json({ error: c.error }, { status: 400 });
      discount = c.discount;
      couponCode = d.couponCode.trim().toUpperCase();
    }

    // ── Minimum order (measured after discounts, before delivery) ──────────
    const minimum = store.minimum_order != null ? Number(store.minimum_order) : 0;
    if (minimum > 0 && subtotal - discount < minimum) {
      return NextResponse.json({ error: `The minimum order is ₦${minimum.toLocaleString("en-NG")}` }, { status: 400 });
    }

    // ── Delivery (appointments have nothing to deliver) ────────────────────
    const delivery = deliverySettingsOf(store);
    const quote: ReturnType<typeof quoteDelivery> | { ok: true; method: "appointment"; fee: 0; zoneName: null; freeApplied: false } =
      allBookable && (d.deliveryMethod === "appointment" || !hasGoods)
        ? { ok: true, method: "appointment", fee: 0, zoneName: null, freeApplied: false }
        : quoteDelivery(
            delivery,
            d.deliveryMethod === "pickup" ? { method: "pickup" } : { method: "delivery", zoneId: d.deliveryZoneId },
            Math.max(0, subtotal - discount)
          );
    if (!quote.ok) return NextResponse.json({ error: quote.error }, { status: 400 });

    // ── Loyalty: every Nth order from this phone number gets X% off ──────
    // Measured on goods after the coupon; doesn't affect the minimum order
    // or free-delivery threshold (a reward should never cost the customer).
    let loyalty = 0;
    const reward = await loyaltyFor(store, d.customerPhone);
    if (reward?.eligible) loyalty = loyaltyDiscount(subtotal - discount, reward.percent);

    // ── Gift card / store credit (balance re-checked in the transaction) ───
    let giftCard: { id: string; code: string; balance: number } | null = null;
    if (d.giftCardCode?.trim()) {
      const g = await checkGiftCard(store.id, d.giftCardCode);
      if (!g.ok) return NextResponse.json({ error: g.error }, { status: 400 });
      giftCard = g;
    }

    const isPod = d.paymentMethod === "pay_on_delivery";
    const totals = computeTotals({
      subtotal,
      discount: discount + loyalty,
      deliveryFee: quote.fee,
      payOnDelivery: isPod,
      depositPercent: pod.depositPercent,
      giftCardBalance: giftCard?.balance ?? 0,
    });
    // A gift card that covers everything leaves nothing to pay
    const fullyCovered = totals.total === 0 && totals.giftCard > 0;

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    // Map "transfer" → "bank_transfer" for the CHECK constraint
    const dbPaymentMethod = fullyCovered
      ? "gift_card"
      : d.paymentMethod === "transfer" ? "bank_transfer" : d.paymentMethod === "pay_on_delivery" ? "pay_on_delivery" : "paystack";
    const pickup = quote.method === "pickup";
    const appointment = quote.method === "appointment";

    const stockChanges: StockChange[] = [];
    const reserved: { product: string; startsAt: string }[] = [];
    const lowStock: { productId: string; name: string; label: string | null; stock: number }[] = [];
    const result = await withTransaction(async (client) => {
      const orderRows = await client.query(
        `INSERT INTO orders (
          store_id, order_number, customer_name, customer_email, customer_phone,
          delivery_address, delivery_city, delivery_state, delivery_note,
          delivery_method, delivery_zone, delivery_fee,
          subtotal, total, total_amount, deposit_amount,
          payment_method, coupon_code, discount_amount, scheduled_for,
          gift_card_code, gift_card_amount, loyalty_discount, payment_status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
        RETURNING id, order_number, access_token`,
        [
          store.id, orderNumber,
          d.customerName,
          d.customerEmail || null,
          d.customerPhone,
          appointment ? "Appointment" : pickup ? `Pickup${store.pickup_address ? `: ${store.pickup_address}` : ""}` : d.deliveryAddress,
          pickup || appointment ? null : d.deliveryCity || null,
          pickup || appointment ? null : d.deliveryState || null,
          d.deliveryNote || null,
          quote.method,
          quote.zoneName,
          totals.deliveryFee,
          totals.subtotal,
          totals.total,
          totals.deposit,
          dbPaymentMethod,
          couponCode,
          totals.discount,
          scheduledFor ? scheduledFor.toISOString() : null,
          giftCard && totals.giftCard > 0 ? giftCard.code : null,
          totals.giftCard,
          loyalty,
          fullyCovered ? "paid" : "pending",
        ]
      );

      const order = orderRows.rows[0];

      if (giftCard && totals.giftCard > 0) {
        await redeemGiftCard(client, giftCard.id, totals.giftCard, order.id);
      }

      for (const line of lines) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, product_image, size, price, quantity, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [order.id, line.productId, line.name, line.image, line.size, line.price, line.quantity, line.price * line.quantity]
        );

        // Services: reserve the slot (throws if it was just taken); no stock.
        if (line.booking) {
          const b = await reserveSlot(client, {
            store,
            product: { id: line.productId, name: line.name, duration_minutes: line.booking.durationMinutes },
            startsAt: line.booking.startsAt,
            staffId: line.booking.staffId,
            orderId: order.id,
            customerName: d.customerName,
            customerPhone: d.customerPhone,
          });
          reserved.push({ product: line.name, startsAt: b.starts_at });
          continue;
        }

        let variantStockAfter: number | null = null;
        if (line.size) {
          // Re-check under the transaction to prevent a race between two
          // concurrent checkouts oversubscribing the same size.
          const sizeRow = await client.query(
            `UPDATE product_sizes SET stock_quantity = stock_quantity - $1, updated_at = NOW()
             WHERE product_id = $2 AND label = $3 AND stock_quantity >= $1 RETURNING id, stock_quantity`,
            [line.quantity, line.productId, line.size]
          );
          if (sizeRow.rows.length === 0) {
            throw new InsufficientStockError(`Insufficient stock for size "${line.size}"`);
          }
          variantStockAfter = sizeRow.rows[0]?.stock_quantity ?? null;
        }

        // stock_quantity stays the sum for sized products too, so every
        // other consumer of that column keeps working unmodified.
        const productRow = await client.query(
          "UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2 RETURNING stock_quantity",
          [line.quantity, line.productId]
        );
        const productStockAfter: number | null = productRow?.rows?.[0]?.stock_quantity ?? null;

        // The stock that governs this line: the variant's own, else the product's.
        const governing = line.size ? variantStockAfter : productStockAfter;
        stockChanges.push({
          productId: line.productId,
          productName: line.name,
          variantLabel: line.size,
          change: -line.quantity,
          stockAfter: governing,
        });
        if (governing != null && crossedLowStock(governing + line.quantity, governing, line.threshold)) {
          lowStock.push({ productId: line.productId, name: line.name, label: line.size, stock: governing });
        }
      }

      await recordMovements(client, store.id, "order", stockChanges, order.id);

      if (couponCode) {
        await client.query(
          "UPDATE coupons SET uses_count = uses_count + 1 WHERE store_id = $1 AND code = $2",
          [store.id, couponCode]
        );
      }

      // This checkout came back and converted — stop any reminder for it.
      if (d.checkoutToken) {
        await client.query(
          `UPDATE checkout_sessions SET status = 'recovered', order_id = $1, updated_at = NOW()
           WHERE store_id = $2 AND token = $3 AND status = 'open'`,
          [order.id, store.id, d.checkoutToken]
        );
      }

      return order as { id: string; order_number: string; access_token: string };
    });

    void alertLowStock(store.id, lowStock);

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
      totals.total
    ).catch(() => {});

    sendWebPushToSubject("vendor", store.id, {
      title: "New Order Received",
      body: `${result.order_number} · ${d.customerName} · ₦${totals.total.toLocaleString("en-NG")}`,
      url: "/dashboard/orders",
    }).catch(() => {});

    // Orders paid online now get their first message once Paystack confirms
    // payment (see paystack callback/webhook); the rest are confirmed now.
    const paysOnlineNow = !fullyCovered && (dbPaymentMethod === "paystack" || totals.deposit > 0);
    if (!paysOnlineNow) void notifyCustomer(result.id, "placed");

    return NextResponse.json(
      {
        orderId: result.id,
        orderNumber: result.order_number,
        accessToken: result.access_token,
        totals,
        paysOnlineNow,
        scheduledFor: scheduledFor ? scheduledFor.toISOString() : null,
        bookings: reserved,
        loyaltyApplied: loyalty > 0 ? { amount: loyalty, percent: reward?.percent } : null,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof InsufficientStockError || err instanceof BookingConflictError || err instanceof GiftCardBalanceError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[storefront/orders] error:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}


/** pg returns DATE columns as Date objects (or strings) — normalise to YYYY-MM-DD. */
function isoDate(v: string | Date): string {
  if (typeof v === "string") return v.slice(0, 10);
  // DATE → local-midnight Date in the server's timezone; read it back the same way
  return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
}

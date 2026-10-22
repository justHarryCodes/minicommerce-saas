import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { startPayment } from "@/lib/payments";

export async function POST(req: NextRequest) {
  try {
    const limited = await checkRateLimit(req, { key: "rl:pay-init", max: 30, window: 600 });
    if (limited) return limited;

    // Any client-sent `amount` is ignored — the charge always comes from the
    // order row the server priced.
    const { orderId, email } = await req.json();

    if (!orderId || !email || typeof email !== "string" || email.length > 200) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const order = await queryOne<{
      id: string; store_id: string; order_number: string; total_amount: number | null; total: number;
      deposit_amount: number; payment_method: string; payment_status: string;
    }>(
      `SELECT id, store_id, order_number, total_amount, total, deposit_amount, payment_method, payment_status
       FROM orders WHERE id = $1`,
      [orderId]
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.payment_status !== "pending") {
      return NextResponse.json({ error: "This order has already been paid" }, { status: 409 });
    }

    // Pay-on-delivery orders only pay their deposit online.
    const charge = Number(
      order.payment_method === "pay_on_delivery" ? order.deposit_amount : (order.total_amount ?? order.total)
    );
    if (!(charge > 0)) {
      return NextResponse.json({ error: "Nothing to pay online for this order" }, { status: 400 });
    }

    // One checkout per order: paying again reopens the same Paystack page,
    // and a checkout that was already paid is settled instead of charged twice.
    const started = await startPayment({
      kind: "order",
      storeId: order.store_id,
      targetId: order.id,
      amount: charge,
      email,
      referencePrefix: order.order_number,
      metadata: { orderId: order.id, orderNumber: order.order_number },
    });

    if (!started.ok) return NextResponse.json({ error: started.error }, { status: started.status });
    if ("alreadyPaid" in started) {
      return NextResponse.json({ error: "This order has already been paid", alreadyPaid: true }, { status: 409 });
    }

    // Latest reference on the order, for support look-ups
    await query("UPDATE orders SET payment_reference = $1 WHERE id = $2", [started.reference, order.id]);

    return NextResponse.json({ authorization_url: started.authorizationUrl, reference: started.reference });
  } catch (err) {
    console.error("[paystack/initialize] error:", err);
    return NextResponse.json({ error: "Failed to initialize payment" }, { status: 500 });
  }
}

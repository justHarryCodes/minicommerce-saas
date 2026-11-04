import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { startPayment } from "@/lib/payments";
import { dukaPayActive } from "@/lib/duka-pay";

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

    // Duka Pay: the store's share settles to its own bank via its subaccount.
    // Without a connected payout account there is no online payment at all —
    // Duka never collects a store's money into its own balance.
    const store = await queryOne<{ duka_pay_status: string | null; paystack_subaccount_code: string | null }>(
      "SELECT duka_pay_status, paystack_subaccount_code FROM stores WHERE id = $1",
      [order.store_id]
    );
    if (!dukaPayActive(store)) {
      return NextResponse.json({ error: "This store can't take online payments yet. Please choose another payment method." }, { status: 409 });
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
      subaccountCode: store!.paystack_subaccount_code,
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

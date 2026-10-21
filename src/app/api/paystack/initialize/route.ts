import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { initializeTransaction, getAppUrl } from "@/lib/paystack";

export async function POST(req: NextRequest) {
  try {
    // Any client-sent `amount` is ignored — the charge always comes from the
    // order row the server priced.
    const { orderId, email } = await req.json();

    if (!orderId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const order = await queryOne<{
      id: string; order_number: string; total_amount: number | null; total: number;
      deposit_amount: number; payment_method: string; payment_status: string;
    }>(
      `SELECT id, order_number, total_amount, total, deposit_amount, payment_method, payment_status
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

    const reference = `${order.order_number}-${Date.now()}`;
    const callbackUrl = `${getAppUrl()}/api/paystack/callback?orderId=${orderId}`;

    const result = await initializeTransaction({
      email,
      amount: charge,
      reference,
      callbackUrl,
      metadata: { orderId, orderNumber: order.order_number },
    });

    if (!result.status) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    // Save reference to order
    await queryOne(
      "UPDATE orders SET payment_reference = $1 WHERE id = $2",
      [reference, orderId]
    );

    return NextResponse.json({
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
    });
  } catch (err) {
    console.error("[paystack/initialize] error:", err);
    return NextResponse.json({ error: "Failed to initialize payment" }, { status: 500 });
  }
}

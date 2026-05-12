import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { initializeTransaction } from "@/lib/paystack";

export async function POST(req: NextRequest) {
  try {
    const { orderId, email, amount } = await req.json();

    if (!orderId || !email || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify order exists
    const order = await queryOne<{ id: string; order_number: string; total_amount: number }>(
      "SELECT id, order_number, total_amount FROM orders WHERE id = $1",
      [orderId]
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const reference = `${order.order_number}-${Date.now()}`;
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/paystack/callback?orderId=${orderId}`;

    const result = await initializeTransaction({
      email,
      amount: order.total_amount,
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

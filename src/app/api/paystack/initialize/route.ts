import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { initializeTransaction } from "@/lib/paystack";
import { verifySession, getOrCreateCustomer } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // ── Auth: must be signed in ──
    const session = await verifySession();
    if (!session) {
      return NextResponse.json(
        { error: "Please sign in to continue" },
        { status: 401 },
      );
    }
    const customer = await getOrCreateCustomer(session);
    if (!customer) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Only orderId is trusted from the client. Email and amount come from
    // the session and the order row.
    const { orderId } = await req.json();
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // The order must belong to THIS customer and be a Paystack order
    const order = await queryOne<{
      id: string;
      order_number: string;
      total_amount: number;
    }>(
      `SELECT id, order_number, total AS total_amount
       FROM orders
       WHERE id = $1 AND customer_id = $2 AND payment_method = 'paystack'`,
      [orderId, customer.id],
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const email = session.email || customer.email;
    if (!email) {
      return NextResponse.json(
        { error: "Your account has no email address" },
        { status: 400 },
      );
    }

    const reference = `${order.order_number}-${Date.now()}`;
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/paystack/callback?orderId=${order.id}`;

    const result = await initializeTransaction({
      email,
      amount: order.total_amount,
      reference,
      callbackUrl,
      metadata: { orderId: order.id, orderNumber: order.order_number },
    });

    if (!result.status) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    // Save reference to order
    await queryOne(
      "UPDATE orders SET payment_reference = $1 WHERE id = $2 AND customer_id = $3",
      [reference, order.id, customer.id],
    );

    return NextResponse.json({
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
    });
  } catch (err) {
    console.error("[paystack/initialize] error:", err);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 },
    );
  }
}

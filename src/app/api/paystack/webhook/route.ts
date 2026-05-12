import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    // Verify webhook signature
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY ?? "")
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === "charge.success") {
      const { reference, metadata } = event.data;
      const orderId = metadata?.orderId;

      if (orderId) {
        await query(
          `UPDATE orders 
           SET payment_status = 'paid', payment_reference = $1, order_status = 'confirmed'
           WHERE id = $2 AND payment_status = 'pending'`,
          [reference, orderId]
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[paystack/webhook] error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

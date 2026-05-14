import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { fulfillSubscriptionPayment } from "@/lib/billing-fulfillment";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    // Reject requests that fail HMAC signature verification
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY ?? "")
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event !== "charge.success") {
      return NextResponse.json({ received: true });
    }

    const { reference, metadata } = event.data as {
      reference: string;
      metadata?: Record<string, unknown>;
    };

    // ── Order payments ──────────────────────────────────────────────
    const orderId = metadata?.orderId as string | undefined;
    if (orderId) {
      // Verify reference matches the stored payment_reference before updating
      const order = await queryOne<{
        id: string;
        payment_reference: string | null;
        payment_status: string;
      }>(
        "SELECT id, payment_reference, payment_status FROM orders WHERE id = $1",
        [orderId]
      );

      if (
        order &&
        order.payment_reference === reference &&
        order.payment_status === "pending"
      ) {
        await query(
          `UPDATE orders
           SET payment_status = 'paid', order_status = 'confirmed'
           WHERE id = $1 AND payment_status = 'pending'`,
          [orderId]
        );
      }

      return NextResponse.json({ received: true });
    }

    // ── Subscription payments (setup_fee / monthly / plan) ──────────
    // Fallback: fires when the callback URL didn't reach the browser
    // (network failure, tab closed before redirect completed, etc.)
    const subPayment = await queryOne<{
      type: string;
      payment_status: string;
    }>(
      "SELECT type, payment_status FROM subscription_payments WHERE payment_reference = $1",
      [reference]
    );

    if (subPayment && subPayment.payment_status === "pending") {
      const validTypes = ["setup_fee", "monthly", "plan"];
      if (validTypes.includes(subPayment.type)) {
        await fulfillSubscriptionPayment(
          reference,
          subPayment.type as "setup_fee" | "monthly" | "plan"
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[paystack/webhook] error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

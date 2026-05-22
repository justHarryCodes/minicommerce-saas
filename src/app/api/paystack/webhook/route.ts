import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { fulfillSubscriptionPayment } from "@/lib/billing-fulfillment";
import crypto from "crypto";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

export async function POST(req: NextRequest) {
  // Hard fail at startup if secret is missing — never fall back to empty string
  if (!PAYSTACK_SECRET) {
    console.error("[paystack/webhook] PAYSTACK_SECRET_KEY is not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET)
      .update(body)
      .digest("hex");

    // Use timingSafeEqual to prevent timing attacks on signature comparison
    const hashBuf = Buffer.from(hash, "hex");
    const sigBuf  = Buffer.from(signature, "hex");
    const valid   =
      hashBuf.length === sigBuf.length &&
      crypto.timingSafeEqual(hashBuf, sigBuf);

    if (!valid) {
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
  } catch {
    // Log only a generic message — no stack traces or payload details in prod
    console.error("[paystack/webhook] Unhandled error processing event");
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

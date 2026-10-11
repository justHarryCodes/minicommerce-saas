import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";
import { verifyTransaction } from "@/lib/paystack";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const reference = searchParams.get("reference");
    const orderId = searchParams.get("orderId");

    if (!reference || !orderId) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const order = await queryOne<{
      id: string;
      payment_reference: string | null;
      payment_status: string;
      total: string | number;
    }>(
      "SELECT id, payment_reference, payment_status, total FROM orders WHERE id = $1",
      [orderId],
    );

    if (!order) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Idempotency: already processed
    if (order.payment_status === "paid") {
      return NextResponse.redirect(
        new URL(`/checkout?success=true&order=${orderId}`, req.url),
      );
    }

    // Reference must match what we stored at init time
    if (order.payment_reference !== reference) {
      return NextResponse.redirect(new URL(`/checkout?failed=true`, req.url));
    }

    const verification = await verifyTransaction(reference);
    const data = verification.data;

    if (data?.status === "success") {
      // Paystack amounts are in kobo. The paid amount must cover the order total.
      const expectedKobo = Math.round(Number(order.total) * 100);
      const paidKobo = Number(data.amount);
      const currencyOk = !data.currency || data.currency === "NGN";

      if (
        !currencyOk ||
        !Number.isFinite(paidKobo) ||
        paidKobo < expectedKobo
      ) {
        console.error("[paystack/callback] amount mismatch", {
          orderId,
          reference,
          expectedKobo,
          paidKobo,
          currency: data.currency,
        });
        return NextResponse.redirect(new URL(`/checkout?failed=true`, req.url));
      }

      await query(
        `UPDATE orders
         SET payment_status = 'paid', order_status = 'confirmed'
         WHERE id = $1 AND payment_status = 'pending'`,
        [orderId],
      );
      return NextResponse.redirect(
        new URL(`/checkout?success=true&order=${orderId}`, req.url),
      );
    }

    return NextResponse.redirect(new URL(`/checkout?failed=true`, req.url));
  } catch (err) {
    console.error("[paystack/callback] error:", err);
    return NextResponse.redirect(new URL("/", req.url));
  }
}

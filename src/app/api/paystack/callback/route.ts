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

    // Fetch order and validate that the reference matches what we stored at init time.
    // This prevents an attacker from passing a valid reference + a different orderId
    // to mark an arbitrary order as paid.
    const order = await queryOne<{
      id: string;
      store_id: string;
      payment_reference: string | null;
      payment_status: string;
    }>(
      "SELECT id, store_id, payment_reference, payment_status FROM orders WHERE id = $1",
      [orderId]
    );

    if (!order) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const store = await queryOne<{ slug: string }>(
      "SELECT slug FROM stores WHERE id = $1",
      [order.store_id]
    );

    const slug = store?.slug ?? "";

    // Idempotency: already processed
    if (order.payment_status === "paid") {
      return NextResponse.redirect(
        new URL(`/store/${slug}/checkout?success=true&order=${orderId}`, req.url)
      );
    }

    // Reference mismatch — reject silently (redirect to failure)
    if (order.payment_reference !== reference) {
      return NextResponse.redirect(
        new URL(`/store/${slug}/checkout?failed=true`, req.url)
      );
    }

    const verification = await verifyTransaction(reference);

    if (verification.data?.status === "success") {
      await query(
        `UPDATE orders
         SET payment_status = 'paid', order_status = 'confirmed'
         WHERE id = $1 AND payment_status = 'pending'`,
        [orderId]
      );
      return NextResponse.redirect(
        new URL(`/store/${slug}/checkout?success=true&order=${orderId}`, req.url)
      );
    }

    return NextResponse.redirect(
      new URL(`/store/${slug}/checkout?failed=true`, req.url)
    );
  } catch (err) {
    console.error("[paystack/callback] error:", err);
    return NextResponse.redirect(new URL("/", req.url));
  }
}

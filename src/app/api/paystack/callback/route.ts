import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { markOrderPaidOnline, ONLINE_PAID_STATUSES } from "@/lib/order-payments";
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
      order_number: string;
      access_token: string | null;
      payment_reference: string | null;
      payment_status: string;
    }>(
      "SELECT id, store_id, order_number, access_token, payment_reference, payment_status FROM orders WHERE id = $1",
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
    // Paid → the customer's receipt (which also clears their cart).
    const receipt = `/store/${slug}/receipt/${encodeURIComponent(order.order_number)}?t=${order.access_token ?? ""}&paid=1`;

    // Idempotency: already processed
    if (ONLINE_PAID_STATUSES.includes(order.payment_status)) {
      return NextResponse.redirect(
        new URL(receipt, req.url)
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
      await markOrderPaidOnline(orderId);
      return NextResponse.redirect(
        new URL(receipt, req.url)
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

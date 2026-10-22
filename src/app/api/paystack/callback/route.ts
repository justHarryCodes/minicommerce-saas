import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { markOrderPaidOnline, ONLINE_PAID_STATUSES } from "@/lib/order-payments";
import { verifyTransaction } from "@/lib/paystack";
import { koboOf } from "@/lib/payments";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const reference = searchParams.get("reference");
    const orderId = searchParams.get("orderId");

    if (!reference || !orderId) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Checkouts started through lib/payments settle there (once, amount-checked)
    if (await queryOne("SELECT 1 FROM payment_attempts WHERE reference = $1", [reference])) {
      return NextResponse.redirect(new URL(`/api/payments/callback?reference=${encodeURIComponent(reference)}`, req.url));
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
      payment_method: string;
      deposit_amount: number;
      total_amount: number | null;
      total: number;
    }>(
      "SELECT id, store_id, order_number, access_token, payment_reference, payment_status, payment_method, deposit_amount, total_amount, total FROM orders WHERE id = $1",
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

    const due = order.payment_method === "pay_on_delivery" ? order.deposit_amount : (order.total_amount ?? order.total);
    if (verification.data?.status === "success" && Number(verification.data.amount) === koboOf(due)) {
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

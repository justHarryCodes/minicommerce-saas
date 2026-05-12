import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { verifyTransaction } from "@/lib/paystack";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const reference = searchParams.get("reference");
    const orderId = searchParams.get("orderId");

    if (!reference || !orderId) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const order = await queryOne<{ id: string; store_id: string }>(
      "SELECT id, store_id FROM orders WHERE id = $1",
      [orderId]
    );

    if (!order) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const store = await queryOne<{ slug: string }>(
      "SELECT slug FROM stores WHERE id = $1",
      [order.store_id]
    );

    const verification = await verifyTransaction(reference);

    if (verification.data?.status === "success") {
      await queryOne(
        "UPDATE orders SET payment_status = 'paid', order_status = 'confirmed' WHERE id = $1",
        [orderId]
      );
      return NextResponse.redirect(
        new URL(`/store/${store?.slug}/checkout?success=true&order=${orderId}`, req.url)
      );
    } else {
      return NextResponse.redirect(
        new URL(`/store/${store?.slug}/checkout?failed=true`, req.url)
      );
    }
  } catch (err) {
    console.error("[paystack/callback] error:", err);
    return NextResponse.redirect(new URL("/", req.url));
  }
}

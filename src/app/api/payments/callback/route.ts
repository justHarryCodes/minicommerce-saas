import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { settlePayment, type PaymentAttempt } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Where Paystack sends the customer back to (?reference=…). Nothing from the
// URL is trusted: the reference is looked up, Paystack is asked directly,
// and the payment is applied only through settlePayment (once, exact amount).
// The webhook normally gets there first; either way the result is the same.
export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference") ?? req.nextUrl.searchParams.get("trxref") ?? "";
  const to = (path: string) => NextResponse.redirect(new URL(path, req.url));
  if (!/^[A-Za-z0-9_.:-]{6,120}$/.test(reference)) return to("/");

  const result = await settlePayment(reference, "callback");
  if (result.state === "unknown_reference") return to("/");

  const paid = result.state === "applied" || result.state === "already_settled" || result.state === "duplicate";
  // Still processing on Paystack's side (not failed): the webhook will finish it
  const processing = result.state === "not_paid" && result.paystackStatus !== "failed" && result.paystackStatus !== "abandoned";
  return to(await destination(result.attempt, paid, processing));
}

async function destination(a: PaymentAttempt, paid: boolean, processing: boolean): Promise<string> {
  if (a.kind === "order") {
    const o = await queryOne<{ order_number: string; access_token: string | null; slug: string }>(
      `SELECT o.order_number, o.access_token, s.slug FROM orders o JOIN stores s ON s.id = o.store_id WHERE o.id = $1`,
      [a.target_id]
    );
    if (!o) return "/";
    if (paid || processing) {
      return `/store/${o.slug}/receipt/${encodeURIComponent(o.order_number)}?t=${o.access_token ?? ""}${paid ? "&paid=1" : ""}`;
    }
    return `/store/${o.slug}/checkout?failed=true`;
  }
  if (a.kind === "theme") {
    const themeId = a.target_id.slice(a.target_id.indexOf(":") + 1);
    const state = paid ? "success" : processing ? "processing" : "failed";
    return `/dashboard/themes?purchase=${state}&theme=${encodeURIComponent(themeId)}`;
  }
  return paid ? "/dashboard/billing?success=paid" : processing ? "/dashboard/billing?pending=1" : "/dashboard/billing?error=payment_failed";
}

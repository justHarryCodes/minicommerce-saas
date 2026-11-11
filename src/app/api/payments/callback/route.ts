import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { settlePayment, type PaymentAttempt } from "@/lib/payments";
import { getAppUrl } from "@/lib/paystack";
import { appPageUrl, storePageUrl } from "@/lib/payment-return";

export const dynamic = "force-dynamic";

// Where Paystack sends the customer back to (?reference=…). Nothing from the
// URL is trusted: the reference is looked up, Paystack is asked directly,
// and the payment is applied only through settlePayment (once, exact amount).
// The webhook normally gets there first; either way the result is the same.
export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference") ?? req.nextUrl.searchParams.get("trxref") ?? "";
  const returnTo = req.nextUrl.searchParams.get("return");
  const appUrl = getAppUrl();
  // Always absolute: behind the proxy req.url is http://localhost:3000
  const to = (url: string) => NextResponse.redirect(url);
  if (!/^[A-Za-z0-9_.:-]{6,120}$/.test(reference)) return to(appPageUrl(appUrl, "/"));

  const result = await settlePayment(reference, "callback");
  if (result.state === "unknown_reference") return to(appPageUrl(appUrl, "/"));

  const paid = result.state === "applied" || result.state === "already_settled" || result.state === "duplicate";
  // Still processing on Paystack's side (not failed): the webhook will finish it
  const processing = result.state === "not_paid" && result.paystackStatus !== "failed" && result.paystackStatus !== "abandoned";
  return to(await destination(result.attempt, paid, processing, appUrl, returnTo));
}

async function destination(a: PaymentAttempt, paid: boolean, processing: boolean, appUrl: string, returnTo: string | null): Promise<string> {
  if (a.kind === "order") {
    const o = await queryOne<{ order_number: string; access_token: string | null; slug: string; custom_domain: string | null }>(
      `SELECT o.order_number, o.access_token, s.slug, s.custom_domain FROM orders o JOIN stores s ON s.id = o.store_id WHERE o.id = $1`,
      [a.target_id]
    );
    if (!o) return appPageUrl(appUrl, "/");
    const path =
      paid || processing
        ? `/receipt/${encodeURIComponent(o.order_number)}?t=${o.access_token ?? ""}${paid ? "&paid=1" : ""}`
        : "/checkout?failed=true";
    return storePageUrl({
      slug: o.slug,
      customDomain: o.custom_domain,
      returnTo,
      appUrl,
      rootDomain: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
      path,
    });
  }
  if (a.kind === "theme") {
    const themeId = a.target_id.slice(a.target_id.indexOf(":") + 1);
    const state = paid ? "success" : processing ? "processing" : "failed";
    return appPageUrl(appUrl, `/dashboard/themes?purchase=${state}&theme=${encodeURIComponent(themeId)}`);
  }
  return appPageUrl(
    appUrl,
    paid ? "/dashboard/billing?success=paid" : processing ? "/dashboard/billing?pending=1" : "/dashboard/billing?error=payment_failed"
  );
}

// "Notify me when it's back" — shoppers subscribe on a sold-out product (or
// variant); when stock goes from 0 to >0 they get one SMS/email.

import { query, queryOne } from "@/lib/db";
import { getAppUrl } from "@/lib/paystack";
import { getStoreUrl } from "@/lib/utils";
import { emailConfigured, sendEmail, sendSms, smsConfigured } from "@/lib/notify/providers";

export function backInStockMessage(d: { storeName: string; productName: string; label: string | null; url: string }): string {
  return `${d.storeName}: Good news! ${d.productName}${d.label ? ` (${d.label})` : ""} is back in stock. Grab it before it sells out: ${d.url}`;
}

/** Product page URL on the store's own address (custom domain → subdomain → path). */
export function productUrl(storeSlug: string, customDomain: string | null, productSlug: string): string {
  const base = getStoreUrl(storeSlug, customDomain);
  return `${base.startsWith("http") ? base : `${getAppUrl()}${base}`}/products/${productSlug}`;
}

/**
 * Notify everyone waiting on this product (+ variant). Subscribers for the
 * whole product (no variant) are included whenever any variant returns.
 * Never throws.
 */
export async function notifyBackInStock(storeId: string, productId: string, variantLabel: string | null): Promise<number> {
  try {
    if (!smsConfigured() && !emailConfigured()) return 0; // keep them queued until messaging is on
    const info = await queryOne<{ store_name: string; store_slug: string; custom_domain: string | null; product_name: string; product_slug: string; notifications: boolean }>(
      `SELECT s.name AS store_name, s.slug AS store_slug, s.custom_domain, p.name AS product_name, p.slug AS product_slug,
              s.customer_notifications_enabled AS notifications
       FROM products p JOIN stores s ON s.id = p.store_id WHERE p.id = $1 AND p.store_id = $2`,
      [productId, storeId]
    );
    if (!info || !info.notifications) return 0;

    // Claim first so overlapping restocks can't double-send
    const claimed = await query<{ customer_phone: string | null; customer_email: string | null; variant_label: string | null }>(
      `UPDATE stock_alerts SET notified_at = NOW()
       WHERE product_id = $1 AND store_id = $2 AND notified_at IS NULL
         AND (variant_label IS NULL OR variant_label = $3)
       RETURNING customer_phone, customer_email, variant_label`,
      [productId, storeId, variantLabel]
    );

    const url = productUrl(info.store_slug, info.custom_domain, info.product_slug);
    for (const a of claimed) {
      const text = backInStockMessage({ storeName: info.store_name, productName: info.product_name, label: a.variant_label ?? variantLabel, url });
      if (a.customer_phone && smsConfigured()) await sendSms(a.customer_phone, text);
      else if (a.customer_email && emailConfigured()) {
        await sendEmail(
          a.customer_email,
          `${info.product_name} is back in stock · ${info.store_name}`,
          `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#18181b"><p style="font-size:15px;line-height:1.6">${text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(url, `<a href="${url}">${url}</a>`)}</p></div>`
        );
      }
    }
    return claimed.length;
  } catch (err) {
    console.error("[back-in-stock] failed:", err instanceof Error ? err.message : err);
    return 0;
  }
}

/** How many shoppers are waiting, per "productId|variantLabel" (label "" = whole product). */
export async function waitingCounts(storeId: string): Promise<Map<string, number>> {
  const rows = await query<{ product_id: string; variant_label: string | null; n: number }>(
    `SELECT product_id, variant_label, COUNT(*)::int AS n FROM stock_alerts
     WHERE store_id = $1 AND notified_at IS NULL GROUP BY 1, 2`,
    [storeId]
  );
  return new Map(rows.map((r) => [`${r.product_id}|${r.variant_label ?? ""}`, r.n]));
}

import { query } from "@/lib/db";
import { getAppUrl } from "@/lib/paystack";
import { sendSms, smsConfigured } from "./providers";

export const REMINDER_AFTER_MINUTES = 60;
export const REMINDER_WINDOW_HOURS = 48;

export function recoveryUrl(storeSlug: string, token: string): string {
  return `${getAppUrl()}/store/${storeSlug}/checkout?recover=${encodeURIComponent(token)}`;
}

export function buildCartReminder(d: { storeName: string; customerName: string | null; subtotal: number; link: string }): string {
  const first = (d.customerName ?? "").trim().split(/\s+/)[0];
  const amount = `₦${Math.round(d.subtotal).toLocaleString("en-NG")}`;
  return `${d.storeName}: Hi${first ? ` ${first}` : ""}, you left items worth ${amount} in your cart. They're still available — complete your order here: ${d.link}`;
}

/**
 * Send one reminder per abandoned checkout that has been idle for an hour
 * (and is under 48h old). Each row is claimed by setting reminder_sent_at
 * first, so overlapping runs can't double-send.
 */
export async function sendDueCartReminders(limit = 50): Promise<{ checked: number; sent: number; skipped: number }> {
  if (!smsConfigured()) return { checked: 0, sent: 0, skipped: 0 };

  // Shoppers who went on to order anyway (another device, no token) are
  // closed out rather than nagged.
  await query(
    `UPDATE checkout_sessions cs SET status = 'recovered', order_id = o.id, updated_at = NOW()
     FROM orders o
     WHERE cs.status = 'open' AND o.store_id = cs.store_id AND o.customer_phone = cs.customer_phone
       AND o.created_at >= cs.created_at`
  );

  const due = await query<{
    id: string; token: string; customer_name: string | null; customer_phone: string; subtotal: number;
    store_name: string; store_slug: string;
  }>(
    `SELECT cs.id, cs.token, cs.customer_name, cs.customer_phone, cs.subtotal, s.name AS store_name, s.slug AS store_slug
     FROM checkout_sessions cs JOIN stores s ON s.id = cs.store_id
     WHERE cs.status = 'open' AND cs.reminder_sent_at IS NULL
       AND cs.updated_at < NOW() - make_interval(mins => $1)
       AND cs.updated_at > NOW() - make_interval(hours => $2)
       AND s.is_active = true AND s.customer_notifications_enabled = true
     ORDER BY cs.updated_at ASC
     LIMIT $3`,
    [REMINDER_AFTER_MINUTES, REMINDER_WINDOW_HOURS, limit]
  );

  let sent = 0;
  let skipped = 0;
  for (const s of due) {
    const claimed = await query(
      "UPDATE checkout_sessions SET reminder_sent_at = NOW() WHERE id = $1 AND reminder_sent_at IS NULL RETURNING id",
      [s.id]
    );
    if (!claimed.length) { skipped++; continue; }
    const text = buildCartReminder({
      storeName: s.store_name,
      customerName: s.customer_name,
      subtotal: Number(s.subtotal),
      link: recoveryUrl(s.store_slug, s.token),
    });
    const r = await sendSms(s.customer_phone, text);
    if (r.ok) sent++;
    else {
      skipped++;
      console.error("[cart-reminders] send failed:", r.error);
    }
  }
  return { checked: due.length, sent, skipped };
}

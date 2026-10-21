import { query } from "@/lib/db";
import { formatAppointment } from "@/lib/booking";
import { sendSms, smsConfigured } from "./providers";
import { hasFeature } from "@/lib/plan";

export function bookingReminderText(d: { storeName: string; service: string; startsAt: string; staffName: string | null }): string {
  return `${d.storeName}: Reminder — your ${d.service} appointment is ${formatAppointment(d.startsAt)}${d.staffName ? ` with ${d.staffName}` : ""}. Need to change it? Please contact the store.`;
}

/**
 * One SMS ~a day before each confirmed appointment. Runs every 30 minutes;
 * the 22–26h look-ahead window overlaps runs so nothing is missed, and
 * claiming via reminder_sent_at keeps it to one message.
 */
export async function sendDueBookingReminders(limit = 100): Promise<{ sent: number }> {
  if (!smsConfigured()) return { sent: 0 };
  const due = await query<{ id: string; customer_phone: string; product_name: string; starts_at: string; staff_name: string | null; store_name: string; store_id: string }>(
    `SELECT b.id, b.customer_phone, b.product_name, b.starts_at, sm.name AS staff_name, s.name AS store_name, b.store_id
     FROM bookings b
     JOIN stores s ON s.id = b.store_id
     LEFT JOIN staff_members sm ON sm.id = b.staff_id
     WHERE b.status = 'confirmed' AND b.reminder_sent_at IS NULL
       AND b.starts_at BETWEEN NOW() + INTERVAL '22 hours' AND NOW() + INTERVAL '26 hours'
       AND s.is_active = true AND s.customer_notifications_enabled = true
     ORDER BY b.starts_at LIMIT $1`,
    [limit]
  );
  let sent = 0;
  for (const b of due) {
    if (!(await hasFeature(b.store_id, "customer_messages"))) continue;
    const claimed = await query("UPDATE bookings SET reminder_sent_at = NOW() WHERE id = $1 AND reminder_sent_at IS NULL RETURNING id", [b.id]);
    if (!claimed.length) continue;
    const r = await sendSms(b.customer_phone, bookingReminderText({ storeName: b.store_name, service: b.product_name, startsAt: b.starts_at, staffName: b.staff_name }));
    if (r.ok) sent++;
  }
  return { sent };
}

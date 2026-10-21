// Customer-facing order messages: confirmation + receipt link, payment
// received, shipped / ready for pickup, delivered, cancelled — sent by SMS
// and/or email depending on what's configured and what the customer gave us.

import { query, queryOne } from "@/lib/db";
import { getAppUrl } from "@/lib/paystack";
import { emailConfigured, sendEmail, sendSms, smsConfigured, type SendResult } from "./providers";
import { formatAppointment } from "@/lib/booking";
import { describeInstant } from "@/lib/hours";

export type OrderEvent = "placed" | "deposit_paid" | "payment_confirmed" | "confirmed" | "shipped" | "delivered" | "cancelled";

/** Order status → the message it triggers (statuses not listed send nothing). */
export const STATUS_EVENTS: Partial<Record<string, OrderEvent>> = {
  confirmed: "confirmed",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
};

/**
 * Which customer messages a merchant's status change should send. Marking
 * paid + confirmed in one go sends just the payment message.
 */
export function eventsForChange(
  before: { order_status: string; payment_status: string },
  after: { order_status: string; payment_status: string }
): OrderEvent[] {
  const events: OrderEvent[] = [];
  const paidNow = after.payment_status === "paid" && before.payment_status !== "paid";
  if (paidNow) events.push("payment_confirmed");
  if (after.order_status !== before.order_status) {
    const e = STATUS_EVENTS[after.order_status];
    if (e && !(e === "confirmed" && paidNow)) events.push(e);
  }
  return events;
}

export interface OrderMessageData {
  storeName: string;
  storeSlug: string;
  orderNumber: string;
  accessToken: string;
  customerName: string;
  total: number;
  depositAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  deliveryMethod: string;
  pickupAddress: string | null;
  deliveryTimeFrame: string | null;
  /** "Tue 4 Nov, 2:00pm" for appointment orders */
  appointment?: string | null;
  /** Orders placed while the store was closed: when it will be prepared */
  scheduledLabel?: string | null;
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

export function receiptUrl(d: Pick<OrderMessageData, "storeSlug" | "orderNumber" | "accessToken">): string {
  return `${getAppUrl()}/store/${d.storeSlug}/receipt/${encodeURIComponent(d.orderNumber)}?t=${d.accessToken}`;
}

/** Pure message builder — kept SMS-length (roughly ≤ 2 segments). */
export function buildOrderMessage(event: OrderEvent, d: OrderMessageData): { subject: string; text: string } {
  const first = d.customerName.trim().split(/\s+/)[0] || "there";
  const link = receiptUrl(d);
  const pod = d.paymentMethod === "pay_on_delivery";
  const balance = Math.max(0, d.total - (d.paymentStatus === "deposit_paid" ? d.depositAmount : 0));
  const eta = d.deliveryTimeFrame ? ` Delivery: ${d.deliveryTimeFrame}.` : "";
  const pickup = d.deliveryMethod === "pickup";
  const when = d.appointment ? ` Appointment: ${d.appointment}.` : d.scheduledLabel ? ` We'll prepare it when we open (${d.scheduledLabel}).` : "";

  switch (event) {
    case "placed": {
      let pay = "";
      if (d.paymentMethod === "bank_transfer") pay = ` Please pay ${naira(d.total)} by bank transfer to confirm it.`;
      else if (pod && d.depositAmount > 0) pay = ` Pay ${naira(d.depositAmount)} deposit now, ${naira(d.total - d.depositAmount)} on delivery.`;
      else if (pod) pay = ` Pay ${naira(d.total)} on delivery.`;
      return {
        subject: `Order ${d.orderNumber} received`,
        text: `${d.storeName}: Thanks ${first}! Order ${d.orderNumber} (${naira(d.total)}) received.${when}${pay} Receipt: ${link}`,
      };
    }
    case "deposit_paid":
      return {
        subject: `Deposit received for ${d.orderNumber}`,
        text: `${d.storeName}: Deposit of ${naira(d.depositAmount)} received for ${d.orderNumber}. Balance ${naira(d.total - d.depositAmount)} is due on delivery.${eta} ${link}`,
      };
    case "payment_confirmed":
      return {
        subject: `Payment received for ${d.orderNumber}`,
        text: `${d.storeName}: Payment of ${naira(d.total)} received for ${d.orderNumber}. ${pod ? "Thank you!" : "We're preparing your order."}${pod ? "" : eta} ${link}`,
      };
    case "confirmed":
      return {
        subject: `Order ${d.orderNumber} confirmed`,
        text: `${d.storeName}: Your order ${d.orderNumber} is confirmed.${d.appointment ? when : eta} Track it here: ${link}`,
      };
    case "shipped":
      return pickup
        ? {
            subject: `Order ${d.orderNumber} is ready for pickup`,
            text: `${d.storeName}: Order ${d.orderNumber} is ready for pickup${d.pickupAddress ? ` at ${d.pickupAddress}` : ""}.${pod && balance > 0 ? ` Amount due: ${naira(balance)}.` : ""} ${link}`,
          }
        : {
            subject: `Order ${d.orderNumber} is on its way`,
            text: `${d.storeName}: Order ${d.orderNumber} is on its way!${pod && balance > 0 ? ` Please have ${naira(balance)} ready.` : ""} ${link}`,
          };
    case "delivered":
      return {
        subject: `Order ${d.orderNumber} delivered`,
        text: `${d.storeName}: Order ${d.orderNumber} has been delivered. Thank you for shopping with us, ${first}! ${link}`,
      };
    case "cancelled":
      return {
        subject: `Order ${d.orderNumber} cancelled`,
        text: `${d.storeName}: Order ${d.orderNumber} has been cancelled. If you have questions, please contact the store. ${link}`,
      };
  }
}

function emailHtml(storeName: string, text: string, link: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = esc(text.replace(link, "").replace(/\s*(Receipt|Track it here):\s*$/, "").trim());
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#18181b">
  <p style="font-size:18px;font-weight:700;margin:0 0 16px">${esc(storeName)}</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 24px">${body}</p>
  <a href="${link}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;font-size:14px">View receipt &amp; order status</a>
  <p style="font-size:12px;color:#71717a;margin:32px 0 0">Sent by ${esc(storeName)} via Duka</p>
</div>`;
}

/** Claim (order, event, channel) — false if it was already sent or is in flight. */
async function claim(orderId: string, event: string, channel: "sms" | "email"): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `INSERT INTO order_notifications (order_id, event, channel, status)
     VALUES ($1, $2, $3, 'sending')
     ON CONFLICT (order_id, event, channel) DO NOTHING RETURNING id`,
    [orderId, event, channel]
  );
  return rows.length > 0;
}

async function record(orderId: string, event: string, channel: "sms" | "email", r: SendResult) {
  await query(
    `UPDATE order_notifications SET status = $4, error = $5 WHERE order_id = $1 AND event = $2 AND channel = $3`,
    [orderId, event, channel, r.ok ? "sent" : "failed", r.ok ? null : r.error]
  );
}

/**
 * Send the customer message for an order event over every available
 * channel. Never throws — call it fire-and-forget after the DB write.
 */
export async function notifyCustomer(orderId: string, event: OrderEvent): Promise<void> {
  try {
    if (!smsConfigured() && !emailConfigured()) return;
    const o = await queryOne<{
      order_number: string; access_token: string | null; customer_name: string; customer_phone: string;
      customer_email: string | null; total_amount: number | null; total: number; deposit_amount: number;
      payment_method: string; payment_status: string; delivery_method: string;
      store_name: string; store_slug: string; store_email: string | null; pickup_address: string | null;
      delivery_time_frame: string | null; notifications: boolean;
      scheduled_for: string | null; first_booking: string | null;
    }>(
      `SELECT o.order_number, o.access_token, o.customer_name, o.customer_phone, o.customer_email,
              o.total_amount, o.total, o.deposit_amount, o.payment_method, o.payment_status, o.delivery_method,
              o.scheduled_for, (SELECT MIN(b.starts_at) FROM bookings b WHERE b.order_id = o.id AND b.status <> 'cancelled') AS first_booking,
              s.name AS store_name, s.slug AS store_slug, s.email AS store_email, s.pickup_address,
              s.delivery_time_frame, s.customer_notifications_enabled AS notifications
       FROM orders o JOIN stores s ON s.id = o.store_id WHERE o.id = $1`,
      [orderId]
    );
    if (!o || !o.notifications || !o.access_token) return;

    const data: OrderMessageData = {
      storeName: o.store_name,
      storeSlug: o.store_slug,
      orderNumber: o.order_number,
      accessToken: o.access_token,
      customerName: o.customer_name,
      total: Number(o.total_amount ?? o.total),
      depositAmount: Number(o.deposit_amount ?? 0),
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
      deliveryMethod: o.delivery_method,
      pickupAddress: o.pickup_address,
      deliveryTimeFrame: o.delivery_time_frame,
      appointment: o.first_booking ? formatAppointment(o.first_booking) : null,
      scheduledLabel: o.scheduled_for ? describeInstant(new Date(o.scheduled_for), new Date()) : null,
    };
    const msg = buildOrderMessage(event, data);

    if (smsConfigured() && (await claim(orderId, event, "sms"))) {
      await record(orderId, event, "sms", await sendSms(o.customer_phone, msg.text));
    }
    if (emailConfigured() && o.customer_email && (await claim(orderId, event, "email"))) {
      const r = await sendEmail(o.customer_email, `${msg.subject} · ${o.store_name}`, emailHtml(o.store_name, msg.text, receiptUrl(data)), o.store_email ?? undefined);
      await record(orderId, event, "email", r);
    }
  } catch (err) {
    console.error("[notifyCustomer] failed:", err instanceof Error ? err.message : err);
  }
}

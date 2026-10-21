import { query } from "@/lib/db";
import { notifyCustomer } from "@/lib/notify/order-messages";

/**
 * Record a successful Paystack charge for an order. Pay-on-delivery orders
 * only paid their deposit online → 'deposit_paid'; everything else → 'paid'.
 * Guarded on payment_status = 'pending' so the callback and the webhook
 * racing each other mark (and message) the order exactly once.
 */
export async function markOrderPaidOnline(orderId: string): Promise<boolean> {
  const rows = await query<{ payment_status: string }>(
    `UPDATE orders
     SET payment_status = CASE WHEN payment_method = 'pay_on_delivery' THEN 'deposit_paid' ELSE 'paid' END,
         order_status = 'confirmed'
     WHERE id = $1 AND payment_status = 'pending'
     RETURNING payment_status`,
    [orderId]
  );
  const updated = rows?.[0];
  if (!updated) return false;
  void notifyCustomer(orderId, updated.payment_status === "deposit_paid" ? "deposit_paid" : "payment_confirmed");
  return true;
}

/** Statuses meaning the online part of the payment is done. */
export const ONLINE_PAID_STATUSES = ["paid", "deposit_paid"];

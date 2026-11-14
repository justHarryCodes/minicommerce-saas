// Order updates back to the WhatsApp chat an order came from.
// WhatsApp only allows free-form messages within 24 hours of the shopper's
// last message; outside that window this skips (approved templates come later).
// SMS / email still go out as usual. Never throws.

import { query, queryOne } from "@/lib/db";
import { whatsappAvailable } from "./config";
import { sendWhatsApp, type WaConnection } from "./whatsapp";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function sendOrderUpdateToChat(orderId: string, text: string, receipt: string | null): Promise<boolean> {
  if (!whatsappAvailable()) return false;
  try {
    const row = await queryOne<WaConnection & { customer_ref: string; conversation_id: string; last_inbound_at: string | null }>(
      `SELECT c.*, v.customer_ref, v.id AS conversation_id, v.last_inbound_at
         FROM social_cart_links l
         JOIN social_conversations v ON v.id = l.conversation_id
         JOIN social_connections c ON c.store_id = l.store_id AND c.channel = 'whatsapp' AND c.status = 'active'
        WHERE l.order_id = $1
        LIMIT 1`,
      [orderId],
    );
    if (!row?.last_inbound_at || Date.now() - new Date(row.last_inbound_at).getTime() > WINDOW_MS) return false;
    const sent = receipt
      ? await sendWhatsApp(row, row.customer_ref, { kind: "cta", body: text, label: "View receipt", url: receipt }, row.conversation_id)
      : await sendWhatsApp(row, row.customer_ref, { kind: "text", text }, row.conversation_id);
    return sent.ok;
  } catch (e) {
    // social tables not created yet, or Meta unreachable: SMS/email still cover it
    if (!String(e).includes("does not exist")) console.error("[whatsapp] order update failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Each event goes to the chat once (the paid webhook and callback can both
 * fire): a marker row in social_messages, unique on its external_id.
 * False when already sent, or the order didn't come from a chat.
 */
export async function claimOrderUpdate(orderId: string, event: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `INSERT INTO social_messages (conversation_id, direction, external_id, type, body)
     SELECT l.conversation_id, 'out', $2, 'order_update', jsonb_build_object('order_id', $1::text, 'event', $3::text)
       FROM social_cart_links l WHERE l.order_id = $1::uuid AND l.conversation_id IS NOT NULL
      LIMIT 1
     ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING
     RETURNING id`,
    [orderId, `order-update:${orderId}:${event}`, event],
  );
  return rows.length > 0;
}

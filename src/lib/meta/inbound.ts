// WhatsApp webhook processing: every incoming message is routed to its
// store (by the business phone number it was sent to), saved once (Meta
// may deliver twice), answered by the bot, and the conversation's state saved.

import { query, queryOne } from "@/lib/db";
import { hasFeature } from "@/lib/plan";
import { ensureSocialTables } from "./db";
import { handleMessage, type BotState, type BotStore, type Inbound } from "./bot";
import { connectionForPhoneId, markRead, sendWhatsApp, type WaConnection } from "./whatsapp";

interface WaMessage {
  id: string;
  from: string;
  type: string;
  text?: { body?: string };
  interactive?: { type: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } };
  button?: { payload?: string; text?: string };
  order?: { product_items?: { product_retailer_id: string; quantity: number | string }[] };
}

interface WaChangeValue {
  metadata?: { phone_number_id?: string };
  contacts?: { wa_id?: string; profile?: { name?: string } }[];
  messages?: WaMessage[];
  statuses?: { id: string; status: string; errors?: { title?: string }[] }[];
}

/** One WhatsApp message -> what the bot understands. */
export function parseInbound(m: WaMessage): Inbound {
  if (m.type === "text") return { kind: "text", text: m.text?.body ?? "" };
  if (m.type === "interactive") {
    const r = m.interactive?.button_reply ?? m.interactive?.list_reply;
    if (r?.id) return { kind: "reply", id: r.id, title: r.title };
  }
  if (m.type === "button" && m.button?.payload) return { kind: "reply", id: m.button.payload, title: m.button.text };
  if (m.type === "order" && m.order?.product_items?.length) {
    return { kind: "order", items: m.order.product_items.map((i) => ({ product_retailer_id: String(i.product_retailer_id), quantity: Number(i.quantity) || 1 })) };
  }
  return { kind: "other" };
}

/** Handle a whole webhook delivery. Never throws (Meta retries non-200s). */
export async function processWhatsAppWebhook(payload: unknown): Promise<{ handled: number }> {
  let handled = 0;
  const p = payload as { object?: string; entry?: { changes?: { field?: string; value?: WaChangeValue }[] }[] };
  if (p?.object !== "whatsapp_business_account") return { handled };
  await ensureSocialTables();
  for (const entry of p.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages" || !change.value) continue;
      const v = change.value;
      const phoneId = v.metadata?.phone_number_id;
      if (!phoneId) continue;
      for (const s of v.statuses ?? []) {
        if (s.status === "failed") console.error("[whatsapp] delivery failed:", s.errors?.[0]?.title ?? "unknown");
      }
      if (!v.messages?.length) continue;
      const conn = await connectionForPhoneId(phoneId).catch(() => null);
      if (!conn || conn.status !== "active") continue;
      for (const m of v.messages) {
        try {
          const name = v.contacts?.find((c) => c.wa_id === m.from)?.profile?.name ?? v.contacts?.[0]?.profile?.name ?? null;
          if (await handleOne(conn, m, name)) handled++;
        } catch (e) {
          console.error("[whatsapp] message failed:", e instanceof Error ? e.message : e);
        }
      }
    }
  }
  return { handled };
}

async function handleOne(conn: WaConnection, m: WaMessage, name: string | null): Promise<boolean> {
  const store = await queryOne<BotStore & { is_active: boolean }>(
    `SELECT id, name, slug, custom_domain, description, phone, whatsapp, is_active FROM stores WHERE id = $1`,
    [conn.store_id],
  );
  if (!store?.is_active) return false;

  const conv = await queryOne<{ id: string; state: BotState }>(
    `INSERT INTO social_conversations (store_id, channel, customer_ref, customer_name, last_inbound_at)
     VALUES ($1, 'whatsapp', $2, $3, NOW())
     ON CONFLICT (store_id, channel, customer_ref)
     DO UPDATE SET customer_name = COALESCE(EXCLUDED.customer_name, social_conversations.customer_name), last_inbound_at = NOW(), updated_at = NOW()
     RETURNING id, state`,
    [store.id, m.from, name],
  );
  if (!conv) return false;

  // Already seen this message (Meta retried): don't answer twice
  const fresh = await query(
    `INSERT INTO social_messages (conversation_id, direction, external_id, type, body) VALUES ($1, 'in', $2, $3, $4)
     ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING RETURNING id`,
    [conv.id, m.id, m.type, JSON.stringify(m)],
  );
  if (!fresh.length) return false;

  // The plan lapsed: stay quiet rather than half-work
  if (!(await hasFeature(store.id, "sales_channels"))) return false;

  void markRead(conn, m.id);
  const result = await handleMessage(
    { store, state: conv.state ?? {}, conversationId: conv.id, customer: { ref: m.from, name } },
    parseInbound(m),
  );
  for (const reply of result.replies) await sendWhatsApp(conn, m.from, reply, conv.id);
  await query(`UPDATE social_conversations SET state = $2, updated_at = NOW() WHERE id = $1`, [conv.id, JSON.stringify(result.state)]);

  if (result.forward) {
    const { notifyStoreEvent } = await import("@/lib/push");
    void notifyStoreEvent(store.id, {
      type: "whatsapp_message",
      title: `💬 WhatsApp message from ${name ?? `+${m.from}`}`,
      body: `${result.forward.slice(0, 180)}\nReply: wa.me/${m.from}`,
      data: { phone: m.from },
      url: "/dashboard/channels",
    }).catch(() => {});
  }
  return true;
}

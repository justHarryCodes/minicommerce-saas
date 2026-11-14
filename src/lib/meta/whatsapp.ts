// WhatsApp Cloud API: store connections and sending messages.
// Every send is logged to social_messages. Nothing here throws.

import { query, queryOne } from "@/lib/db";
import { ensureSocialTables } from "./db";
import { testNumber, tokenCryptoReady } from "./config";
import { decryptToken } from "./crypto";
import { graph } from "./graph";

export interface WaConnection {
  id: string;
  store_id: string;
  status: "active" | "paused" | "error";
  external_id: string; // phone number ID
  account_id: string | null;
  display_name: string | null;
  display_phone: string | null;
  token_enc: string | null;
  token_source: "oauth" | "env_test";
  catalog_id: string | null;
}

export async function connectionForPhoneId(phoneNumberId: string): Promise<WaConnection | null> {
  await ensureSocialTables();
  return queryOne<WaConnection>(`SELECT * FROM social_connections WHERE channel = 'whatsapp' AND external_id = $1`, [phoneNumberId]);
}

export async function connectionForStore(storeId: string): Promise<WaConnection | null> {
  await ensureSocialTables();
  return queryOne<WaConnection>(`SELECT * FROM social_connections WHERE channel = 'whatsapp' AND store_id = $1`, [storeId]);
}

/** The token to send with: the vendor's own (decrypted) or the env test token. */
export function tokenFor(c: Pick<WaConnection, "token_enc" | "token_source">): string | null {
  if (c.token_source === "env_test") return testNumber()?.token ?? null;
  if (!c.token_enc || !tokenCryptoReady()) return null;
  return decryptToken(c.token_enc);
}

/* ─────────────────────────── Message builders ─────────────────────────── */
// WhatsApp's limits: button title 20, list row title 24 / description 72,
// section title 24, list button 20, body 1024, header text 60, max 3 buttons,
// max 10 list rows.

export const cut = (s: string, n: number) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`;
};

export type WaButton = { id: string; title: string };
export type WaRow = { id: string; title: string; description?: string };

export type WaOutgoing =
  | { kind: "text"; text: string; preview?: boolean }
  | { kind: "buttons"; body: string; buttons: WaButton[]; header?: { text?: string; image?: string }; footer?: string }
  | { kind: "list"; body: string; button: string; sections: { title?: string; rows: WaRow[] }[]; header?: string; footer?: string }
  | { kind: "cta"; body: string; label: string; url: string; header?: string; footer?: string }
  | { kind: "image"; image: string; caption?: string }
  // Native catalog messages (the store's Meta catalog must be linked)
  | { kind: "product_list"; catalogId: string; header: string; body: string; sections: { title: string; ids: string[] }[]; footer?: string }
  | { kind: "product"; catalogId: string; id: string; body?: string; footer?: string }
  | { kind: "catalog"; body: string; thumbnailId?: string; footer?: string };

/** The Cloud API payload for one message (exported for tests). */
export function waPayload(to: string, m: WaOutgoing): Record<string, unknown> {
  const base = { messaging_product: "whatsapp", recipient_type: "individual", to };
  const footer = (f?: string) => (f ? { footer: { text: cut(f, 60) } } : {});
  switch (m.kind) {
    case "text":
      return { ...base, type: "text", text: { body: cut(m.text, 4096), preview_url: !!m.preview } };
    case "image":
      return { ...base, type: "image", image: { link: m.image, ...(m.caption ? { caption: cut(m.caption, 1024) } : {}) } };
    case "buttons":
      return {
        ...base,
        type: "interactive",
        interactive: {
          type: "button",
          ...(m.header?.image ? { header: { type: "image", image: { link: m.header.image } } } : m.header?.text ? { header: { type: "text", text: cut(m.header.text, 60) } } : {}),
          body: { text: cut(m.body, 1024) },
          ...footer(m.footer),
          action: { buttons: m.buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id.slice(0, 256), title: cut(b.title, 20) } })) },
        },
      };
    case "list": {
      // 10 rows max across all sections
      let left = 10;
      const sections = m.sections
        .map((s) => {
          const rows = s.rows.slice(0, Math.max(0, left));
          left -= rows.length;
          return {
            ...(s.title ? { title: cut(s.title, 24) } : {}),
            rows: rows.map((r) => ({ id: r.id.slice(0, 200), title: cut(r.title, 24), ...(r.description ? { description: cut(r.description, 72) } : {}) })),
          };
        })
        .filter((s) => s.rows.length);
      return {
        ...base,
        type: "interactive",
        interactive: {
          type: "list",
          ...(m.header ? { header: { type: "text", text: cut(m.header, 60) } } : {}),
          body: { text: cut(m.body, 1024) },
          ...footer(m.footer),
          action: { button: cut(m.button, 20), sections },
        },
      };
    }
    case "product_list": {
      // 30 products max across up to 10 sections
      let left = 30;
      const sections = m.sections
        .slice(0, 10)
        .map((s) => {
          const ids = s.ids.slice(0, Math.max(0, left));
          left -= ids.length;
          return { title: cut(s.title, 24), product_items: ids.map((id) => ({ product_retailer_id: id })) };
        })
        .filter((s) => s.product_items.length);
      return {
        ...base,
        type: "interactive",
        interactive: { type: "product_list", header: { type: "text", text: cut(m.header, 60) }, body: { text: cut(m.body, 1024) }, ...footer(m.footer), action: { catalog_id: m.catalogId, sections } },
      };
    }
    case "product":
      return {
        ...base,
        type: "interactive",
        interactive: { type: "product", ...(m.body ? { body: { text: cut(m.body, 1024) } } : {}), ...footer(m.footer), action: { catalog_id: m.catalogId, product_retailer_id: m.id } },
      };
    case "catalog":
      return {
        ...base,
        type: "interactive",
        interactive: { type: "catalog_message", body: { text: cut(m.body, 1024) }, ...footer(m.footer), action: { name: "catalog_message", ...(m.thumbnailId ? { parameters: { thumbnail_product_retailer_id: m.thumbnailId } } : {}) } },
      };
    case "cta":
      return {
        ...base,
        type: "interactive",
        interactive: {
          type: "cta_url",
          ...(m.header ? { header: { type: "text", text: cut(m.header, 60) } } : {}),
          body: { text: cut(m.body, 1024) },
          ...footer(m.footer),
          action: { name: "cta_url", parameters: { display_text: cut(m.label, 20), url: m.url } },
        },
      };
  }
}

export async function sendWhatsApp(
  conn: Pick<WaConnection, "external_id" | "token_enc" | "token_source">,
  to: string,
  m: WaOutgoing,
  conversationId?: string | null,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const token = tokenFor(conn);
  if (!token) return { ok: false, error: "No WhatsApp token" };
  const payload = waPayload(to, m);
  const res = await graph<{ messages?: { id: string }[] }>(`${conn.external_id}/messages`, { token, body: payload });
  const id = res.ok ? res.data.messages?.[0]?.id : undefined;
  if (conversationId) {
    await query(
      `INSERT INTO social_messages (conversation_id, direction, external_id, type, body) VALUES ($1, 'out', $2, $3, $4)
       ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING`,
      [conversationId, id ?? null, m.kind, JSON.stringify(res.ok ? payload : { ...payload, error: res.error })],
    ).catch(() => {});
    await query(`UPDATE social_conversations SET last_outbound_at = NOW(), updated_at = NOW() WHERE id = $1`, [conversationId]).catch(() => {});
  }
  if (!res.ok) console.error("[whatsapp] send failed:", res.error);
  return res.ok ? { ok: true, id } : { ok: false, error: res.error };
}

/** Blue ticks + "typing…" while the bot works out the reply. */
export async function markRead(conn: Pick<WaConnection, "external_id" | "token_enc" | "token_source">, messageId: string): Promise<void> {
  const token = tokenFor(conn);
  if (!token) return;
  await graph(`${conn.external_id}/messages`, {
    token,
    body: { messaging_product: "whatsapp", status: "read", message_id: messageId, typing_indicator: { type: "text" } },
  });
}

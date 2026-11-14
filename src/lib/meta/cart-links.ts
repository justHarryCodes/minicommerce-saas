// A cart built in a chat, handed to the store's normal checkout:
//   bot -> createCartLink() -> https://<store>/cart-link/<token>
//   that page loads the items into the storefront cart and opens checkout
//   checkout sends the token back with the order -> linkOrder()
// so order updates can be sent back to the chat. Prices and stock are always
// re-read from the database when the link is opened.

import { randomBytes } from "crypto";
import { query, queryOne } from "@/lib/db";
import { ensureSocialTables } from "./db";
import type { CartItem } from "@/types";

/** A line in a chat cart: product, optional variant (product_sizes id), quantity. */
export interface ChatCartLine {
  p: string;
  v?: string | null;
  q: number;
}

export const TOKEN_RE = /^[A-Za-z0-9_-]{20,40}$/;

export async function createCartLink(storeId: string, conversationId: string | null, lines: ChatCartLine[]): Promise<string> {
  await ensureSocialTables();
  const token = randomBytes(18).toString("base64url");
  await query(`INSERT INTO social_cart_links (token, store_id, conversation_id, items) VALUES ($1, $2, $3, $4)`, [
    token,
    storeId,
    conversationId,
    JSON.stringify(lines.slice(0, 50)),
  ]);
  return token;
}

/**
 * The link's items as storefront cart lines, with today's prices and stock.
 * Sold-out or removed products are dropped; quantities are capped at stock.
 */
export async function resolveCartLink(storeId: string, token: string): Promise<{ items: CartItem[]; dropped: number } | null> {
  if (!TOKEN_RE.test(token)) return null;
  await ensureSocialTables();
  const link = await queryOne<{ items: ChatCartLine[] }>(
    `UPDATE social_cart_links SET opened_at = COALESCE(opened_at, NOW())
      WHERE token = $1 AND store_id = $2 AND expires_at > NOW() AND order_id IS NULL
      RETURNING items`,
    [token, storeId],
  );
  if (!link) return null;
  return priceLines(storeId, link.items ?? []);
}

/** Chat cart lines -> storefront cart lines at today's price and stock. */
export async function priceLines(storeId: string, raw: ChatCartLine[]): Promise<{ items: CartItem[]; dropped: number }> {
  const lines = raw.filter((l) => typeof l?.p === "string" && Number(l.q) > 0);
  if (!lines.length) return { items: [], dropped: 0 };

  const products = await query<{ id: string; name: string; price: string; image_url: string | null; images: string[] | null; stock_quantity: number | null }>(
    `SELECT id, name, price, image_url, images, stock_quantity FROM products WHERE store_id = $1 AND is_active = true AND id = ANY($2::uuid[])`,
    [storeId, [...new Set(lines.map((l) => l.p))]],
  );
  const variantIds = lines.map((l) => l.v).filter((v): v is string => !!v);
  const variants = variantIds.length
    ? await query<{ id: string; product_id: string; label: string; price: string | null; stock_quantity: number | null; image_url: string | null }>(
        `SELECT id, product_id, label, price, stock_quantity, image_url FROM product_sizes WHERE id = ANY($1::uuid[])`,
        [variantIds],
      )
    : [];

  const byId = new Map(products.map((p) => [p.id, p]));
  const vById = new Map(variants.map((v) => [v.id, v]));
  const items: CartItem[] = [];
  let dropped = 0;
  for (const l of lines) {
    const p = byId.get(l.p);
    const v = l.v ? vById.get(l.v) : null;
    if (!p || (l.v && (!v || v.product_id !== p.id))) {
      dropped++;
      continue;
    }
    const stock = Number(v ? v.stock_quantity : p.stock_quantity) || 0;
    if (stock <= 0) {
      dropped++;
      continue;
    }
    items.push({
      product_id: p.id,
      name: p.name,
      price: Number(v?.price ?? p.price),
      image_url: v?.image_url || p.image_url || p.images?.[0] || undefined,
      stock_quantity: stock,
      quantity: Math.min(Math.max(1, Math.floor(Number(l.q))), stock),
      size: v?.label ?? null,
    });
  }
  return { items, dropped };
}

/** Called after checkout creates the order. Never throws. */
export async function linkOrder(storeId: string, token: string, orderId: string): Promise<void> {
  if (!TOKEN_RE.test(token)) return;
  try {
    await ensureSocialTables();
    const rows = await query<{ conversation_id: string | null }>(
      `UPDATE social_cart_links SET order_id = $3 WHERE token = $1 AND store_id = $2 AND order_id IS NULL RETURNING conversation_id`,
      [token, storeId, orderId],
    );
    // The chat cart became an order: empty it
    const conv = rows[0]?.conversation_id;
    if (conv) await query(`UPDATE social_conversations SET state = state - 'cart', updated_at = NOW() WHERE id = $1`, [conv]);
  } catch {
    /* the order stands either way */
  }
}

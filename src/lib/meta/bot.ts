// The WhatsApp shopping assistant: what to reply to each message.
//
//   hi / anything      -> menu (browse, search, cart, track order, talk to seller)
//   browse             -> categories -> products (10 per page) -> product card
//   product card       -> photo, price, description; Add to cart / choose option
//   cart / checkout    -> a link to the store's own checkout, cart already filled
//   track order        -> this number's recent orders with receipt links
//   talk to seller     -> the next message is passed to the vendor
//
// handleMessage() is pure apart from database reads: it returns the replies
// and the new conversation state; the caller sends and saves them.

import { query, queryOne } from "@/lib/db";
import { cl } from "@/lib/cloudinary";
import { metaText, storeCanonicalBase } from "@/lib/seo";
import { receiptUrl } from "@/lib/notify/order-messages";
import { createCartLink, priceLines, type ChatCartLine } from "./cart-links";
import { cut, type WaOutgoing, type WaRow } from "./whatsapp";

export interface BotStore {
  id: string;
  name: string;
  slug: string;
  custom_domain?: string | null;
  description?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
}

export interface BotState {
  cart?: ChatCartLine[];
  /** What the next free-text message means */
  await?: "search" | "message" | null;
}

export type Inbound =
  | { kind: "text"; text: string }
  | { kind: "reply"; id: string; title?: string }
  | { kind: "order"; items: { product_retailer_id: string; quantity: number }[] }
  | { kind: "other" };

export interface BotContext {
  store: BotStore;
  state: BotState;
  conversationId: string | null;
  customer: { ref: string; name?: string | null };
}

export interface BotResult {
  replies: WaOutgoing[];
  state: BotState;
  /** A message for the vendor ("talk to seller") */
  forward?: string;
}

const PAGE = 9; // + a "More" row = WhatsApp's 10-row limit
const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GREETING = /^(hi+|hello|hey|hiya|good\s*(morning|afternoon|evening|day)|start|menu|help|hola|howdy|yo|sup|bonjour|ekaro|ẹ\s*kaabo|ndewo|sannu)\b/i;

/** WhatsApp only shows JPEG/PNG images: Cloudinary converts on the fly. */
export function waImage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes("res.cloudinary.com")) {
    const [path, qs] = cl(url, "q_auto:good,c_limit,w_1200").split("?");
    const cut = path.lastIndexOf("/") + 1;
    const file = path.slice(cut);
    const dot = file.lastIndexOf(".");
    const jpg = `${path.slice(0, cut)}${dot > 0 ? file.slice(0, dot) : file}.jpg`;
    return qs ? `${jpg}?${qs}` : jpg;
  }
  return /\.(jpe?g|png)(\?|$)/i.test(url) ? url : null;
}

/* ─────────────────────────────── Data ─────────────────────────────── */

interface ProductRow {
  id: string;
  name: string;
  price: string;
  compare_price: string | null;
  short_description: string | null;
  description: string | null;
  image_url: string | null;
  images: string[] | null;
  stock_quantity: number | null;
  category_id: string | null;
  has_sizes: boolean | null;
}

const PRODUCT_COLS = `p.id, p.name, p.price, p.compare_price, p.short_description, LEFT(p.description, 1500) AS description,
  p.image_url, p.images, p.stock_quantity, p.category_id, p.has_sizes`;
const SELLABLE = `p.store_id = $1 AND p.is_active = true AND COALESCE(p.is_bookable, false) = false AND COALESCE(p.stock_quantity, 0) > 0`;

async function categories(storeId: string) {
  return query<{ id: string; name: string; n: number }>(
    `SELECT c.id, c.name, COUNT(p.id)::int AS n FROM categories c
       JOIN products p ON p.category_id = c.id AND ${SELLABLE}
      WHERE c.store_id = $1 AND c.parent_id IS NULL
      GROUP BY c.id, c.name, c.sort_order
      ORDER BY (c.slug = 'uncategorized'), c.sort_order, c.name
      LIMIT 9`,
    [storeId],
  );
}

async function productPage(storeId: string, categoryId: string | null, page: number) {
  const rows = await query<ProductRow>(
    `SELECT ${PRODUCT_COLS} FROM products p
      WHERE ${SELLABLE} ${categoryId ? "AND p.category_id = $4" : ""}
      ORDER BY p.is_featured DESC, p.sort_order, p.created_at DESC
      LIMIT $2 OFFSET $3`,
    categoryId ? [storeId, PAGE + 1, (page - 1) * PAGE, categoryId] : [storeId, PAGE + 1, (page - 1) * PAGE],
  );
  return { rows: rows.slice(0, PAGE), more: rows.length > PAGE };
}

async function search(storeId: string, q: string) {
  return query<ProductRow>(
    `SELECT ${PRODUCT_COLS} FROM products p
      WHERE ${SELLABLE} AND (p.name ILIKE $2 OR p.short_description ILIKE $2 OR p.description ILIKE $2)
      ORDER BY (p.name ILIKE $2) DESC, p.is_featured DESC, p.created_at DESC
      LIMIT ${PAGE}`,
    [storeId, `%${q.replace(/[%_\\]/g, "")}%`],
  );
}

async function product(storeId: string, id: string) {
  if (!UUID.test(id)) return null;
  return queryOne<ProductRow>(`SELECT ${PRODUCT_COLS} FROM products p WHERE p.store_id = $1 AND p.id = $2 AND p.is_active = true`, [storeId, id]);
}

async function variants(productId: string) {
  return query<{ id: string; label: string; price: string | null; stock_quantity: number | null }>(
    `SELECT id, label, price, stock_quantity FROM product_sizes WHERE product_id = $1 ORDER BY sort_order, created_at`,
    [productId],
  );
}

/* ───────────────────────────── Messages ───────────────────────────── */

function cartCount(state: BotState) {
  return (state.cart ?? []).reduce((n, l) => n + l.q, 0);
}

function menu(ctx: BotContext, intro?: string): WaOutgoing {
  const first = (ctx.customer.name ?? "").trim().split(/\s+/)[0];
  const n = cartCount(ctx.state);
  const about = ctx.store.description ? `\n${metaText(ctx.store.description, 180)}\n` : "";
  return {
    kind: "list",
    header: ctx.store.name,
    body:
      intro ??
      `Hi${first ? ` ${first}` : ""}! 👋 Welcome to *${ctx.store.name}*.${about}\nShop right here on WhatsApp: browse, add to cart and check out in a few taps.`,
    button: "Menu",
    footer: "Powered by Duka",
    sections: [
      {
        title: "Shop",
        rows: [
          { id: "cats", title: "🛍️ Browse products", description: "See everything by category" },
          { id: "search", title: "🔍 Search", description: "Find something specific" },
          { id: "cart", title: `🛒 My cart${n ? ` (${n})` : ""}`, description: n ? "Review and check out" : "Your cart is empty" },
        ],
      },
      {
        title: "Help",
        rows: [
          { id: "orders", title: "📦 Track my order", description: "Your recent orders" },
          { id: "talk", title: `💬 Message ${ctx.store.name}`, description: "Ask the seller a question" },
        ],
      },
    ],
  };
}

function productRows(rows: ProductRow[]): WaRow[] {
  return rows.map((p) => ({
    id: `p:${p.id}`,
    title: p.name,
    description: [naira(Number(p.price)), metaText(p.short_description || p.description, 60)].filter(Boolean).join(" · "),
  }));
}

function productCard(p: ProductRow, opts: { variantsCount: number }): WaOutgoing {
  const price = Number(p.price);
  const compare = Number(p.compare_price ?? 0);
  const stock = Number(p.stock_quantity ?? 0);
  const desc = metaText(p.short_description || p.description, 600);
  const lines = [
    `*${p.name}*`,
    compare > price ? `*${naira(price)}*  ~${naira(compare)}~  (-${Math.round((1 - price / compare) * 100)}%)` : `*${naira(price)}*`,
    desc && `\n${desc}`,
    stock > 0 && stock <= 5 ? `\n⚡ Only ${stock} left` : "",
  ].filter(Boolean);
  const img = waImage(p.image_url || p.images?.[0]);
  if (stock <= 0) {
    return { kind: "buttons", header: img ? { image: img } : undefined, body: `${lines.join("\n")}\n\n😔 Sold out right now.`, buttons: [{ id: "cats", title: "Browse more" }, { id: "menu", title: "Menu" }] };
  }
  return {
    kind: "buttons",
    header: img ? { image: img } : undefined,
    body: lines.join("\n"),
    buttons: [
      opts.variantsCount ? { id: `opts:${p.id}`, title: "Choose option" } : { id: `add:${p.id}`, title: "🛒 Add to cart" },
      { id: p.category_id ? `cat:${p.category_id}:1` : "all:1", title: "More like this" },
      { id: "cart", title: "View cart" },
    ],
  };
}

async function cartView(ctx: BotContext): Promise<WaOutgoing> {
  const { items, dropped } = await priceLines(ctx.store.id, ctx.state.cart ?? []);
  if (!items.length) {
    return { kind: "buttons", body: `Your cart is empty${dropped ? " (some items sold out)" : ""}. Let's find you something! 🛍️`, buttons: [{ id: "cats", title: "Browse products" }, { id: "search", title: "Search" }] };
  }
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const lines = items.map((i, n) => `${n + 1}. ${i.name}${i.size ? ` (${i.size})` : ""} × ${i.quantity}  ${naira(i.price * i.quantity)}`);
  return {
    kind: "buttons",
    body: `🛒 *Your cart*\n\n${lines.join("\n")}\n\n*Subtotal: ${naira(total)}*${dropped ? `\n_${dropped} item${dropped > 1 ? "s" : ""} sold out and removed._` : ""}\nDelivery is added at checkout.`,
    buttons: [
      { id: "checkout", title: "✅ Checkout" },
      { id: "cats", title: "Keep shopping" },
      { id: "clear", title: "Clear cart" },
    ],
  };
}

async function checkout(ctx: BotContext): Promise<WaOutgoing> {
  const cart = ctx.state.cart ?? [];
  const { items } = await priceLines(ctx.store.id, cart);
  if (!items.length) return cartView(ctx);
  const token = await createCartLink(ctx.store.id, ctx.conversationId, cart);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const url = `${storeCanonicalBase(ctx.store)}/cart-link/${token}`;
  return {
    kind: "cta",
    header: "Complete your order",
    body: `${items.map((i) => `• ${i.name}${i.size ? ` (${i.size})` : ""} × ${i.quantity}`).join("\n")}\n\n*Subtotal: ${naira(total)}*\n\nTap *Checkout* to add your delivery details and pay securely by card, transfer or USSD. Your cart is already filled in. 🔒`,
    label: "Checkout",
    url,
    footer: "We'll send your order updates here",
  };
}

async function recentOrders(ctx: BotContext): Promise<WaOutgoing> {
  const digits = ctx.customer.ref.replace(/\D/g, "").slice(-10);
  const rows = await query<{ order_number: string; order_status: string; payment_status: string; total_amount: string | null; total: string | null; access_token: string | null; created_at: string }>(
    `SELECT order_number, order_status, payment_status, total_amount, total, access_token, created_at FROM orders
      WHERE store_id = $1 AND RIGHT(regexp_replace(customer_phone, '\\D', '', 'g'), 10) = $2
      ORDER BY created_at DESC LIMIT 5`,
    [ctx.store.id, digits],
  ).catch(() => []);
  if (!rows.length) {
    return { kind: "buttons", body: `I couldn't find any orders from this number at ${ctx.store.name}. If you used a different number, tap *Message seller* and we'll check for you.`, buttons: [{ id: "talk", title: "Message seller" }, { id: "menu", title: "Menu" }] };
  }
  const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
  const text = rows
    .map((o) => {
      const amount = naira(Number(o.total_amount ?? o.total ?? 0));
      const link = o.access_token ? `\n${receiptUrl({ storeSlug: ctx.store.slug, orderNumber: o.order_number, accessToken: o.access_token })}` : "";
      return `*${o.order_number}* · ${amount}\n${label(o.order_status)} · ${o.payment_status === "paid" ? "Paid ✅" : label(o.payment_status)}${link}`;
    })
    .join("\n\n");
  return { kind: "text", text: `📦 *Your recent orders*\n\n${text}`, preview: false };
}

/* ───────────────────────────── The bot ───────────────────────────── */

export async function handleMessage(ctx: BotContext, msg: Inbound): Promise<BotResult> {
  const state: BotState = { ...ctx.state, cart: [...(ctx.state.cart ?? [])] };
  const c: BotContext = { ...ctx, state };
  const done = (...replies: WaOutgoing[]): BotResult => ({ replies, state });

  // Native WhatsApp cart (when the store's catalog is connected)
  if (msg.kind === "order") {
    state.cart = msg.items
      .map((i) => {
        const [p, v] = i.product_retailer_id.split(":");
        return { p, v: v || null, q: Math.max(1, Math.min(99, Number(i.quantity) || 1)) };
      })
      .filter((l) => UUID.test(l.p));
    return done(await checkout(c));
  }

  if (msg.kind === "other") {
    return done(menu(c, `Thanks! I can only read text and taps for now. 🙂 Here's what I can do at *${ctx.store.name}*:`));
  }

  if (msg.kind === "text") {
    const text = msg.text.trim();
    const lower = text.toLowerCase();
    if (state.await === "message" && !GREETING.test(lower)) {
      state.await = null;
      return {
        ...done({ kind: "buttons", body: `✅ Sent to *${ctx.store.name}*. They'll get back to you here or by phone soon.`, buttons: [{ id: "cats", title: "Browse products" }, { id: "menu", title: "Menu" }] }),
        forward: text,
      };
    }
    if (GREETING.test(lower) || !text) {
      state.await = null;
      return done(menu(c));
    }
    if (/^(cart|my cart|basket)$/.test(lower)) return done(await cartView(c));
    if (/^(checkout|check out|pay|buy)$/.test(lower)) return done(await checkout(c));
    if (/^(orders?|track|track order|my orders?)$/.test(lower)) return done(await recentOrders(c));
    // Anything else is a search
    state.await = null;
    const found = await search(ctx.store.id, text.slice(0, 60));
    if (!found.length) {
      return done(menu(c, `I couldn't find "${cut(text, 40)}" at ${ctx.store.name}. 🤔 Try another word, or browse:`));
    }
    if (found.length === 1) {
      const vs = found[0].has_sizes ? await variants(found[0].id) : [];
      return done(productCard(found[0], { variantsCount: vs.length }));
    }
    return done({ kind: "list", body: `Here's what I found for "${cut(text, 40)}":`, button: "See products", sections: [{ title: "Results", rows: productRows(found) }] });
  }

  // Taps on buttons and list rows
  const [action, a, b] = msg.id.split(":");
  switch (action) {
    case "menu":
      state.await = null;
      return done(menu(c, `What would you like to do? 🙂`));
    case "search":
      state.await = "search";
      return done({ kind: "text", text: "🔍 What are you looking for? Type a word, like *shoes*, *perfume* or *red gown*." });
    case "talk":
      state.await = "message";
      return done({
        kind: "text",
        text: `💬 Type your message for *${ctx.store.name}* and I'll pass it on.${ctx.store.phone ? `\n\nOr call them on ${ctx.store.phone}.` : ""}`,
      });
    case "orders":
      return done(await recentOrders(c));
    case "cart":
      return done(await cartView(c));
    case "checkout":
      return done(await checkout(c));
    case "clear":
      state.cart = [];
      return done({ kind: "buttons", body: "🧹 Cart cleared.", buttons: [{ id: "cats", title: "Browse products" }, { id: "menu", title: "Menu" }] });
    case "cats": {
      const cats = await categories(ctx.store.id);
      if (cats.length <= 1) return done(await listProducts(c, null, 1));
      return done({
        kind: "list",
        body: "Pick a category 👇",
        button: "Categories",
        sections: [{ title: "Categories", rows: [{ id: "all:1", title: "✨ Everything", description: "All products" }, ...cats.map((x) => ({ id: `cat:${x.id}:1`, title: x.name, description: `${x.n} product${x.n === 1 ? "" : "s"}` }))] }],
      });
    }
    case "all":
      return done(await listProducts(c, null, Number(a) || 1));
    case "cat":
      return done(await listProducts(c, UUID.test(a ?? "") ? a : null, Number(b) || 1));
    case "p": {
      const p = await product(ctx.store.id, a ?? "");
      if (!p) return done(menu(c, "That product isn't available any more. 😔"));
      const vs = p.has_sizes ? await variants(p.id) : [];
      return done(productCard(p, { variantsCount: vs.length }));
    }
    case "opts": {
      const p = await product(ctx.store.id, a ?? "");
      if (!p) return done(menu(c, "That product isn't available any more. 😔"));
      const vs = (await variants(p.id)).filter((v) => Number(v.stock_quantity ?? 0) > 0);
      if (!vs.length) return done({ kind: "buttons", body: `😔 *${p.name}* is sold out in every option.`, buttons: [{ id: "cats", title: "Browse more" }, { id: "menu", title: "Menu" }] });
      return done({
        kind: "list",
        body: `Choose an option for *${p.name}*:`,
        button: "Options",
        sections: [{ title: "Options", rows: vs.slice(0, 10).map((v) => ({ id: `v:${p.id}:${v.id}`, title: v.label, description: `${naira(Number(v.price ?? p.price))}${Number(v.stock_quantity) <= 5 ? ` · only ${v.stock_quantity} left` : ""}` })) }],
      });
    }
    case "add":
    case "v": {
      const p = await product(ctx.store.id, a ?? "");
      if (!p) return done(menu(c, "That product isn't available any more. 😔"));
      let label = "";
      let vid: string | null = null;
      if (action === "v") {
        const v = (await variants(p.id)).find((x) => x.id === b);
        if (!v || Number(v.stock_quantity ?? 0) <= 0) return done({ kind: "text", text: "😔 That option just sold out. Please pick another." });
        vid = v.id;
        label = v.label;
      } else if (p.has_sizes && (await variants(p.id)).length) {
        return handleMessage(c, { kind: "reply", id: `opts:${p.id}` });
      }
      const line = state.cart!.find((l) => l.p === p.id && (l.v ?? null) === vid);
      if (line) line.q = Math.min(99, line.q + 1);
      else state.cart!.push({ p: p.id, v: vid, q: 1 });
      const { items } = await priceLines(ctx.store.id, state.cart!);
      const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
      const count = items.reduce((s, i) => s + i.quantity, 0);
      return done({
        kind: "buttons",
        body: `✅ Added *${p.name}${label ? ` (${label})` : ""}* to your cart.\n\n🛒 ${count} item${count === 1 ? "" : "s"} · *${naira(total)}*`,
        buttons: [
          { id: "checkout", title: "✅ Checkout" },
          { id: "cats", title: "Keep shopping" },
          { id: "cart", title: "View cart" },
        ],
      });
    }
    default:
      return done(menu(c));
  }
}

async function listProducts(c: BotContext, categoryId: string | null, page: number): Promise<WaOutgoing> {
  const { rows, more } = await productPage(c.store.id, categoryId, page);
  if (!rows.length) return menu(c, page > 1 ? "That's everything! 🎉" : `${c.store.name} hasn't added products here yet. Check back soon!`);
  return {
    kind: "list",
    body: page > 1 ? `More products (page ${page}) 👇` : "Tap a product to see photos and price 👇",
    button: "See products",
    sections: [
      { title: "Products", rows: productRows(rows) },
      ...(more ? [{ title: "More", rows: [{ id: categoryId ? `cat:${categoryId}:${page + 1}` : `all:${page + 1}`, title: "➡️ More products", description: `Page ${page + 1}` }] }] : []),
    ],
  };
}

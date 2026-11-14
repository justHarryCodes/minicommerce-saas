import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac, randomBytes } from "crypto";
import { NextRequest } from "next/server";

vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: () => unknown) => fn() }));
vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn() }));
vi.mock("@/lib/plan", () => ({ hasFeature: vi.fn(async () => true) }));
vi.mock("@/lib/push", () => ({ notifyStoreEvent: vi.fn(async () => {}) }));
vi.mock("@/lib/auth", () => ({ verifySession: vi.fn(), getUserStore: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ verifyAdminSession: vi.fn(async () => null) }));

import { query, queryOne } from "@/lib/db";
import { notifyStoreEvent } from "@/lib/push";
import { verifySession, getUserStore } from "@/lib/auth";
import { whatsappAvailable, whatsappSetupStatus } from "@/lib/meta/config";
import { decryptToken, encryptToken, verifyMetaSignature } from "@/lib/meta/crypto";
import { waPayload } from "@/lib/meta/whatsapp";
import { handleMessage, waImage, type BotContext } from "@/lib/meta/bot";
import { parseInbound, processWhatsAppWebhook } from "@/lib/meta/inbound";
import { priceLines } from "@/lib/meta/cart-links";
import { GET as webhookGET, POST as webhookPOST } from "@/app/api/meta/webhook/route";
import { GET as dashGET } from "@/app/api/dashboard/whatsapp/route";

// WhatsApp selling: works only when its keys are set, and never breaks the app without them.

const KEYS = ["META_APP_ID", "META_APP_SECRET", "META_WEBHOOK_VERIFY_TOKEN", "META_TOKEN_ENCRYPTION_KEY", "META_ES_CONFIG_ID", "WHATSAPP_TEST_PHONE_NUMBER_ID", "WHATSAPP_TEST_ACCESS_TOKEN", "WHATSAPP_TEST_WABA_ID"];
const saved: Record<string, string | undefined> = {};
function setKeys(on: boolean) {
  for (const k of KEYS) delete process.env[k];
  if (!on) return;
  Object.assign(process.env, {
    META_APP_ID: "123",
    META_APP_SECRET: "app-secret",
    META_WEBHOOK_VERIFY_TOKEN: "verify-me",
    META_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
    WHATSAPP_TEST_PHONE_NUMBER_ID: "555",
    WHATSAPP_TEST_ACCESS_TOKEN: "test-token",
  });
}
beforeEach(() => {
  for (const k of KEYS) saved[k] = process.env[k];
  process.env.NEXT_PUBLIC_ROOT_DOMAIN = "dukanigeria.com";
  vi.mocked(query).mockReset().mockResolvedValue([] as never);
  vi.mocked(queryOne).mockReset().mockResolvedValue(null as never);
});
afterEach(() => {
  for (const k of KEYS) (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]));
  vi.unstubAllGlobals();
});

const UUID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("without Meta keys", () => {
  it("everything is off, nothing throws, and the webhook doesn't exist", async () => {
    setKeys(false);
    expect(whatsappAvailable()).toBe(false);
    expect(whatsappSetupStatus().missing).toContain("META_APP_SECRET");
    expect((await webhookGET(new NextRequest("http://x/api/meta/webhook?hub.mode=subscribe"))).status).toBe(404);
    expect((await webhookPOST(new NextRequest("http://x/api/meta/webhook", { method: "POST", body: "{}" }))).status).toBe(404);
  });

  it("the dashboard shows 'coming soon' without touching the database", async () => {
    setKeys(false);
    vi.mocked(verifySession).mockResolvedValue({ firebaseUid: "u" } as never);
    vi.mocked(getUserStore).mockResolvedValue({ id: "s1", slug: "amaka" } as never);
    const res = await (await dashGET())!.json();
    expect(res).toMatchObject({ available: false, connection: null, admin: null });
    expect(query).not.toHaveBeenCalled();
  });
});

describe("keys and signatures", () => {
  it("tokens encrypt and decrypt; tampering fails", () => {
    setKeys(true);
    const enc = encryptToken("EAAG-secret-token");
    expect(enc.startsWith("v1.")).toBe(true);
    expect(enc).not.toContain("EAAG");
    expect(decryptToken(enc)).toBe("EAAG-secret-token");
    expect(decryptToken(enc.slice(0, -2) + "xx")).toBeNull();
  });

  it("only genuine Meta webhooks are accepted", () => {
    setKeys(true);
    const body = '{"object":"whatsapp_business_account"}';
    const sig = "sha256=" + createHmac("sha256", "app-secret").update(body).digest("hex");
    expect(verifyMetaSignature(body, sig)).toBe(true);
    expect(verifyMetaSignature(body + " ", sig)).toBe(false);
    expect(verifyMetaSignature(body, null)).toBe(false);
  });

  it("webhook verification handshake", async () => {
    setKeys(true);
    const ok = await webhookGET(new NextRequest("http://x/api/meta/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42"));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("42");
    expect((await webhookGET(new NextRequest("http://x/api/meta/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=42"))).status).toBe(403);
    expect((await webhookPOST(new NextRequest("http://x/api/meta/webhook", { method: "POST", body: "{}", headers: { "x-hub-signature-256": "sha256=00" } }))).status).toBe(401);
  });
});

describe("message payloads respect WhatsApp's limits", () => {
  it("buttons: max 3, titles 20 chars; lists: max 10 rows, row titles 24", () => {
    const b = waPayload("234", { kind: "buttons", body: "x", header: { image: "https://i/a.jpg" }, buttons: Array.from({ length: 5 }, (_, i) => ({ id: `b${i}`, title: "A very long button title here" })) }) as any;
    expect(b.interactive.action.buttons).toHaveLength(3);
    expect(b.interactive.action.buttons[0].reply.title.length).toBeLessThanOrEqual(20);
    expect(b.interactive.header).toEqual({ type: "image", image: { link: "https://i/a.jpg" } });
    const l = waPayload("234", { kind: "list", body: "x", button: "Pick", sections: [{ rows: Array.from({ length: 8 }, (_, i) => ({ id: `r${i}`, title: "Row title that is far too long for WhatsApp" })) }, { rows: Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, title: "t" })) }] }) as any;
    const rows = l.interactive.action.sections.flatMap((s: any) => s.rows);
    expect(rows).toHaveLength(10);
    expect(rows[0].title.length).toBeLessThanOrEqual(24);
    const c = waPayload("234", { kind: "cta", body: "Pay", label: "Checkout", url: "https://s/x" }) as any;
    expect(c.interactive).toMatchObject({ type: "cta_url", action: { name: "cta_url", parameters: { display_text: "Checkout", url: "https://s/x" } } });
  });

  it("product photos are sent as JPG (WhatsApp only takes JPEG/PNG)", () => {
    expect(waImage("https://res.cloudinary.com/c/image/upload/v1/duka/a.jxl")).toBe("https://res.cloudinary.com/c/image/upload/q_auto:good,c_limit,w_1200/v1/duka/a.jpg");
    expect(waImage("https://res.cloudinary.com/c/image/upload/v1/duka/a")).toMatch(/\/a\.jpg$/);
    expect(waImage("https://other.com/a.webp")).toBeNull();
    expect(waImage("https://other.com/a.png")).toBe("https://other.com/a.png");
  });
});

describe("the shopping bot", () => {
  const store = { id: "s1", name: "Amaka Styles", slug: "amaka", description: "Ankara gowns", phone: "0801" };
  const ctx = (state = {}): BotContext => ({ store, state, conversationId: "c1", customer: { ref: "2348012345678", name: "Ada Obi" } });
  const P = { id: UUID(1), name: "Ankara Gown", price: "20000", compare_price: "25000", short_description: "Lovely", description: null, image_url: "https://res.cloudinary.com/c/image/upload/v1/g.jpg", images: null, stock_quantity: 3, category_id: UUID(9), has_sizes: false };

  beforeEach(() => {
    vi.mocked(query).mockImplementation(async (sql: unknown) => {
      const s = String(sql);
      if (s.includes("FROM categories")) return [{ id: UUID(9), name: "Gowns", n: 4 }, { id: UUID(8), name: "Bags", n: 2 }] as never;
      if (s.includes("ILIKE")) return (s && [P]) as never;
      if (s.includes("FROM products p") && s.includes("LIMIT $2 OFFSET $3")) return Array.from({ length: 10 }, (_, i) => ({ ...P, id: UUID(i + 1), name: `Item ${i + 1}` })) as never;
      if (s.includes("FROM products WHERE store_id = $1 AND is_active = true AND id = ANY")) return [{ id: UUID(1), name: "Ankara Gown", price: "20000", image_url: null, images: null, stock_quantity: 3 }] as never;
      if (s.includes("INSERT INTO social_cart_links")) return [] as never;
      return [] as never;
    });
    vi.mocked(queryOne).mockImplementation(async (sql: unknown) => (String(sql).includes("FROM products p WHERE p.store_id") ? P : null) as never);
  });

  it("greets by first name with the menu", async () => {
    const r = await handleMessage(ctx(), { kind: "text", text: "Hello" });
    const m = r.replies[0] as any;
    expect(m.kind).toBe("list");
    expect(m.body).toContain("Hi Ada!");
    expect(m.body).toContain("*Amaka Styles*");
    expect(m.sections.flatMap((s: any) => s.rows.map((x: any) => x.id))).toEqual(["cats", "search", "cart", "orders", "talk"]);
  });

  it("browse: categories, then 9 products + a More row", async () => {
    const cats = (await handleMessage(ctx(), { kind: "reply", id: "cats" })).replies[0] as any;
    expect(cats.sections[0].rows.map((r: any) => r.id)).toEqual(["all:1", `cat:${UUID(9)}:1`, `cat:${UUID(8)}:1`]);
    const list = (await handleMessage(ctx(), { kind: "reply", id: `cat:${UUID(9)}:1` })).replies[0] as any;
    const rows = list.sections.flatMap((s: any) => s.rows);
    expect(rows).toHaveLength(10);
    expect(rows[9].id).toBe(`cat:${UUID(9)}:2`);
    expect(rows[0].description).toContain("₦20,000");
  });

  it("a product card has the photo, sale price and Add to cart", async () => {
    const card = (await handleMessage(ctx(), { kind: "reply", id: `p:${UUID(1)}` })).replies[0] as any;
    expect(card.header.image).toMatch(/\.jpg$/);
    expect(card.body).toContain("*₦20,000*  ~₦25,000~  (-20%)");
    expect(card.body).toContain("Only 3 left");
    expect(card.buttons[0]).toEqual({ id: `add:${UUID(1)}`, title: "🛒 Add to cart" });
  });

  it("add to cart, then checkout gives a link to the store's checkout", async () => {
    const added = await handleMessage(ctx(), { kind: "reply", id: `add:${UUID(1)}` });
    expect(added.state.cart).toEqual([{ p: UUID(1), v: null, q: 1 }]);
    expect((added.replies[0] as any).body).toContain("1 item · *₦20,000*");
    const again = await handleMessage(ctx(added.state), { kind: "reply", id: `add:${UUID(1)}` });
    expect(again.state.cart![0].q).toBe(2);
    const co = (await handleMessage(ctx(again.state), { kind: "reply", id: "checkout" })).replies[0] as any;
    expect(co.kind).toBe("cta");
    expect(co.url).toMatch(/^https:\/\/amaka\.dukanigeria\.com\/cart-link\/[A-Za-z0-9_-]{20,40}$/);
    expect(co.body).toContain("Ankara Gown × 2");
    expect(co.body).toContain("*Subtotal: ₦40,000*");
  });

  it("free text searches; one hit opens the product", async () => {
    const r = (await handleMessage(ctx(), { kind: "text", text: "gown" })).replies[0] as any;
    expect(r.kind).toBe("buttons");
    expect(r.body).toContain("Ankara Gown");
  });

  it("talk to seller passes the next message to the vendor", async () => {
    const t = await handleMessage(ctx(), { kind: "reply", id: "talk" });
    expect(t.state.await).toBe("message");
    const sent = await handleMessage(ctx(t.state), { kind: "text", text: "Do you deliver to Ibadan?" });
    expect(sent.forward).toBe("Do you deliver to Ibadan?");
    expect(sent.state.await).toBeNull();
  });

  it("a native WhatsApp cart order goes straight to checkout", async () => {
    const r = await handleMessage(ctx(), { kind: "order", items: [{ product_retailer_id: UUID(1), quantity: 2 }] });
    expect(r.state.cart).toEqual([{ p: UUID(1), v: null, q: 2 }]);
    expect(r.replies[0].kind).toBe("cta");
  });
});

describe("cart pricing", () => {
  it("re-reads price and stock, drops sold-out and unknown items, caps quantity", async () => {
    vi.mocked(query).mockImplementation(async (sql: unknown) =>
      (String(sql).includes("FROM products")
        ? [
            { id: UUID(1), name: "A", price: "1000", image_url: "https://i/a.jpg", images: null, stock_quantity: 2 },
            { id: UUID(2), name: "B", price: "500", image_url: null, images: null, stock_quantity: 0 },
          ]
        : []) as never,
    );
    const r = await priceLines("s1", [{ p: UUID(1), q: 5 }, { p: UUID(2), q: 1 }, { p: UUID(3), q: 1 }]);
    expect(r.items).toEqual([{ product_id: UUID(1), name: "A", price: 1000, image_url: "https://i/a.jpg", stock_quantity: 2, quantity: 2, size: null }]);
    expect(r.dropped).toBe(2);
  });
});

describe("incoming webhooks", () => {
  const payload = (msg: object) => ({
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: "555" }, contacts: [{ wa_id: "2348012345678", profile: { name: "Ada" } }], messages: [{ id: "wamid.1", from: "2348012345678", ...msg }] } }] }],
  });

  it("parses texts, taps and orders", () => {
    expect(parseInbound({ id: "1", from: "x", type: "text", text: { body: "hi" } })).toEqual({ kind: "text", text: "hi" });
    expect(parseInbound({ id: "1", from: "x", type: "interactive", interactive: { type: "list_reply", list_reply: { id: "cats", title: "Browse" } } })).toEqual({ kind: "reply", id: "cats", title: "Browse" });
    expect(parseInbound({ id: "1", from: "x", type: "sticker" })).toEqual({ kind: "other" });
  });

  it("answers a message once, through the store's number, and saves the state", async () => {
    setKeys(true);
    const fetchMock = vi.fn(async (_url: unknown, _init?: RequestInit) => new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    let seen = false;
    vi.mocked(queryOne).mockImplementation(async (sql: unknown) => {
      const s = String(sql);
      if (s.includes("FROM social_connections")) return { id: "k", store_id: "s1", status: "active", external_id: "555", token_enc: null, token_source: "env_test" } as never;
      if (s.includes("FROM stores")) return { id: "s1", name: "Amaka", slug: "amaka", is_active: true } as never;
      if (s.includes("INSERT INTO social_conversations")) return { id: "c1", state: {} } as never;
      return null as never;
    });
    vi.mocked(query).mockImplementation(async (sql: unknown) => {
      const s = String(sql);
      if (s.includes("INSERT INTO social_messages") && s.includes("'in'")) {
        if (seen) return [] as never;
        seen = true;
        return [{ id: 1 }] as never;
      }
      return [] as never;
    });
    expect(await processWhatsAppWebhook(payload({ type: "text", text: { body: "hi" } }))).toEqual({ handled: 1 });
    const sends = fetchMock.mock.calls.filter(([u]) => String(u).endsWith("/555/messages"));
    const reply = sends.map(([, init]) => JSON.parse(String((init as RequestInit).body))).find((b) => b.type === "interactive");
    expect(reply).toMatchObject({ to: "2348012345678", interactive: { type: "list" } });
    expect((sends[0][1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer test-token" });
    expect(vi.mocked(query).mock.calls.some(([s]) => String(s).includes("UPDATE social_conversations SET state"))).toBe(true);
    // Meta retries the same message: no second reply
    fetchMock.mockClear();
    expect(await processWhatsAppWebhook(payload({ type: "text", text: { body: "hi" } }))).toEqual({ handled: 0 });
    expect(fetchMock.mock.calls.filter(([, init]) => String((init as RequestInit)?.body ?? "").includes('"interactive"'))).toHaveLength(0);
  });

  it("messages for a paused or unknown number are ignored; seller questions notify the vendor", async () => {
    setKeys(true);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
    vi.mocked(queryOne).mockImplementation(async (sql: unknown) => (String(sql).includes("FROM social_connections") ? ({ store_id: "s1", status: "paused", external_id: "555" } as never) : null) as never);
    expect(await processWhatsAppWebhook(payload({ type: "text", text: { body: "hi" } }))).toEqual({ handled: 0 });

    vi.mocked(queryOne).mockImplementation(async (sql: unknown) => {
      const s = String(sql);
      if (s.includes("FROM social_connections")) return { store_id: "s1", status: "active", external_id: "555", token_source: "env_test" } as never;
      if (s.includes("FROM stores")) return { id: "s1", name: "Amaka", slug: "amaka", is_active: true } as never;
      if (s.includes("INSERT INTO social_conversations")) return { id: "c1", state: { await: "message" } } as never;
      return null as never;
    });
    vi.mocked(query).mockImplementation(async (sql: unknown) => (String(sql).includes("'in'") ? [{ id: 2 }] : []) as never);
    await processWhatsAppWebhook(payload({ type: "text", text: { body: "Is the red one available?" } }));
    expect(notifyStoreEvent).toHaveBeenCalledWith("s1", expect.objectContaining({ type: "whatsapp_message", body: expect.stringContaining("Is the red one available?") }));
  });
});

import { randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { verifyAdminSession } from "@/lib/admin-auth";
import { query, queryOne } from "@/lib/db";
import { hasFeature } from "@/lib/plan";
import { storeCanonicalBase } from "@/lib/seo";
import { embeddedSignupConfigId, embeddedSignupReady, GRAPH_VERSION, metaAppId, metaAppSecret, testNumber, whatsappSetupStatus } from "@/lib/meta/config";
import { encryptToken } from "@/lib/meta/crypto";
import { ensureSocialTables } from "@/lib/meta/db";
import { graph } from "@/lib/meta/graph";

export const dynamic = "force-dynamic";

// Dashboard -> Channels -> WhatsApp. Owner only.
//   GET     status (what this deployment supports, the store's connection, stats)
//   POST    { action: "embedded_signup", code, wabaId, phoneNumberId }  vendor's own number
//           { action: "test_number" }   Meta's test number (Duka admins only, for trying it out)
//   PATCH   { status: "active" | "paused" }
//   DELETE  disconnect

async function owner() {
  const user = await verifySession();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const store = await getUserStore(user.firebaseUid);
  if (!store) return { error: NextResponse.json({ error: "Only the store owner can manage WhatsApp" }, { status: 403 }) };
  return { store };
}

const unavailable = () => NextResponse.json({ error: "WhatsApp selling isn't switched on yet" }, { status: 503 });

export async function GET() {
  const o = await owner();
  if ("error" in o) return o.error;
  const setup = whatsappSetupStatus();
  const admin = await verifyAdminSession().catch(() => null);
  const base = {
    available: setup.available,
    included: await hasFeature(o.store.id, "sales_channels"),
    embeddedSignup: setup.embeddedSignup ? { appId: metaAppId(), configId: embeddedSignupConfigId(), version: GRAPH_VERSION() } : null,
    // Admins see what's missing (names only) and can try Meta's test number
    admin: admin ? { missing: setup.missing, testNumber: setup.testNumber } : null,
  };
  if (!setup.available) return NextResponse.json({ ...base, connection: null, stats: null });

  await ensureSocialTables();
  const [connection, stats] = await Promise.all([
    queryOne<{ display_name: string | null; display_phone: string | null; status: string; token_source: string; connected_at: string; last_error: string | null }>(
      `SELECT display_name, display_phone, status, token_source, connected_at, last_error FROM social_connections WHERE store_id = $1 AND channel = 'whatsapp'`,
      [o.store.id],
    ),
    queryOne<{ chats: number; carts: number; orders: number }>(
      `SELECT (SELECT COUNT(*)::int FROM social_conversations WHERE store_id = $1 AND channel = 'whatsapp') AS chats,
              (SELECT COUNT(*)::int FROM social_cart_links WHERE store_id = $1) AS carts,
              (SELECT COUNT(*)::int FROM social_cart_links WHERE store_id = $1 AND order_id IS NOT NULL) AS orders`,
      [o.store.id],
    ),
  ]);
  return NextResponse.json({ ...base, connection, stats, storeUrl: storeCanonicalBase(o.store as never) });
}

const PostSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("embedded_signup"), code: z.string().min(10).max(2000), wabaId: z.string().regex(/^\d{5,30}$/), phoneNumberId: z.string().regex(/^\d{5,30}$/) }),
  z.object({ action: z.literal("test_number") }),
]);

async function phoneDetails(phoneNumberId: string, token: string) {
  const r = await graph<{ display_phone_number?: string; verified_name?: string }>(phoneNumberId, { token, query: { fields: "display_phone_number,verified_name" } });
  return r.ok ? r.data : {};
}

async function save(storeId: string, c: { phoneNumberId: string; wabaId: string | null; tokenEnc: string | null; source: "oauth" | "env_test"; name?: string; phone?: string; lastError?: string | null }) {
  // The number belongs to this store now (a number can only feed one store)
  await query(`DELETE FROM social_connections WHERE channel = 'whatsapp' AND external_id = $1 AND store_id <> $2`, [c.phoneNumberId, storeId]);
  await query(
    `INSERT INTO social_connections (store_id, channel, status, external_id, account_id, display_name, display_phone, token_enc, token_source, last_error)
     VALUES ($1, 'whatsapp', 'active', $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (store_id, channel) DO UPDATE SET status = 'active', external_id = EXCLUDED.external_id, account_id = EXCLUDED.account_id,
       display_name = EXCLUDED.display_name, display_phone = EXCLUDED.display_phone, token_enc = EXCLUDED.token_enc,
       token_source = EXCLUDED.token_source, last_error = EXCLUDED.last_error, connected_at = NOW(), updated_at = NOW()`,
    [storeId, c.phoneNumberId, c.wabaId, c.name ?? null, c.phone ?? null, c.tokenEnc, c.source, c.lastError ?? null],
  );
}

export async function POST(req: NextRequest) {
  const o = await owner();
  if ("error" in o) return o.error;
  if (!whatsappSetupStatus().available) return unavailable();
  if (!(await hasFeature(o.store.id, "sales_channels"))) return NextResponse.json({ error: "WhatsApp selling is part of a paid plan" }, { status: 403 });
  const parsed = PostSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  await ensureSocialTables();

  if (parsed.data.action === "test_number") {
    const t = testNumber();
    if (!t) return unavailable();
    if (!(await verifyAdminSession().catch(() => null))) return NextResponse.json({ error: "Only Duka admins can use the test number" }, { status: 403 });
    const d = await phoneDetails(t.phoneNumberId, t.token);
    await save(o.store.id, { phoneNumberId: t.phoneNumberId, wabaId: t.wabaId || null, tokenEnc: null, source: "env_test", name: d.verified_name, phone: d.display_phone_number });
    return NextResponse.json({ ok: true });
  }

  if (!embeddedSignupReady()) return unavailable();
  const { code, wabaId, phoneNumberId } = parsed.data;
  // 1. The popup's code -> a business token for this vendor's WhatsApp account
  const tok = await graph<{ access_token?: string }>("oauth/access_token", {
    query: { client_id: metaAppId(), client_secret: metaAppSecret(), code },
  });
  if (!tok.ok || !tok.data.access_token) return NextResponse.json({ error: tok.ok ? "Meta didn't return a token" : tok.error }, { status: 502 });
  const token = tok.data.access_token;
  // 2. Send this WhatsApp account's messages to our webhook
  const sub = await graph(`${wabaId}/subscribed_apps`, { token, method: "POST" });
  if (!sub.ok) return NextResponse.json({ error: `Couldn't link your WhatsApp account: ${sub.error}` }, { status: 502 });
  // 3. Register the number for the Cloud API (already-registered / app-coexistence numbers can skip this)
  const reg = await graph(`${phoneNumberId}/register`, { token, body: { messaging_product: "whatsapp", pin: String(randomInt(100000, 999999)) } });
  const d = await phoneDetails(phoneNumberId, token);
  await save(o.store.id, {
    phoneNumberId,
    wabaId,
    tokenEnc: encryptToken(token),
    source: "oauth",
    name: d.verified_name,
    phone: d.display_phone_number,
    lastError: reg.ok ? null : reg.error,
  });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const o = await owner();
  if ("error" in o) return o.error;
  const parsed = z.object({ status: z.enum(["active", "paused"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  await ensureSocialTables();
  await query(`UPDATE social_connections SET status = $2, updated_at = NOW() WHERE store_id = $1 AND channel = 'whatsapp'`, [o.store.id, parsed.data.status]);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const o = await owner();
  if ("error" in o) return o.error;
  await ensureSocialTables();
  await query(`DELETE FROM social_connections WHERE store_id = $1 AND channel = 'whatsapp'`, [o.store.id]);
  return NextResponse.json({ ok: true });
}

import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { verifyAdminSession } from "@/lib/admin-auth";
import { query, queryOne } from "@/lib/db";
import { whatsappAddonActive } from "@/lib/meta/addon";
import { storeCanonicalBase } from "@/lib/seo";
import { embeddedSignupConfigId, embeddedSignupReady, GRAPH_VERSION, hostedSignupUrl, metaAppId, testNumber, whatsappSetupStatus } from "@/lib/meta/config";

function withState(url: string, state: string): string {
  const u = new URL(url);
  u.searchParams.set("state", state);
  return u.toString();
}
import { exchangeCode, onboard, phoneDetails, saveConnection, signupState } from "@/lib/meta/connect";
import { ensureSocialTables } from "@/lib/meta/db";

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

/** Put the store's products into its WhatsApp catalog straight away (and pick up what's already there). */
function firstSync(storeId: string) {
  after(async () => {
    const { syncStoreCatalog } = await import("@/lib/meta/catalog");
    await syncStoreCatalog(storeId).catch((e) => console.error("[catalog] first sync failed:", e));
  });
}

const unavailable = () => NextResponse.json({ error: "WhatsApp selling isn't switched on yet" }, { status: 503 });

export async function GET() {
  const o = await owner();
  if ("error" in o) return o.error;
  const setup = whatsappSetupStatus();
  const admin = await verifyAdminSession().catch(() => null);
  const base = {
    available: setup.available,
    included: await whatsappAddonActive(o.store.id),
    embeddedSignup: setup.embeddedSignup ? { appId: metaAppId(), configId: embeddedSignupConfigId(), version: GRAPH_VERSION() } : null,
    // Meta's hosted signup page, tagged with this store (signed) so the callback knows whose number it is
    hostedSignup: hostedSignupUrl() ? withState(hostedSignupUrl()!, signupState(o.store.id)) : null,
    // Admins see what's missing (names only) and can try Meta's test number
    admin: admin ? { missing: setup.missing, testNumber: setup.testNumber } : null,
  };
  if (!setup.available) return NextResponse.json({ ...base, connection: null, stats: null });

  await ensureSocialTables();
  const [connection, stats] = await Promise.all([
    queryOne<{
      display_name: string | null; display_phone: string | null; status: string; token_source: string; connected_at: string; last_error: string | null;
      catalog_id: string | null; catalog_synced_at: string | null; catalog_error: string | null; catalog_items: number;
    }>(
      `SELECT display_name, display_phone, status, token_source, connected_at, last_error, catalog_id, catalog_synced_at, catalog_error,
              (SELECT COUNT(*)::int FROM social_catalog_items i WHERE i.store_id = c.store_id AND i.product_id IS NOT NULL) AS catalog_items
         FROM social_connections c WHERE store_id = $1 AND channel = 'whatsapp'`,
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
  z.object({ action: z.literal("embedded_signup"), code: z.string().min(10).max(2000), wabaId: z.string().regex(/^\d{5,30}$/), phoneNumberId: z.string().regex(/^\d{5,30}$/), businessId: z.string().regex(/^\d{5,30}$/).optional() }),
  z.object({ action: z.literal("test_number") }),
]);

export async function POST(req: NextRequest) {
  const o = await owner();
  if ("error" in o) return o.error;
  if (!whatsappSetupStatus().available) return unavailable();
  if (!(await whatsappAddonActive(o.store.id))) return NextResponse.json({ error: "The WhatsApp shop add-on isn't active for your store" }, { status: 403 });
  const parsed = PostSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  await ensureSocialTables();

  if (parsed.data.action === "test_number") {
    const t = testNumber();
    if (!t) return unavailable();
    if (!(await verifyAdminSession().catch(() => null))) return NextResponse.json({ error: "Only Duka admins can use the test number" }, { status: 403 });
    const d = await phoneDetails(t.phoneNumberId, t.token);
    await saveConnection(o.store.id, { phoneNumberId: t.phoneNumberId, wabaId: t.wabaId || null, tokenEnc: null, source: "env_test", name: d.verified_name, phone: d.display_phone_number });
    firstSync(o.store.id);
    return NextResponse.json({ ok: true });
  }

  if (!embeddedSignupReady()) return unavailable();
  const { code, wabaId, phoneNumberId, businessId } = parsed.data;
  // The popup's code -> a business token, then link + register + save
  const tok = await exchangeCode(code);
  if (!tok.ok || !tok.data.access_token) return NextResponse.json({ error: tok.ok ? "Meta didn't return a token" : tok.error }, { status: 502 });
  const done = await onboard(o.store.id, tok.data.access_token, { wabaId, phoneNumberId, businessId });
  if (!done.ok) return NextResponse.json({ error: done.error }, { status: 502 });
  firstSync(o.store.id);
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

// Connecting a vendor's WhatsApp number to their Duka store. Shared by the
// "Connect WhatsApp" popup (dashboard) and Meta's hosted signup link
// (/api/meta/es-callback).

import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { query } from "@/lib/db";
import { metaAppId, metaAppSecret } from "./config";
import { encryptToken } from "./crypto";
import { ensureSocialTables } from "./db";
import { graph } from "./graph";

export async function saveConnection(
  storeId: string,
  c: { phoneNumberId: string; wabaId: string | null; businessId?: string | null; tokenEnc: string | null; source: "oauth" | "env_test"; name?: string; phone?: string; lastError?: string | null },
): Promise<void> {
  await ensureSocialTables();
  // A number can only feed one store
  await query(`DELETE FROM social_connections WHERE channel = 'whatsapp' AND external_id = $1 AND store_id <> $2`, [c.phoneNumberId, storeId]);
  await query(
    `INSERT INTO social_connections (store_id, channel, status, external_id, account_id, business_id, display_name, display_phone, token_enc, token_source, last_error)
     VALUES ($1, 'whatsapp', 'active', $2, $3, $9, $4, $5, $6, $7, $8)
     ON CONFLICT (store_id, channel) DO UPDATE SET status = 'active', external_id = EXCLUDED.external_id, account_id = EXCLUDED.account_id,
       business_id = COALESCE(EXCLUDED.business_id, social_connections.business_id),
       display_name = EXCLUDED.display_name, display_phone = EXCLUDED.display_phone, token_enc = EXCLUDED.token_enc,
       token_source = EXCLUDED.token_source, last_error = EXCLUDED.last_error,
       catalog_id = CASE WHEN social_connections.account_id IS DISTINCT FROM EXCLUDED.account_id THEN NULL ELSE social_connections.catalog_id END,
       connected_at = NOW(), updated_at = NOW()`,
    [storeId, c.phoneNumberId, c.wabaId, c.name ?? null, c.phone ?? null, c.tokenEnc, c.source, c.lastError ?? null, c.businessId ?? null],
  );
}

export async function phoneDetails(phoneNumberId: string, token: string) {
  const r = await graph<{ display_phone_number?: string; verified_name?: string }>(phoneNumberId, { token, query: { fields: "display_phone_number,verified_name" } });
  return r.ok ? r.data : {};
}

/** Signup code -> business token. Redirect-based (hosted) flows must send the same redirect_uri. */
export async function exchangeCode(code: string, redirectUri?: string) {
  return graph<{ access_token?: string }>("oauth/access_token", {
    query: { client_id: metaAppId(), client_secret: metaAppSecret(), code, ...(redirectUri ? { redirect_uri: redirectUri } : {}) },
  });
}

/**
 * The hosted flow doesn't hand us the account / number IDs, so find them
 * from what the token was granted: the WhatsApp account(s), then its numbers.
 */
export async function discoverAccount(token: string): Promise<{ wabaId: string; phoneNumberId: string } | null> {
  const appToken = `${metaAppId()}|${metaAppSecret()}`;
  const dbg = await graph<{ data?: { granular_scopes?: { scope: string; target_ids?: string[] }[] } }>("debug_token", { query: { input_token: token, access_token: appToken } });
  const wabas = dbg.ok
    ? [...new Set((dbg.data.data?.granular_scopes ?? []).filter((g) => g.scope.startsWith("whatsapp_business")).flatMap((g) => g.target_ids ?? []))]
    : [];
  for (const wabaId of wabas) {
    const nums = await graph<{ data?: { id: string }[] }>(`${wabaId}/phone_numbers`, { token, query: { fields: "id" } });
    const phoneNumberId = nums.ok ? nums.data.data?.[0]?.id : undefined;
    if (phoneNumberId) return { wabaId, phoneNumberId };
  }
  return null;
}

/** Link the account to our webhook, register the number, save it encrypted. */
export async function onboard(storeId: string, token: string, ids: { wabaId: string; phoneNumberId: string; businessId?: string | null }): Promise<{ ok: true } | { ok: false; error: string }> {
  const sub = await graph(`${ids.wabaId}/subscribed_apps`, { token, method: "POST" });
  if (!sub.ok) return { ok: false, error: `Couldn't link your WhatsApp account: ${sub.error}` };
  // Already-registered numbers (and WhatsApp Business app numbers) can skip this
  const reg = await graph(`${ids.phoneNumberId}/register`, { token, body: { messaging_product: "whatsapp", pin: String(randomInt(100000, 999999)) } });
  const d = await phoneDetails(ids.phoneNumberId, token);
  await saveConnection(storeId, {
    phoneNumberId: ids.phoneNumberId,
    wabaId: ids.wabaId,
    businessId: ids.businessId ?? null,
    tokenEnc: encryptToken(token),
    source: "oauth",
    name: d.verified_name,
    phone: d.display_phone_number,
    lastError: reg.ok ? null : reg.error,
  });
  return { ok: true };
}

/* ── "state" for the hosted link: which store, signed, valid 2 hours ── */

const STATE_TTL_MS = 2 * 60 * 60 * 1000;
const sign = (payload: string) => createHmac("sha256", `${metaAppSecret()}:es-state`).update(payload).digest("base64url").slice(0, 32);

export function signupState(storeId: string, now = Date.now()): string {
  const payload = `${storeId}.${now.toString(36)}`;
  return `${payload}.${sign(payload)}`;
}

export function readSignupState(state: string | null, now = Date.now()): string | null {
  const [storeId, ts, sig] = (state ?? "").split(".");
  if (!storeId || !ts || !sig) return null;
  const want = Buffer.from(sign(`${storeId}.${ts}`));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const at = parseInt(ts, 36);
  return Number.isFinite(at) && now - at < STATE_TTL_MS && at <= now + 60_000 ? storeId : null;
}

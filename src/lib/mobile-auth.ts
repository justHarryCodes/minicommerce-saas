// Google sign-in for the vendor app, done on the website.
//
//   app ─opens─> dukanigeria.com/auth/app?state=…&redirect=duka-vendors://auth
//   website signs in with Google (Firebase, same project as the app)
//   website ─POST /api/mobile/auth/handoff {idToken}─> one-time code
//   website ─redirects─> duka-vendors://auth?code=…&state=…
//   app ─POST /api/mobile/auth/exchange {code}─> Firebase custom token
//   app signInWithCustomToken(token)
//
// Codes are random, single-use, valid for 2 minutes, and stored only as a
// SHA-256 hash, so a leaked database row can't be replayed.

import { createHash, randomBytes } from "crypto";
import { query, queryOne } from "./db";

const TTL_SECONDS = 120;
const hash = (code: string) => createHash("sha256").update(code).digest("hex");

let ready = false;
async function ensureTable() {
  if (ready) return;
  await query(`
    CREATE TABLE IF NOT EXISTS mobile_auth_codes (
      code_hash   TEXT        PRIMARY KEY,
      firebase_uid TEXT       NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  ready = true;
}

/** A fresh one-time code for this signed-in user. */
export async function createHandoffCode(uid: string): Promise<string> {
  await ensureTable();
  // Tidy up old codes now and then
  await query("DELETE FROM mobile_auth_codes WHERE expires_at < NOW() - INTERVAL '1 hour'").catch(() => {});
  const code = randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO mobile_auth_codes (code_hash, firebase_uid, expires_at) VALUES ($1, $2, NOW() + make_interval(secs => $3))`,
    [hash(code), uid, TTL_SECONDS]
  );
  return code;
}

/** Use a code (once). Returns the user's id, or null if unknown, used or expired. */
export async function redeemHandoffCode(code: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{30,80}$/.test(code)) return null;
  await ensureTable();
  const row = await queryOne<{ firebase_uid: string }>(
    "DELETE FROM mobile_auth_codes WHERE code_hash = $1 AND expires_at > NOW() RETURNING firebase_uid",
    [hash(code)]
  );
  return row?.firebase_uid ?? null;
}

/** Where the website may send the code back to: only the vendor app's own link schemes. */
export function isAppRedirect(url: string | null | undefined): url is string {
  return !!url && /^(duka-vendors|exp\+duka-vendors):\/\/[\w./?=&%-]*$/.test(url);
}

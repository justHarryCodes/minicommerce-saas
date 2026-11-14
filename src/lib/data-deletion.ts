// Data deletion requests: from the public /data-deletion form (vendors who
// can't sign in, shoppers, people who chatted with a store on WhatsApp /
// Instagram / Facebook) and from Meta's data deletion callback, sent when
// someone removes Duka from their Facebook / Instagram settings.
//
// Each request gets a short code the person can use to check progress at
// /data-deletion?code=..., which is also the status URL Meta shows them.

import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { query, queryOne } from "@/lib/db";

export type DeletionStatus = "received" | "in_progress" | "completed" | "rejected";
export type DeletionRole = "vendor" | "customer" | "other";
export type DeletionSource = "web" | "meta";

export interface DeletionRequest {
  code: string;
  source: DeletionSource;
  role: DeletionRole | null;
  email: string | null;
  phone: string | null;
  store_name: string | null;
  details: string | null;
  meta_user_id: string | null;
  status: DeletionStatus;
  created_at: string;
  completed_at: string | null;
}

/** We promise to finish within this many days (the page and emails say so). */
export const DELETION_DAYS = 30;

let tableReady = false;
export async function ensureDeletionTable() {
  if (tableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS data_deletion_requests (
      code         TEXT        PRIMARY KEY,
      source       TEXT        NOT NULL,
      role         TEXT,
      email        TEXT,
      phone        TEXT,
      store_name   TEXT,
      details      TEXT,
      meta_user_id TEXT,
      status       TEXT        NOT NULL DEFAULT 'received',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      admin_note   TEXT,
      handled_by   TEXT
    )
  `);
  tableReady = true;
}

// No 0/O/1/I/L: codes get read out and typed by hand.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newDeletionCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `DEL-${s}`;
}

/** Normalise what people type: lower/upper case, spaces, missing "DEL-". */
export function normaliseCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^DEL/, "");
  return /^[A-Z0-9]{8}$/.test(raw) ? `DEL-${raw}` : null;
}

export async function createDeletionRequest(r: {
  source: DeletionSource;
  role?: DeletionRole | null;
  email?: string | null;
  phone?: string | null;
  storeName?: string | null;
  details?: string | null;
  metaUserId?: string | null;
}): Promise<string> {
  await ensureDeletionTable();
  // Meta can call more than once for the same person: hand back the open request.
  if (r.metaUserId) {
    const open = await queryOne<{ code: string }>(
      `SELECT code FROM data_deletion_requests WHERE meta_user_id = $1 AND status IN ('received', 'in_progress') ORDER BY created_at DESC LIMIT 1`,
      [r.metaUserId],
    );
    if (open) return open.code;
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newDeletionCode();
    const rows = await query<{ code: string }>(
      `INSERT INTO data_deletion_requests (code, source, role, email, phone, store_name, details, meta_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (code) DO NOTHING
       RETURNING code`,
      [code, r.source, r.role ?? null, r.email ?? null, r.phone ?? null, r.storeName ?? null, r.details ?? null, r.metaUserId ?? null],
    );
    if (rows.length) return code;
  }
  throw new Error("Could not create a deletion code");
}

export async function getDeletionRequest(code: string): Promise<Pick<DeletionRequest, "code" | "status" | "created_at" | "completed_at"> | null> {
  await ensureDeletionTable();
  return queryOne(`SELECT code, status, created_at, completed_at FROM data_deletion_requests WHERE code = $1`, [code]);
}

/* ───────────────────────────── Admin ───────────────────────────── */

export interface AdminDeletionRow extends DeletionRequest {
  admin_note: string | null;
  handled_by: string | null;
  /** The vendor store this request matches (by the owner's email), if any. */
  store_id: string | null;
  store_name_live: string | null;
  store_slug: string | null;
  store_deleted: boolean | null;
}

/** Open requests first (oldest first, so nothing waits), then the rest. */
export async function listDeletionRequests(): Promise<AdminDeletionRow[]> {
  await ensureDeletionTable();
  return query<AdminDeletionRow>(
    `SELECT r.code, r.source, r.role, r.email, r.phone, r.store_name, r.details, r.meta_user_id,
            r.status, r.created_at, r.completed_at, r.admin_note, r.handled_by,
            s.id AS store_id, s.name AS store_name_live, s.slug AS store_slug, (s.deleted_at IS NOT NULL) AS store_deleted
       FROM data_deletion_requests r
       LEFT JOIN LATERAL (
         SELECT id, name, slug, deleted_at FROM stores
          WHERE r.email IS NOT NULL AND LOWER(owner_email) = LOWER(r.email)
          ORDER BY deleted_at NULLS FIRST, created_at DESC LIMIT 1
       ) s ON true
      ORDER BY CASE WHEN r.status IN ('received', 'in_progress') THEN 0 ELSE 1 END,
               CASE WHEN r.status IN ('received', 'in_progress') THEN r.created_at END ASC,
               r.created_at DESC
      LIMIT 500`,
  );
}

export async function getDeletionRequestFull(code: string): Promise<(DeletionRequest & { admin_note: string | null }) | null> {
  await ensureDeletionTable();
  return queryOne(`SELECT * FROM data_deletion_requests WHERE code = $1`, [code]);
}

const FINAL: DeletionStatus[] = ["completed", "rejected"];
export const isFinal = (s: DeletionStatus) => FINAL.includes(s);

/** Moves an open request on. Returns false if it was already closed (two admins clicking). */
export async function setDeletionStatus(code: string, status: DeletionStatus, by: string, note?: string | null): Promise<boolean> {
  const rows = await query(
    `UPDATE data_deletion_requests
        SET status = $2, handled_by = $3, admin_note = COALESCE($4, admin_note), updated_at = NOW(),
            completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE completed_at END
      WHERE code = $1 AND status IN ('received', 'in_progress')
      RETURNING code`,
    [code, status, by, note ?? null],
  );
  return rows.length > 0;
}

/**
 * Deletes a vendor's account the same way their own "Delete account" button
 * does: wipes the store's personal and bank details, deactivates it, and
 * removes the sign-in account. Orders are kept (financial records).
 */
export async function deleteVendorAccount(storeId: string): Promise<{ ok: boolean; slug?: string }> {
  const store = await queryOne<{ id: string; slug: string; owner_id: string }>(`SELECT id, slug, owner_id FROM stores WHERE id = $1`, [storeId]);
  if (!store) return { ok: false };
  await query(
    `UPDATE stores
     SET name = 'Deleted Store', description = NULL, logo_url = NULL,
         phone = NULL, whatsapp = NULL,
         bank_name = NULL, bank_account_number = NULL, bank_account_name = NULL,
         paystack_public_key = NULL, nin_number = NULL,
         is_active = false, deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [store.id],
  );
  const { cacheDel } = await import("@/lib/redis");
  await cacheDel(`store:${store.slug}`).catch(() => {});
  try {
    const { adminAuth } = await import("@/lib/firebase-admin");
    await adminAuth.deleteUser(store.owner_id);
  } catch {
    // Store is wiped either way; a leftover sign-in account can be removed in Firebase.
  }
  return { ok: true, slug: store.slug };
}

/* ─────────────────────── Meta signed_request ─────────────────────── */

const b64url = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

/**
 * Verifies Meta's signed_request (HMAC-SHA256 of the payload with the app
 * secret) and returns the payload, or null if it's forged or malformed.
 */
export function parseSignedRequest(signed: string, appSecret: string): { user_id: string; [k: string]: unknown } | null {
  const [sigPart, payloadPart, extra] = signed.split(".");
  if (!sigPart || !payloadPart || extra !== undefined || !appSecret) return null;
  const expected = createHmac("sha256", appSecret).update(payloadPart).digest();
  const given = b64url(sigPart);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(b64url(payloadPart).toString("utf8"));
    if (String(payload?.algorithm ?? "").toUpperCase() !== "HMAC-SHA256") return null;
    if (typeof payload.user_id !== "string" && typeof payload.user_id !== "number") return null;
    return { ...payload, user_id: String(payload.user_id) };
  } catch {
    return null;
  }
}

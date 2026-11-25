// Duka Vendor Grant & Support Fund (server).
//
// Applying needs no login. Instead the applicant uses the store OWNER's email
// (their Duka login email, or the store's contact email) and confirms it from
// their inbox: that proves the store is theirs and stops spam. The store must
// have at least `min_products` live products, checked when they apply AND
// again when they confirm.
import crypto from "crypto";
import { query, queryOne } from "./db";
import { getAppUrl } from "./paystack";
import { emailConfigured, sendEmail } from "./notify/providers";
import { emailHeader } from "./notify/email-brand";
import { getStoreUrl } from "./utils";
import { maskEmail, naira, parseStoreLink, roundAcceptsApplications, type GrantRound, type GrantStatus } from "./grants-shared";

export * from "./grants-shared";

const TOKEN_HOURS = 48;
const ROOT = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? process.env.ROOT_DOMAIN ?? "dukanigeria.com").replace(/^www\./, "");

/* The app also creates these on first use (builds don't run migrations).
   Keep in step with migrations/vendor_grants.sql. */
export const GRANT_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS grant_rounds (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  amount       NUMERIC(12, 2) NOT NULL DEFAULT 50000,
  min_products INTEGER NOT NULL DEFAULT 30,
  is_open      BOOLEAN NOT NULL DEFAULT false,
  closes_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
  `CREATE TABLE IF NOT EXISTS grant_applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id         UUID NOT NULL REFERENCES grant_rounds(id) ON DELETE CASCADE,
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  store_link       TEXT NOT NULL,
  story            TEXT,
  product_count    INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified', 'submitted', 'shortlisted', 'selected', 'rejected')),
  token_hash       TEXT,
  token_expires_at TIMESTAMPTZ,
  verified_at      TIMESTAMPTZ,
  admin_note       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (round_id, store_id)
)`,
  "CREATE INDEX IF NOT EXISTS idx_grant_applications_round ON grant_applications (round_id, status, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_grant_applications_token ON grant_applications (token_hash) WHERE token_hash IS NOT NULL",
];

let ready: Promise<void> | null = null;
export function ensureGrantTables(): Promise<void> {
  ready ??= (async () => {
    for (const s of GRANT_STATEMENTS) await query(s);
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

const roundCols = "id, title, amount::float AS amount, min_products, is_open, closes_at, created_at";

/** The round shown on /grant: the newest one. */
export async function currentRound(): Promise<GrantRound | null> {
  await ensureGrantTables();
  return queryOne<GrantRound>(`SELECT ${roundCols} FROM grant_rounds ORDER BY created_at DESC LIMIT 1`);
}

export async function listRounds(): Promise<(GrantRound & { applications: number })[]> {
  await ensureGrantTables();
  return query(
    `SELECT r.id, r.title, r.amount::float AS amount, r.min_products, r.is_open, r.closes_at, r.created_at,
            (SELECT COUNT(*)::int FROM grant_applications a WHERE a.round_id = r.id AND a.status <> 'unverified') AS applications
     FROM grant_rounds r ORDER BY r.created_at DESC LIMIT 24`,
  );
}

type StoreRow = { id: string; slug: string; name: string; owner_id: string; owner_email: string | null; email: string | null; custom_domain: string | null };

/** The store a pasted link points to (active stores only). */
export async function findStoreByLink(link: string): Promise<StoreRow | null> {
  const parsed = parseStoreLink(link, ROOT);
  if (!parsed) return null;
  const cols = "id, slug, name, owner_id, owner_email, email, custom_domain";
  if (parsed.slug) return queryOne<StoreRow>(`SELECT ${cols} FROM stores WHERE slug = $1 AND is_active AND deleted_at IS NULL`, [parsed.slug]);
  return queryOne<StoreRow>(`SELECT ${cols} FROM stores WHERE lower(custom_domain) = $1 AND is_active AND deleted_at IS NULL`, [parsed.domain]);
}

export async function liveProductCount(storeId: string): Promise<number> {
  const r = await queryOne<{ n: number }>("SELECT COUNT(*)::int AS n FROM products WHERE store_id = $1 AND is_active = true", [storeId]);
  return r?.n ?? 0;
}

export interface Readiness {
  /** Different live products with a photo (the same name twice counts once) */
  products: number;
  /** What's missing, in plain words; empty = the store is properly set up */
  missing: string[];
}

/**
 * Is the store properly set up? Different products with photos, a logo, a
 * description, a contact number and a way to get paid. Sales don't count.
 */
export async function storeReadiness(storeId: string, minProducts: number): Promise<Readiness> {
  const r = await queryOne<{ products: number; logo: boolean; about: boolean; contact: boolean; paid: boolean }>(
    `SELECT
       (SELECT COUNT(DISTINCT lower(trim(p.name)))::int FROM products p
         WHERE p.store_id = s.id AND p.is_active = true AND COALESCE(NULLIF(p.image_url, ''), p.images[1]) IS NOT NULL) AS products,
       COALESCE(NULLIF(s.logo_url, ''), NULL) IS NOT NULL AS logo,
       length(trim(COALESCE(s.description, ''))) >= 20 AS about,
       COALESCE(NULLIF(trim(s.phone), ''), NULLIF(trim(s.whatsapp), '')) IS NOT NULL AS contact,
       (COALESCE(s.duka_pay_status, '') = 'active' OR COALESCE(NULLIF(s.bank_account_number, ''), NULL) IS NOT NULL) AS paid
     FROM stores s WHERE s.id = $1`,
    [storeId],
  );
  const products = r?.products ?? 0;
  const missing: string[] = [];
  if (products < minProducts) missing.push(`at least ${minProducts} different products with photos (you have ${products})`);
  if (!r?.logo) missing.push("a business logo");
  if (!r?.about) missing.push("a short store description");
  if (!r?.contact) missing.push("a phone or WhatsApp number");
  if (!r?.paid) missing.push("Duka Pay or bank details for getting paid");
  return { products, missing };
}

const missingText = (storeName: string, missing: string[]) =>
  `${storeName} isn't fully set up yet. It still needs ${missing.length > 1 ? `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}` : missing[0]}. Finish these in your Duka dashboard and apply again.`;

/** Does this email belong to the store's owner (login email) or the store itself (contact email)? */
export async function emailOwnsStore(store: StoreRow, email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  if (store.owner_email && store.owner_email.trim().toLowerCase() === e) return true;
  if (store.email && store.email.trim().toLowerCase() === e) return true;
  try {
    const { adminAuth } = await import("./firebase-admin");
    const u = await adminAuth.getUser(store.owner_id);
    if (u.email && u.email.toLowerCase() === e) return true;
  } catch {
    /* no Firebase admin here: the stored emails decide */
  }
  return false;
}

const hash = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

export type ApplyResult =
  | { ok: true; maskedEmail: string; resent: boolean }
  | { ok: false; status: number; error: string };

export async function applyForGrant(input: { name: string; email: string; storeLink: string; story?: string | null }): Promise<ApplyResult> {
  const round = await currentRound();
  if (!roundAcceptsApplications(round)) return { ok: false, status: 403, error: "Applications for this round are closed." };

  const store = await findStoreByLink(input.storeLink);
  if (!store) return { ok: false, status: 404, error: "We couldn't find that Duka store. Paste your store link, e.g. yourstore.dukanigeria.com" };

  const ready = await storeReadiness(store.id, round!.min_products);
  if (ready.missing.length) return { ok: false, status: 422, error: missingText(store.name, ready.missing) };
  const products = ready.products;

  if (!(await emailOwnsStore(store, input.email))) {
    return { ok: false, status: 422, error: "Use the email address you log in to Duka with (or your store's contact email in Settings). We'll send a link there to confirm the store is yours." };
  }

  const existing = await queryOne<{ id: string; status: GrantStatus }>("SELECT id, status FROM grant_applications WHERE round_id = $1 AND store_id = $2", [round!.id, store.id]);
  if (existing && existing.status !== "unverified") {
    return { ok: false, status: 409, error: `${store.name} has already applied for this round. We'll be in touch by email.` };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const email = input.email.trim().toLowerCase();
  const values = [input.name.trim(), email, input.storeLink.trim().slice(0, 300), input.story?.trim() || null, products, hash(token), TOKEN_HOURS];
  if (existing) {
    await query(
      `UPDATE grant_applications SET name = $1, email = $2, store_link = $3, story = $4, product_count = $5,
         token_hash = $6, token_expires_at = NOW() + make_interval(hours => $7::int), updated_at = NOW()
       WHERE id = $8`,
      [...values, existing.id],
    );
  } else {
    await query(
      `INSERT INTO grant_applications (name, email, store_link, story, product_count, token_hash, token_expires_at, round_id, store_id)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + make_interval(hours => $7::int), $8, $9)
       ON CONFLICT (round_id, store_id) DO NOTHING`,
      [...values, round!.id, store.id],
    );
  }

  const link = `${getAppUrl()}/grant/verify?token=${token}`;
  if (emailConfigured()) {
    const r = await sendEmail(email, `Confirm your Duka Vendor Grant application`, verifyEmailHtml(input.name, store.name, round!, link));
    if (!r.ok) return { ok: false, status: 502, error: "We couldn't send the confirmation email. Please try again in a few minutes." };
  } else {
    console.warn("[grant] email not configured; confirmation link:", link);
  }
  return { ok: true, maskedEmail: maskEmail(email), resent: !!existing };
}

export type VerifyResult =
  | { ok: true; storeName: string; round: GrantRound; already: boolean }
  | { ok: false; error: string };

/** The applicant clicked the link in their email. */
export async function verifyGrantApplication(token: string): Promise<VerifyResult> {
  if (!/^[a-f0-9]{64}$/.test(token)) return { ok: false, error: "This link isn't complete. Open it straight from the email." };
  await ensureGrantTables();
  const app = await queryOne<{ id: string; store_id: string; status: GrantStatus; token_expires_at: string | null; round_id: string; name: string; email: string }>(
    "SELECT id, store_id, status, token_expires_at, round_id, name, email FROM grant_applications WHERE token_hash = $1",
    [hash(token)],
  );
  if (!app) return { ok: false, error: "This link has already been used or has expired. If you've confirmed before, your application is in." };
  const round = await queryOne<GrantRound>(`SELECT ${roundCols} FROM grant_rounds WHERE id = $1`, [app.round_id]);
  const store = await queryOne<{ name: string }>("SELECT name FROM stores WHERE id = $1 AND is_active", [app.store_id]);
  if (!round || !store) return { ok: false, error: "This round or store is no longer available." };
  if (app.status !== "unverified") return { ok: true, storeName: store.name, round, already: true };
  if (app.token_expires_at && new Date(app.token_expires_at) < new Date()) return { ok: false, error: "This link has expired. Apply again and we'll send a new one." };
  if (!roundAcceptsApplications(round)) return { ok: false, error: "Applications for this round closed before you confirmed." };

  // Checked again: the store must still be properly set up
  const ready = await storeReadiness(app.store_id, round.min_products);
  if (ready.missing.length) return { ok: false, error: missingText(store.name, ready.missing) };
  const products = ready.products;
  await query(
    `UPDATE grant_applications SET status = 'submitted', verified_at = NOW(), product_count = $2, token_hash = NULL, token_expires_at = NULL, updated_at = NOW()
     WHERE id = $1 AND status = 'unverified'`,
    [app.id, products],
  );
  if (emailConfigured()) void sendEmail(app.email, "We've received your Duka Vendor Grant application", receivedEmailHtml(app.name, store.name, round)).catch(() => null);
  return { ok: true, storeName: store.name, round, already: false };
}

/* ───────────────────────── Admin ───────────────────────── */

export interface ApplicationRow {
  /** live_products = different products with photos right now */
  id: string;
  name: string;
  email: string;
  store_link: string;
  story: string | null;
  product_count: number;
  live_products: number;
  status: GrantStatus;
  admin_note: string | null;
  created_at: string;
  verified_at: string | null;
  store_id: string;
  store_name: string;
  store_slug: string;
  store_url: string;
  store_orders: number;
  /** What the store is still missing right now (empty = properly set up) */
  setup_missing: string[];
}

export async function listApplications(roundId: string): Promise<ApplicationRow[]> {
  await ensureGrantTables();
  const rows = await query<Omit<ApplicationRow, "store_url"> & { custom_domain: string | null }>(
    `SELECT a.id, a.name, a.email, a.store_link, a.story, a.product_count, a.status, a.admin_note, a.created_at, a.verified_at,
            s.id AS store_id, s.name AS store_name, s.slug AS store_slug, s.custom_domain,
            (SELECT COUNT(*)::int FROM products p WHERE p.store_id = s.id AND p.is_active) AS live_products,
            (SELECT COUNT(*)::int FROM orders o WHERE o.store_id = s.id AND o.order_status <> 'cancelled') AS store_orders
     FROM grant_applications a JOIN stores s ON s.id = a.store_id
     WHERE a.round_id = $1
     ORDER BY CASE a.status WHEN 'selected' THEN 0 WHEN 'shortlisted' THEN 1 WHEN 'submitted' THEN 2 WHEN 'rejected' THEN 3 ELSE 4 END, a.created_at DESC`,
    [roundId],
  );
  const minProducts = (await queryOne<{ min_products: number }>("SELECT min_products FROM grant_rounds WHERE id = $1", [roundId]))?.min_products ?? 30;
  return Promise.all(
    rows.map(async ({ custom_domain, ...r }) => {
      const ready = await storeReadiness(r.store_id, minProducts);
      return { ...r, live_products: ready.products, setup_missing: ready.missing, store_url: getStoreUrl(r.store_slug, custom_domain) };
    }),
  );
}

/* ───────────────────────── Emails ───────────────────────── */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function shell(body: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:28px 24px;color:#18181b">${emailHeader()}${body}
<p style="font-size:12px;color:#a1a1aa;margin:28px 0 0">Duka Vendor Grant &amp; Support Fund · Supporting the people behind the businesses.</p></div>`;
}

function verifyEmailHtml(name: string, storeName: string, round: GrantRound, link: string): string {
  return shell(`<p style="font-size:16px;margin:0 0 12px">Hi ${esc(name.split(/\s+/)[0] || "there")},</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 18px">You started an application for <strong>${esc(storeName)}</strong> in the <strong>${esc(round.title)}</strong> round of the Duka Vendor Grant &amp; Support Fund (${naira(round.amount)}).</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 22px">Confirm your email to submit it. This also confirms the store is yours.</p>
<a href="${esc(link)}" style="display:inline-block;background:#f59e0b;color:#111;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:700;font-size:15px">Confirm and submit my application</a>
<p style="font-size:13px;color:#71717a;line-height:1.5;margin:22px 0 0">The link works for ${TOKEN_HOURS} hours. If you didn't apply, ignore this email and nothing will happen.</p>`);
}

function receivedEmailHtml(name: string, storeName: string, round: GrantRound): string {
  return shell(`<p style="font-size:16px;margin:0 0 12px">Hi ${esc(name.split(/\s+/)[0] || "there")},</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 12px">Your application for <strong>${esc(storeName)}</strong> is in! 🎉</p>
<p style="font-size:15px;line-height:1.6;margin:0">The Duka team reviews every application for the <strong>${esc(round.title)}</strong> round and contacts the selected business by email. Keep your store active and your products up to date in the meantime.</p>`);
}

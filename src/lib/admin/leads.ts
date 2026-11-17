// Admin -> Leads: two pipelines to grow Duka.
//
//   unfinished  people who signed up but haven't got a working store yet:
//               a store with < 2 products or no payout account, or a sign-up
//               with no store at all (from Firebase, last 60 days)
//   upgrade     stores on Free (or a lapsed paid plan) that are already
//               selling: ranked by how ready they are to pay
//
// Each lead carries a status the team sets (new / contacted / converted /
// lost) and a note, in admin_leads.

import { query } from "@/lib/db";
import { MIN_PRODUCTS } from "@/lib/notify/setup-reminders";

export type LeadStatus = "new" | "contacted" | "converted" | "lost";
export const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "converted", "lost"];

export interface UnfinishedLead {
  key: string; // store:<id> | user:<uid>
  storeId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  category: string | null;
  createdAt: string;
  products: number;
  hasPayout: boolean;
  hasLogo: boolean;
  /** What's stopping them, most important first */
  missing: string[];
  lastReminderAt: string | null;
  status: LeadStatus;
  note: string | null;
}

export interface UpgradeLead {
  key: string;
  storeId: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  category: string | null;
  plan: string;
  lapsed: boolean;
  orders30: number;
  revenue30: number;
  products: number;
  productLimit: number;
  lastOrderAt: string | null;
  lastPitchAt: string | null;
  /** 0-100: higher = more ready to pay */
  score: number;
  status: LeadStatus;
  note: string | null;
}

let ready = false;
export async function ensureLeadsTable() {
  if (ready) return;
  await query(`
    CREATE TABLE IF NOT EXISTS admin_leads (
      lead_key   TEXT PRIMARY KEY,
      status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
      note       TEXT,
      updated_by TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  ready = true;
}

async function statuses(keys: string[]): Promise<Map<string, { status: LeadStatus; note: string | null }>> {
  if (!keys.length) return new Map();
  await ensureLeadsTable();
  const rows = await query<{ lead_key: string; status: LeadStatus; note: string | null }>(
    `SELECT lead_key, status, note FROM admin_leads WHERE lead_key = ANY($1::text[])`,
    [keys],
  );
  return new Map(rows.map((r) => [r.lead_key, { status: r.status, note: r.note }]));
}

export async function setLeadStatus(key: string, patch: { status?: LeadStatus; note?: string | null }, by: string): Promise<void> {
  await ensureLeadsTable();
  await query(
    `INSERT INTO admin_leads (lead_key, status, note, updated_by) VALUES ($1, COALESCE($2, 'new'), $3, $4)
     ON CONFLICT (lead_key) DO UPDATE SET
       status = COALESCE($2, admin_leads.status),
       note = CASE WHEN $5 THEN $3 ELSE admin_leads.note END,
       updated_by = $4, updated_at = NOW()`,
    [key, patch.status ?? null, patch.note ?? null, by, patch.note !== undefined],
  );
}

/* ───────────────────────────── Unfinished ───────────────────────────── */

export function missingFor(s: { products: number; hasPayout: boolean; hasLogo: boolean }): string[] {
  const out: string[] = [];
  if (s.products === 0) out.push("No products");
  else if (s.products < MIN_PRODUCTS) out.push(`Only ${s.products} product`);
  if (!s.hasPayout) out.push("No payout account");
  if (!s.hasLogo) out.push("No logo");
  return out;
}

export async function unfinishedLeads(opts: { withSignups?: boolean } = {}): Promise<UnfinishedLead[]> {
  const stores = await query<{
    id: string; name: string; owner_id: string; owner_email: string | null; phone: string | null; whatsapp: string | null;
    primary_category: string | null; created_at: string; products: number; has_payout: boolean; has_logo: boolean; reminded: string | null;
  }>(
    `SELECT s.id, s.name, s.owner_id, s.owner_email, s.phone, s.whatsapp, s.primary_category, s.created_at,
            (SELECT COUNT(*)::int FROM products p WHERE p.store_id = s.id AND p.is_active = true) AS products,
            (s.duka_pay_status = 'active' OR COALESCE(s.bank_account_number, '') <> '') AS has_payout,
            (COALESCE(s.logo_url, '') <> '') AS has_logo,
            (SELECT r.last_sent_at FROM setup_reminders r WHERE r.subject = 'store:' || s.id::text) AS reminded
       FROM stores s
      WHERE s.is_active = true AND s.deleted_at IS NULL
        AND ((SELECT COUNT(*) FROM products p WHERE p.store_id = s.id AND p.is_active = true) < ${MIN_PRODUCTS}
             OR NOT (s.duka_pay_status = 'active' OR COALESCE(s.bank_account_number, '') <> ''))
      ORDER BY s.created_at DESC
      LIMIT 500`,
  ).catch(async (e) => {
    // setup_reminders not created yet
    if (!String(e).includes("setup_reminders")) throw e;
    return [];
  });

  const leads: Omit<UnfinishedLead, "status" | "note">[] = stores.map((s) => ({
    key: `store:${s.id}`,
    storeId: s.id,
    name: s.name,
    email: s.owner_email,
    phone: s.whatsapp || s.phone,
    category: s.primary_category,
    createdAt: s.created_at,
    products: s.products,
    hasPayout: s.has_payout,
    hasLogo: s.has_logo,
    missing: missingFor({ products: s.products, hasPayout: s.has_payout, hasLogo: s.has_logo }),
    lastReminderAt: s.reminded,
  }));

  if (opts.withSignups) leads.push(...(await signupsWithoutStore().catch(() => [])));
  const st = await statuses(leads.map((l) => l.key));
  return leads.map((l) => ({ ...l, status: st.get(l.key)?.status ?? "new", note: st.get(l.key)?.note ?? null }));
}

/** Sign-ups in the last 60 days who never created a store (and aren't staff/admins/affiliates). */
async function signupsWithoutStore(): Promise<Omit<UnfinishedLead, "status" | "note">[]> {
  const { adminAuth } = await import("@/lib/firebase-admin");
  const since = Date.now() - 60 * 86_400_000;
  const users: { uid: string; email: string; name: string | null; created: string; phone: string | null }[] = [];
  let token: string | undefined;
  for (let page = 0; page < 5; page++) {
    const res = await adminAuth.listUsers(1000, token);
    for (const u of res.users) {
      const created = new Date(u.metadata.creationTime).getTime();
      if (!u.email || u.disabled || created < since) continue;
      users.push({ uid: u.uid, email: u.email, name: u.displayName ?? null, created: new Date(created).toISOString(), phone: u.phoneNumber ?? null });
    }
    token = res.pageToken;
    if (!token) break;
  }
  if (!users.length) return [];
  const uids = users.map((u) => u.uid);
  const taken = new Set(
    (
      await query<{ uid: string }>(
        `SELECT owner_id AS uid FROM stores WHERE owner_id = ANY($1::text[])
         UNION SELECT firebase_uid FROM store_members WHERE firebase_uid = ANY($1::text[])
         UNION SELECT firebase_uid FROM admin_users WHERE firebase_uid = ANY($1::text[])`,
        [uids],
      ).catch(() => query<{ uid: string }>(`SELECT owner_id AS uid FROM stores WHERE owner_id = ANY($1::text[])`, [uids]))
    ).map((r) => r.uid),
  );
  return users
    .filter((u) => !taken.has(u.uid))
    .map((u) => ({
      key: `user:${u.uid}`,
      storeId: null,
      name: u.name || u.email.split("@")[0],
      email: u.email,
      phone: u.phone,
      category: null,
      createdAt: u.created,
      products: 0,
      hasPayout: false,
      hasLogo: false,
      missing: ["No store yet"],
      lastReminderAt: null,
    }));
}

/* ────────────────────────────── Upgrade ────────────────────────────── */

/** 0-100 readiness: sales in the last 30 days, order count, and how close they are to the product limit. */
export function upgradeScore(x: { revenue30: number; orders30: number; products: number; productLimit: number }): number {
  const revenue = Math.min(40, Math.log10(1 + x.revenue30) * 8); // ₦100k ≈ 40
  const orders = Math.min(35, x.orders30 * 5);
  const limit = x.productLimit > 0 ? Math.min(25, (x.products / x.productLimit) * 25) : 0;
  return Math.round(revenue + orders + limit);
}

export async function upgradeLeads(): Promise<UpgradeLead[]> {
  const rows = await query<{
    id: string; name: string; slug: string; owner_email: string | null; phone: string | null; whatsapp: string | null;
    primary_category: string | null; plan_name: string | null; price_monthly: string | null; plan_expires_at: string | null;
    orders30: number; revenue30: string; products: number; last_order: string | null; free_limit: number | null; pitched: string | null;
  }>(
    `SELECT s.id, s.name, s.slug, s.owner_email, s.phone, s.whatsapp, s.primary_category,
            pl.name AS plan_name, pl.price_monthly, s.plan_expires_at,
            o.orders30, o.revenue30, o.last_order,
            (SELECT COUNT(*)::int FROM products p WHERE p.store_id = s.id AND p.is_active = true) AS products,
            (SELECT max_products FROM plans WHERE price_monthly = 0 AND is_active = true ORDER BY sort_order LIMIT 1) AS free_limit,
            (SELECT r.last_sent_at FROM setup_reminders r WHERE r.subject = 'upgrade:' || s.id::text) AS pitched
       FROM stores s
       LEFT JOIN plans pl ON pl.id = s.current_plan_id
       JOIN LATERAL (
         SELECT COUNT(*)::int AS orders30, COALESCE(SUM(COALESCE(total_amount, total)), 0) AS revenue30, MAX(created_at) AS last_order
           FROM orders WHERE store_id = s.id AND payment_status = 'paid' AND created_at > NOW() - INTERVAL '30 days'
       ) o ON o.orders30 > 0
      WHERE s.is_active = true AND s.deleted_at IS NULL
        AND NOT (s.current_plan_id IS NOT NULL AND s.plan_expires_at > NOW() AND COALESCE(pl.price_monthly, 0) > 0)
      LIMIT 500`,
  ).catch(async (e) => {
    if (!String(e).includes("setup_reminders")) throw e;
    return [];
  });

  const leads = rows.map((r) => {
    const lapsed = Number(r.price_monthly ?? 0) > 0;
    const productLimit = Number(r.free_limit ?? 0);
    const base = { revenue30: Number(r.revenue30), orders30: r.orders30, products: r.products, productLimit };
    return {
      key: `upgrade:${r.id}`,
      storeId: r.id,
      name: r.name,
      slug: r.slug,
      email: r.owner_email,
      phone: r.whatsapp || r.phone,
      category: r.primary_category,
      plan: lapsed ? `${r.plan_name} (lapsed)` : "Free",
      lapsed,
      ...base,
      lastOrderAt: r.last_order,
      lastPitchAt: r.pitched,
      score: upgradeScore(base),
    };
  });
  const st = await statuses(leads.map((l) => l.key));
  return leads
    .map((l) => ({ ...l, status: st.get(l.key)?.status ?? ("new" as LeadStatus), note: st.get(l.key)?.note ?? null }))
    .sort((a, b) => b.score - a.score);
}

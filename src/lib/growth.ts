// Growth engine (server). See growth-shared.ts for the idea in one screen.
import { randomInt } from "crypto";
import { query, queryOne } from "./db";
import { PHONE_KEY_SQL } from "./customers";
import { toNgInternational } from "./phone";
import { WELCOME_CODE_DAYS, type ContactRow, type GrowthStats } from "./growth-shared";
import { ensureGrowthSchema } from "./growth-schema";

export * from "./growth-shared";

/** The traffic source that first brought this browser to the store, if we saw it. */
export async function firstSourceFor(storeId: string, visitorId: string | null | undefined): Promise<string | null> {
  if (!visitorId || !/^[\w-]{8,64}$/.test(visitorId)) return null;
  const row = await queryOne<{ source: string | null }>(
    `SELECT source FROM store_visits WHERE store_id = $1 AND visitor_id = $2 ORDER BY visited_at ASC LIMIT 1`,
    [storeId, visitorId],
  ).catch(() => null);
  return row?.source ?? null;
}

interface ContactInput {
  phone: string;
  name?: string | null;
  email?: string | null;
  visitorId?: string | null;
}

/** Add (or re-subscribe) someone who agreed to hear from the store. */
export async function upsertContact(storeId: string, input: ContactInput, source: "welcome" | "checkout"): Promise<{ id: string; phoneKey: string } | null> {
  const phoneKey = toNgInternational(input.phone);
  if (!phoneKey) return null;
  await ensureGrowthSchema();
  const firstSource = await firstSourceFor(storeId, input.visitorId);
  const row = await queryOne<{ id: string }>(
    `INSERT INTO store_contacts (store_id, phone, phone_key, email, name, source, marketing_consent, consent_at, visitor_id, first_source)
     VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), $7, $8)
     ON CONFLICT (store_id, phone_key) DO UPDATE SET
       marketing_consent = true,
       consent_at = NOW(),
       unsubscribed_at = NULL,
       email = COALESCE(EXCLUDED.email, store_contacts.email),
       name = COALESCE(EXCLUDED.name, store_contacts.name),
       visitor_id = COALESCE(store_contacts.visitor_id, EXCLUDED.visitor_id),
       first_source = COALESCE(store_contacts.first_source, EXCLUDED.first_source),
       updated_at = NOW()
     RETURNING id`,
    [storeId, input.phone.trim(), phoneKey, input.email?.trim() || null, input.name?.trim() || null, source, input.visitorId || null, firstSource],
  );
  return row ? { id: row.id, phoneKey } : null;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
function welcomeCode(): string {
  let s = "WELCOME";
  for (let i = 0; i < 5; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}

export type WelcomeResult =
  | { status: "code"; code: string; percent: number; expiresAt: string; contactId?: string }
  | { status: "customer" } // already bought here: the offer is for first orders
  | { status: "used" }; // already had (and used) their welcome code

/**
 * Someone took the welcome offer: save them as a contact and hand out their
 * own one-time code (or the one they already have).
 */
export async function claimWelcome(store: { id: string; welcome_offer_percent: number }, input: ContactInput): Promise<WelcomeResult | { status: "invalid_phone" }> {
  const contact = await upsertContact(store.id, input, "welcome");
  if (!contact) return { status: "invalid_phone" };

  const bought = await queryOne(
    `SELECT 1 FROM orders o WHERE o.store_id = $1 AND o.order_status <> 'cancelled' AND ${PHONE_KEY_SQL} = $2 LIMIT 1`,
    [store.id, contact.phoneKey],
  );
  if (bought) return { status: "customer" };

  const existing = await queryOne<{ code: string; uses_count: number; expires_at: string | null; discount_value: number }>(
    `SELECT code, uses_count, expires_at, discount_value FROM coupons WHERE contact_id = $1 AND kind = 'welcome' ORDER BY created_at DESC LIMIT 1`,
    [contact.id],
  );
  if (existing && existing.uses_count > 0) return { status: "used" };
  if (existing && (!existing.expires_at || new Date(existing.expires_at) > new Date())) {
    return { status: "code", code: existing.code, percent: Number(existing.discount_value), expiresAt: existing.expires_at ?? "", contactId: contact.id };
  }

  const percent = Math.min(50, Math.max(1, Math.round(store.welcome_offer_percent || 10)));
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = welcomeCode();
    const row = await queryOne<{ expires_at: string }>(
      `INSERT INTO coupons (store_id, code, discount_type, discount_value, min_order_amount, max_uses, expires_at, kind, contact_id)
       SELECT $1, $2, 'percentage', $3, 0, 1, NOW() + ($4 || ' days')::interval, 'welcome', $5
       WHERE NOT EXISTS (SELECT 1 FROM coupons WHERE store_id = $1 AND code = $2)
       RETURNING expires_at`,
      [store.id, code, percent, String(WELCOME_CODE_DAYS), contact.id],
    );
    if (row) return { status: "code", code, percent, expiresAt: row.expires_at, contactId: contact.id };
  }
  throw new Error("Couldn't create a welcome code");
}

/* ───────────────────────── Dashboard ───────────────────────── */

export async function growthStats(storeId: string, days: number): Promise<GrowthStats> {
  await ensureGrowthSchema();
  const since = `NOW() - make_interval(days => $2::int)`;
  const buyersCte = `
    WITH o AS (
      SELECT o.total, o.created_at, o.first_source, o.coupon_code, ${PHONE_KEY_SQL} AS pk
      FROM orders o
      WHERE o.store_id = $1 AND o.order_status <> 'cancelled' AND COALESCE(o.customer_phone, '') <> ''
    ),
    r AS (SELECT o.*, ROW_NUMBER() OVER (PARTITION BY pk ORDER BY created_at) AS n FROM o)`;

  const [visits, contacts, buyers, channels, welcome] = await Promise.all([
    queryOne<{ n: number }>(
      `SELECT COUNT(DISTINCT visitor_id)::int AS n FROM store_visits WHERE store_id = $1 AND visited_at > (NOW() AT TIME ZONE 'Africa/Lagos')::date - $2::int`,
      [storeId, days],
    ),
    queryOne<{ fresh: number; total: number }>(
      `SELECT COUNT(*) FILTER (WHERE created_at > ${since})::int AS fresh,
              COUNT(*)::int AS total
       FROM store_contacts WHERE store_id = $1 AND marketing_consent AND unsubscribed_at IS NULL`,
      [storeId, days],
    ),
    queryOne<{ first_orders: number; returning: number; revenue: string; returning_revenue: string; repeaters: number; all_buyers: number }>(
      `${buyersCte}
       SELECT
         COUNT(DISTINCT pk) FILTER (WHERE n = 1 AND created_at > ${since})::int AS first_orders,
         COUNT(DISTINCT pk) FILTER (WHERE n > 1 AND created_at > ${since})::int AS returning,
         COALESCE(SUM(total) FILTER (WHERE created_at > ${since}), 0) AS revenue,
         COALESCE(SUM(total) FILTER (WHERE created_at > ${since} AND n > 1), 0) AS returning_revenue,
         (SELECT COUNT(*) FROM (SELECT pk FROM o GROUP BY pk HAVING COUNT(*) > 1) x)::int AS repeaters,
         (SELECT COUNT(DISTINCT pk) FROM o)::int AS all_buyers
       FROM r`,
      [storeId, days],
    ),
    query<{ source: string; visitors: number; orders: number; buyers: number; revenue: string }>(
      `${buyersCte}
       SELECT source, SUM(visitors)::int AS visitors, SUM(orders)::int AS orders, SUM(buyers)::int AS buyers, SUM(revenue) AS revenue FROM (
         SELECT COALESCE(source, 'direct') AS source, COUNT(DISTINCT visitor_id) AS visitors, 0 AS orders, 0 AS buyers, 0 AS revenue
         FROM store_visits WHERE store_id = $1 AND visited_at > (NOW() AT TIME ZONE 'Africa/Lagos')::date - $2::int
         GROUP BY 1
         UNION ALL
         SELECT COALESCE(first_source, 'direct'), 0, COUNT(*), COUNT(DISTINCT pk), SUM(total)
         FROM o WHERE created_at > ${since}
         GROUP BY 1
       ) x GROUP BY source ORDER BY SUM(revenue) DESC, SUM(visitors) DESC`,
      [storeId, days],
    ),
    queryOne<{ issued: number; used: number; revenue: string }>(
      `SELECT COUNT(*)::int AS issued,
              COUNT(*) FILTER (WHERE c.uses_count > 0)::int AS used,
              COALESCE((SELECT SUM(o.total) FROM orders o
                        WHERE o.store_id = $1 AND o.order_status <> 'cancelled' AND o.created_at > ${since}
                          AND o.coupon_code IN (SELECT code FROM coupons WHERE store_id = $1 AND kind = 'welcome')), 0) AS revenue
       FROM coupons c WHERE c.store_id = $1 AND c.kind = 'welcome' AND c.created_at > ${since}`,
      [storeId, days],
    ),
  ]);

  const allBuyers = buyers?.all_buyers ?? 0;
  return {
    days,
    visitors: visits?.n ?? 0,
    newContacts: contacts?.fresh ?? 0,
    totalContacts: contacts?.total ?? 0,
    firstOrders: buyers?.first_orders ?? 0,
    returningBuyers: buyers?.returning ?? 0,
    repeatRate: allBuyers ? Math.round(((buyers?.repeaters ?? 0) / allBuyers) * 100) : 0,
    revenue: Number(buyers?.revenue ?? 0),
    returningRevenue: Number(buyers?.returning_revenue ?? 0),
    channels: channels.map((c) => ({ source: c.source, visitors: Number(c.visitors), orders: Number(c.orders), buyers: Number(c.buyers), revenue: Number(c.revenue) })),
    welcome: { issued: welcome?.issued ?? 0, used: welcome?.used ?? 0, revenue: Number(welcome?.revenue ?? 0) },
  };
}

/** Everyone who agreed to hear from the store, newest first, with what they've bought. */
export async function listContacts(storeId: string, limit = 500): Promise<ContactRow[]> {
  await ensureGrowthSchema();
  const rows = await query<ContactRow & { orders: string; spent: string }>(
    `SELECT c.id, c.name, c.phone, c.email, c.source, c.first_source, c.created_at, c.unsubscribed_at,
            COALESCE(x.orders, 0) AS orders, COALESCE(x.spent, 0) AS spent,
            cp.code, COALESCE(cp.uses_count > 0, false) AS code_used
     FROM store_contacts c
     LEFT JOIN LATERAL (
       SELECT COUNT(*) AS orders, SUM(o.total) AS spent FROM orders o
       WHERE o.store_id = c.store_id AND o.order_status <> 'cancelled' AND ${PHONE_KEY_SQL} = c.phone_key
     ) x ON true
     LEFT JOIN LATERAL (
       SELECT code, uses_count FROM coupons WHERE contact_id = c.id ORDER BY created_at DESC LIMIT 1
     ) cp ON true
     WHERE c.store_id = $1 AND c.marketing_consent
     ORDER BY c.created_at DESC
     LIMIT $2`,
    [storeId, limit],
  );
  return rows.map((r) => ({ ...r, orders: Number(r.orders), spent: Number(r.spent) }));
}

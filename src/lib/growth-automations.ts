// Growth engine, phase 2: the follow-up emails, sent by the cron job
// (src/app/api/cron/jobs) every 30 minutes. Pro stores only ("automations"),
// except the welcome-code email, which a shopper asks for by signing up.
//
// Every email is claimed in growth_messages BEFORE it's sent (unique per
// store + flow + ref), so overlapping runs never send the same one twice.
import { randomInt } from "crypto";
import { query, queryOne } from "./db";
import { PHONE_KEY_SQL } from "./customers";
import { clCrawler, clLogo } from "./cloudinary";
import { getStoreFeatures } from "./plan";
import { storeAccent } from "./store-brand";
import { storeCanonicalBase } from "./seo";
import { emailConfigured, sendEmail } from "./notify/providers";
import { ensureGrowthSchema } from "./growth-schema";
import { FLOW_TIMING, parseAutomations, type FlowId } from "./growth-automations-shared";
import { ensureReferrer, parseReferralSettings } from "./growth-referrals";
import {
  growthUnsubUrl, reviewRequestEmail, welcomeCodeEmail, welcomeReminderEmail, winBackEmail, type ProductTeaser, type StoreBrand,
} from "./growth-emails";

export * from "./growth-automations-shared";

type StoreRow = {
  id: string; slug: string; name: string; logo_url: string | null; custom_domain: string | null;
  email: string | null; owner_email: string | null; growth_automations: unknown;
} & Record<string, unknown>;

async function brandOf(store: StoreRow): Promise<StoreBrand> {
  return {
    name: store.name,
    accent: await storeAccent(store as never).catch(() => "#f59e0b"),
    logo: store.logo_url ? clLogo(store.logo_url) : null,
    url: storeCanonicalBase(store as never),
  };
}

const notUnsubscribed = (emailExpr: string) =>
  `NOT EXISTS (SELECT 1 FROM growth_unsubscribes u WHERE u.store_id = $1 AND u.email = lower(${emailExpr}))`;

/** Claim one message; false if it was already sent (or is being sent). */
async function claim(m: { storeId: string; flow: FlowId; ref: string; email: string; contactId?: string | null; orderId?: string | null }): Promise<number | null> {
  const row = await queryOne<{ id: number }>(
    `INSERT INTO growth_messages (store_id, flow, ref, email, contact_id, order_id)
     VALUES ($1, $2, $3, lower($4), $5, $6)
     ON CONFLICT (store_id, flow, ref) DO NOTHING RETURNING id`,
    [m.storeId, m.flow, m.ref, m.email, m.contactId ?? null, m.orderId ?? null],
  );
  return row?.id ?? null;
}

async function deliver(id: number, store: StoreRow, to: string, msg: { subject: string; html: string }, unsubscribeUrl: string, couponCode?: string): Promise<boolean> {
  const r = await sendEmail(to, msg.subject, msg.html, store.email || store.owner_email || undefined, {
    unsubscribeUrl,
    fromName: `${store.name} via Duka`,
  });
  await query(`UPDATE growth_messages SET status = $2, error = $3, coupon_code = COALESCE($4, coupon_code) WHERE id = $1`, [
    id,
    r.ok ? "sent" : "failed",
    r.ok ? null : r.error.slice(0, 300),
    couponCode ?? null,
  ]);
  return r.ok;
}

async function teasers(store: StoreRow, base: string): Promise<ProductTeaser[]> {
  const rows = await query<{ id: string; slug: string | null; name: string; price: string; image_url: string | null }>(
    `SELECT id, slug, name, price, image_url FROM products
     WHERE store_id = $1 AND is_active AND image_url IS NOT NULL AND (stock_quantity > 0 OR COALESCE(is_bookable, false))
     ORDER BY is_featured DESC NULLS LAST, created_at DESC LIMIT 3`,
    [store.id],
  ).catch(() => []);
  return rows.map((p) => ({ name: p.name, price: Number(p.price), image: clCrawler(p.image_url), url: `${base}/products/${p.slug || p.id}` }));
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
async function oneTimeCode(storeId: string, prefix: string, percent: number, days: number, contactId: string, kind: string): Promise<string | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    let code = prefix;
    for (let i = 0; i < 5; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    const row = await queryOne(
      `INSERT INTO coupons (store_id, code, discount_type, discount_value, min_order_amount, max_uses, expires_at, kind, contact_id)
       SELECT $1, $2, 'percentage', $3, 0, 1, NOW() + make_interval(days => $4::int), $5, $6
       WHERE NOT EXISTS (SELECT 1 FROM coupons WHERE store_id = $1 AND code = $2)
       RETURNING id`,
      [storeId, code, percent, days, kind, contactId],
    );
    if (row) return code;
  }
  return null;
}

/* ───────────────────────── The welcome code (asked for) ───────────────────────── */

/** Email someone the welcome code they just signed up for. Every plan; once per contact. */
export async function sendWelcomeCodeEmail(storeId: string, d: { contactId: string; email: string; name?: string | null; code: string; percent: number }): Promise<void> {
  if (!emailConfigured()) return;
  await ensureGrowthSchema();
  const store = await queryOne<StoreRow>("SELECT * FROM stores WHERE id = $1 AND is_active", [storeId]);
  if (!store) return;
  const unsub = await queryOne(`SELECT 1 FROM growth_unsubscribes WHERE store_id = $1 AND email = lower($2)`, [storeId, d.email]);
  if (unsub) return;
  const id = await claim({ storeId, flow: "welcome_code", ref: d.contactId, email: d.email, contactId: d.contactId });
  if (!id) return;
  const brand = await brandOf(store);
  const unsubscribeUrl = growthUnsubUrl(storeId, d.email);
  await deliver(id, store, d.email, welcomeCodeEmail(brand, { name: d.name, code: d.code, percent: d.percent, unsubscribeUrl }), unsubscribeUrl, d.code);
}

/* ───────────────────────── The follow-ups (cron) ───────────────────────── */

export interface GrowthRunResult {
  stores: number;
  sent: number;
  failed: number;
  skipped?: string;
}

export async function sendDueGrowthMessages(opts: { maxPerRun?: number; maxPerStore?: number } = {}): Promise<GrowthRunResult> {
  if (!emailConfigured()) return { stores: 0, sent: 0, failed: 0, skipped: "email not configured" };
  await ensureGrowthSchema();
  const maxPerRun = opts.maxPerRun ?? 300;
  const maxPerStore = opts.maxPerStore ?? 60;
  const t = FLOW_TIMING;

  // Only stores with someone to write to
  const stores = await query<StoreRow>(
    `SELECT s.* FROM stores s
     WHERE s.is_active AND COALESCE(s.customer_notifications_enabled, true)
       AND (
         EXISTS (SELECT 1 FROM store_contacts c WHERE c.store_id = s.id AND c.email IS NOT NULL AND c.marketing_consent AND c.unsubscribed_at IS NULL)
         OR EXISTS (SELECT 1 FROM orders o WHERE o.store_id = s.id AND o.order_status = 'delivered' AND COALESCE(o.customer_email, '') <> ''
                      AND o.updated_at > NOW() - make_interval(days => $1::int))
       )`,
    [t.reviewWithinDays],
  );

  let sent = 0;
  let failed = 0;
  let touched = 0;
  for (const store of stores) {
    if (sent + failed >= maxPerRun) break;
    const features = await getStoreFeatures(store.id).catch(() => new Set());
    if (!features.has("automations")) continue;
    const settings = parseAutomations(store.growth_automations);
    if (!settings.welcomeReminder && !settings.reviewRequest && !settings.winBack) continue;
    touched++;
    const brand = await brandOf(store);
    const budget = () => Math.max(0, Math.min(maxPerStore, maxPerRun - sent - failed));
    let products: ProductTeaser[] | null = null;
    const getProducts = async () => (products ??= await teasers(store, brand.url));
    const tally = (ok: boolean) => (ok ? sent++ : failed++);

    // 1. Welcome code waiting
    if (settings.welcomeReminder && budget() > 0) {
      const rows = await query<{ id: string; name: string | null; email: string; code: string; discount_value: string; expires_at: string | null }>(
        `SELECT c.id, c.name, lower(c.email) AS email, cp.code, cp.discount_value, cp.expires_at
         FROM store_contacts c
         JOIN LATERAL (SELECT code, discount_value, expires_at, uses_count FROM coupons
                       WHERE contact_id = c.id AND kind = 'welcome' ORDER BY created_at DESC LIMIT 1) cp ON true
         WHERE c.store_id = $1 AND c.marketing_consent AND c.unsubscribed_at IS NULL AND c.email IS NOT NULL
           AND c.created_at < NOW() - make_interval(hours => $2::int) AND c.created_at > NOW() - INTERVAL '7 days'
           AND cp.uses_count = 0 AND (cp.expires_at IS NULL OR cp.expires_at > NOW() + INTERVAL '1 day')
           AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.store_id = c.store_id AND o.order_status <> 'cancelled' AND ${PHONE_KEY_SQL} = c.phone_key)
           AND ${notUnsubscribed("c.email")}
           AND NOT EXISTS (SELECT 1 FROM growth_messages m WHERE m.store_id = c.store_id AND m.flow = 'welcome_reminder' AND m.ref = c.id::text)
         ORDER BY c.created_at LIMIT $3`,
        [store.id, t.welcomeReminderAfterHours, budget()],
      );
      for (const r of rows) {
        const id = await claim({ storeId: store.id, flow: "welcome_reminder", ref: r.id, email: r.email, contactId: r.id });
        if (!id) continue;
        const daysLeft = r.expires_at ? Math.max(0, Math.floor((new Date(r.expires_at).getTime() - Date.now()) / 86_400_000)) : 0;
        const unsubscribeUrl = growthUnsubUrl(store.id, r.email);
        const msg = welcomeReminderEmail(brand, { name: r.name, code: r.code, percent: Number(r.discount_value), daysLeft, products: await getProducts(), unsubscribeUrl });
        tally(await deliver(id, store, r.email, msg, unsubscribeUrl, r.code));
      }
    }

    // 2. Thank you + review, a few days after delivery
    if (settings.reviewRequest && budget() > 0) {
      const referralSettings = parseReferralSettings(store.referral_settings);
      const referralsOn = referralSettings.enabled && features.has("shopper_referrals");
      const rows = await query<{ id: string; order_number: string; customer_name: string | null; customer_phone: string; email: string }>(
        `SELECT o.id, o.order_number, o.customer_name, o.customer_phone, lower(o.customer_email) AS email
         FROM orders o
         WHERE o.store_id = $1 AND o.order_status = 'delivered'
           AND COALESCE(o.customer_email, '') <> '' AND o.customer_email NOT ILIKE '%@noemail.com'
           AND o.updated_at < NOW() - make_interval(days => $2::int) AND o.updated_at > NOW() - make_interval(days => $3::int)
           AND ${notUnsubscribed("o.customer_email")}
           AND NOT EXISTS (SELECT 1 FROM growth_messages m WHERE m.store_id = o.store_id AND m.flow = 'review_request' AND m.ref = o.id::text)
           -- one review email per person per fortnight, however many orders
           AND NOT EXISTS (SELECT 1 FROM growth_messages m WHERE m.store_id = o.store_id AND m.flow = 'review_request'
                             AND m.email = lower(o.customer_email) AND m.created_at > NOW() - INTERVAL '14 days')
         ORDER BY o.updated_at LIMIT $4`,
        [store.id, t.reviewAfterDays, t.reviewWithinDays, budget()],
      );
      const seen = new Set<string>();
      for (const r of rows) {
        if (seen.has(r.email)) continue;
        seen.add(r.email);
        const items = await query<{ product_name: string; product_image: string | null; product_id: string | null; slug: string | null }>(
          `SELECT oi.product_name, oi.product_image, oi.product_id, p.slug
           FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id AND p.is_active
           WHERE oi.order_id = $1 ORDER BY oi.id LIMIT 4`,
          [r.id],
        );
        const id = await claim({ storeId: store.id, flow: "review_request", ref: r.id, email: r.email, orderId: r.id });
        if (!id) continue;
        const unsubscribeUrl = growthUnsubUrl(store.id, r.email);
        // The store runs referrals: include the buyer's own share link
        const ref = referralsOn ? await ensureReferrer(store, { phone: r.customer_phone, name: r.customer_name, email: r.email }, referralSettings).catch(() => null) : null;
        const msg = reviewRequestEmail(brand, {
          referral: ref ? { link: ref.link, code: ref.code, percent: referralSettings.friendPercent, reward: referralSettings.reward } : null,
          name: r.customer_name,
          orderNumber: r.order_number,
          items: items.map((i) => ({
            name: i.product_name,
            price: 0,
            image: i.product_image ? clCrawler(i.product_image) : null,
            url: i.product_id ? `${brand.url}/products/${i.slug || i.product_id}` : brand.url,
          })),
          unsubscribeUrl,
        });
        tally(await deliver(id, store, r.email, msg, unsubscribeUrl));
      }
    }

    // 3. We miss you, with a one-time comeback code
    if (settings.winBack && budget() > 0) {
      const rows = await query<{ id: string; name: string | null; email: string; last_at: string }>(
        `WITH last AS (
           SELECT ${PHONE_KEY_SQL} AS pk, MAX(o.created_at) AS last_at
           FROM orders o WHERE o.store_id = $1 AND o.order_status <> 'cancelled' GROUP BY 1
         )
         SELECT c.id, c.name, lower(c.email) AS email, to_char(last.last_at, 'YYYY-MM-DD') AS last_at
         FROM store_contacts c JOIN last ON last.pk = c.phone_key
         WHERE c.store_id = $1 AND c.marketing_consent AND c.unsubscribed_at IS NULL AND c.email IS NOT NULL
           AND last.last_at < NOW() - make_interval(days => $2::int) AND last.last_at > NOW() - make_interval(days => $3::int)
           AND ${notUnsubscribed("c.email")}
           AND NOT EXISTS (SELECT 1 FROM growth_messages m WHERE m.store_id = c.store_id AND m.flow = 'win_back'
                             AND m.ref = c.id::text || ':' || to_char(last.last_at, 'YYYY-MM-DD'))
         ORDER BY last.last_at LIMIT $4`,
        [store.id, t.winBackAfterDays, t.winBackWithinDays, budget()],
      );
      for (const r of rows) {
        const id = await claim({ storeId: store.id, flow: "win_back", ref: `${r.id}:${r.last_at}`, email: r.email, contactId: r.id });
        if (!id) continue;
        const code = await oneTimeCode(store.id, "BACK", settings.winBackPercent, t.winBackCodeDays, r.id, "winback");
        if (!code) {
          await query(`UPDATE growth_messages SET status = 'failed', error = 'could not create code' WHERE id = $1`, [id]);
          failed++;
          continue;
        }
        const unsubscribeUrl = growthUnsubUrl(store.id, r.email);
        const msg = winBackEmail(brand, { name: r.name, code, percent: settings.winBackPercent, days: t.winBackCodeDays, products: await getProducts(), unsubscribeUrl });
        tally(await deliver(id, store, r.email, msg, unsubscribeUrl, code));
      }
    }
  }
  return { stores: touched, sent, failed };
}

/* ───────────────────────── Results (Growth page) ───────────────────────── */

export interface AutomationResult {
  flow: FlowId;
  sent: number;
  ordered: number; // orders that used the code in the email
  revenue: number;
}

export async function automationResults(storeId: string, days: number): Promise<AutomationResult[]> {
  await ensureGrowthSchema();
  const rows = await query<{ flow: FlowId; sent: number; ordered: number; revenue: string }>(
    `SELECT m.flow,
            COUNT(*) FILTER (WHERE m.status = 'sent')::int AS sent,
            COUNT(o.id)::int AS ordered,
            COALESCE(SUM(o.total), 0) AS revenue
     FROM growth_messages m
     LEFT JOIN orders o ON o.store_id = m.store_id AND m.coupon_code IS NOT NULL AND o.coupon_code = m.coupon_code
                       AND o.order_status <> 'cancelled' AND o.created_at >= m.created_at
     WHERE m.store_id = $1 AND m.created_at > NOW() - make_interval(days => $2::int)
     GROUP BY m.flow`,
    [storeId, days],
  );
  return rows.map((r) => ({ flow: r.flow, sent: Number(r.sent), ordered: Number(r.ordered), revenue: Number(r.revenue) }));
}

/** One click from an email: stop all follow-ups from this store to this address. */
export async function unsubscribeEmail(storeId: string, email: string): Promise<void> {
  await ensureGrowthSchema();
  const e = email.trim().toLowerCase();
  await query(`INSERT INTO growth_unsubscribes (store_id, email) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [storeId, e]);
  await query(`UPDATE store_contacts SET unsubscribed_at = COALESCE(unsubscribed_at, NOW()), updated_at = NOW() WHERE store_id = $1 AND lower(email) = $2`, [storeId, e]);
}

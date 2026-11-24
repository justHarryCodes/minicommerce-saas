// Broadcasts (growth engine, phase 3): a vendor emails their list in one go,
// e.g. "New arrivals are in". The first batch goes out straight away; the
// cron job sends the rest. Every recipient is claimed with SKIP LOCKED before
// sending, so overlapping runs never email anyone twice.
import { query, queryOne } from "./db";
import { PHONE_KEY_SQL } from "./customers";
import { clCrawler, clLogo } from "./cloudinary";
import { storeAccent } from "./store-brand";
import { storeCanonicalBase } from "./seo";
import { emailConfigured, sendEmail } from "./notify/providers";
import { ensureGrowthSchema } from "./growth-schema";
import { broadcastEmail, growthUnsubUrl, type ProductTeaser, type StoreBrand } from "./growth-emails";

export type Audience = "all" | "buyers" | "not_bought";

export const BROADCAST_LIMITS = {
  /** Hours between two broadcasts from one store (people unsubscribe when spammed) */
  gapHours: 20,
  /** Emails a store can broadcast in a calendar month */
  monthlyEmails: 5000,
  /** Sent straight away when a broadcast starts; the cron job does the rest */
  firstBatch: 100,
} as const;

/** People on the list who can get an email: agreed, gave an email, haven't unsubscribed. */
function audienceSql(audience: Audience): string {
  const bought = `EXISTS (SELECT 1 FROM orders o WHERE o.store_id = c.store_id AND o.order_status <> 'cancelled' AND ${PHONE_KEY_SQL} = c.phone_key)`;
  return `c.store_id = $1 AND c.marketing_consent AND c.unsubscribed_at IS NULL AND COALESCE(c.email, '') <> ''
    AND NOT EXISTS (SELECT 1 FROM growth_unsubscribes u WHERE u.store_id = c.store_id AND u.email = lower(c.email))
    ${audience === "buyers" ? `AND ${bought}` : audience === "not_bought" ? `AND NOT ${bought}` : ""}`;
}

export async function audienceCounts(storeId: string): Promise<Record<Audience, number>> {
  await ensureGrowthSchema();
  const [all, buyers] = await Promise.all(
    (["all", "buyers"] as const).map((a) =>
      queryOne<{ n: number }>(`SELECT COUNT(DISTINCT lower(c.email))::int AS n FROM store_contacts c WHERE ${audienceSql(a)}`, [storeId]).then((r) => r?.n ?? 0),
    ),
  );
  return { all, buyers, not_bought: Math.max(0, all - buyers) };
}

export interface BroadcastInput {
  subject: string;
  body: string;
  productIds: string[];
  couponId?: string | null;
  audience: Audience;
}

export type CreateResult = { ok: true; id: string; recipients: number } | { ok: false; error: string };

export async function createBroadcast(storeId: string, d: BroadcastInput): Promise<CreateResult> {
  await ensureGrowthSchema();
  const last = await queryOne<{ created_at: string }>("SELECT created_at FROM broadcasts WHERE store_id = $1 AND status <> 'cancelled' ORDER BY created_at DESC LIMIT 1", [storeId]);
  if (last && Date.now() - new Date(last.created_at).getTime() < BROADCAST_LIMITS.gapHours * 3600_000) {
    return { ok: false, error: "You sent a broadcast recently. To keep people on your list happy, send at most one a day." };
  }
  const month = await queryOne<{ n: number }>(
    `SELECT COALESCE(SUM(recipients), 0)::int AS n FROM broadcasts WHERE store_id = $1 AND status <> 'cancelled' AND created_at >= date_trunc('month', NOW())`,
    [storeId],
  );
  const left = BROADCAST_LIMITS.monthlyEmails - (month?.n ?? 0);

  let couponCode: string | null = null;
  if (d.couponId) {
    const c = await queryOne<{ code: string }>(
      `SELECT code FROM coupons WHERE id = $1 AND store_id = $2 AND kind = 'standard' AND is_active AND (expires_at IS NULL OR expires_at > NOW())`,
      [d.couponId, storeId],
    );
    if (!c) return { ok: false, error: "That discount code isn't active. Pick another or send without one." };
    couponCode = c.code;
  }
  const products = d.productIds.length
    ? (await query<{ id: string }>("SELECT id FROM products WHERE store_id = $1 AND id = ANY($2::uuid[]) AND is_active", [storeId, d.productIds])).map((p) => p.id)
    : [];

  const b = await queryOne<{ id: string }>(
    `INSERT INTO broadcasts (store_id, subject, body, product_ids, coupon_code, audience) VALUES ($1, $2, $3, $4::uuid[], $5, $6) RETURNING id`,
    [storeId, d.subject.trim(), d.body.trim(), products, couponCode, d.audience],
  );
  const inserted = await query<{ email: string }>(
    `INSERT INTO broadcast_recipients (broadcast_id, email, name, contact_id)
     SELECT DISTINCT ON (lower(c.email)) $2::uuid, lower(c.email), c.name, c.id
     FROM store_contacts c WHERE ${audienceSql(d.audience)}
     ORDER BY lower(c.email), c.created_at DESC
     LIMIT $3
     ON CONFLICT DO NOTHING RETURNING email`,
    [storeId, b!.id, Math.max(0, left)],
  );
  if (!inserted.length) {
    await query("UPDATE broadcasts SET status = 'cancelled', finished_at = NOW() WHERE id = $1", [b!.id]);
    return { ok: false, error: left <= 0 ? "You've used this month's broadcast emails. They reset on the 1st." : "No one in that group can get emails yet." };
  }
  await query("UPDATE broadcasts SET recipients = $2 WHERE id = $1", [b!.id, inserted.length]);
  return { ok: true, id: b!.id, recipients: inserted.length };
}

type StoreRow = { id: string; slug: string; name: string; logo_url: string | null; custom_domain: string | null; email: string | null; owner_email: string | null } & Record<string, unknown>;

/** Send up to `budget` pending emails, from one broadcast or any that are sending. */
export async function sendBroadcastBatch(budget: number, broadcastId?: string): Promise<{ sent: number; failed: number }> {
  if (!emailConfigured() || budget <= 0) return { sent: 0, failed: 0 };
  await ensureGrowthSchema();
  // A run that died mid-send leaves rows "sending": after 2 hours, close them
  // as failed rather than risk emailing someone twice
  await query(
    `UPDATE broadcast_recipients r SET status = 'failed', error = 'interrupted'
     FROM broadcasts b WHERE b.id = r.broadcast_id AND r.status = 'sending' AND b.status = 'sending' AND b.created_at < NOW() - INTERVAL '2 hours'`,
  );
  const live = await query<{ id: string; store_id: string; subject: string; body: string; product_ids: string[]; coupon_code: string | null }>(
    `SELECT id, store_id, subject, body, product_ids, coupon_code FROM broadcasts WHERE status = 'sending' ${broadcastId ? "AND id = $1" : ""} ORDER BY created_at LIMIT 20`,
    broadcastId ? [broadcastId] : [],
  );
  let sent = 0;
  let failed = 0;
  for (const b of live) {
    if (sent + failed >= budget) break;
    const store = await queryOne<StoreRow>("SELECT * FROM stores WHERE id = $1 AND is_active", [b.store_id]);
    if (!store) {
      await query("UPDATE broadcasts SET status = 'cancelled', finished_at = NOW() WHERE id = $1", [b.id]);
      continue;
    }
    const brand: StoreBrand = { name: store.name, accent: await storeAccent(store as never).catch(() => "#f59e0b"), logo: store.logo_url ? clLogo(store.logo_url) : null, url: storeCanonicalBase(store as never) };
    const products: ProductTeaser[] = b.product_ids?.length
      ? (
          await query<{ id: string; slug: string | null; name: string; price: string; image_url: string | null }>(
            "SELECT id, slug, name, price, image_url FROM products WHERE store_id = $1 AND id = ANY($2::uuid[]) AND is_active",
            [store.id, b.product_ids],
          )
        ).map((p) => ({ name: p.name, price: Number(p.price), image: p.image_url ? clCrawler(p.image_url) : null, url: `${brand.url}/products/${p.slug || p.id}` }))
      : [];
    const coupon = b.coupon_code
      ? await queryOne<{ discount_type: string; discount_value: string; expires_at: string | null }>("SELECT discount_type, discount_value, expires_at FROM coupons WHERE store_id = $1 AND code = $2", [store.id, b.coupon_code])
      : null;
    const couponNote = coupon
      ? `${coupon.discount_type === "percentage" ? `${Number(coupon.discount_value)}% off` : `₦${Number(coupon.discount_value).toLocaleString("en-NG")} off`}. Enter it at checkout${coupon.expires_at ? `, before ${new Date(coupon.expires_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}` : ""}.`
      : "";

    const batch = await query<{ email: string; name: string | null }>(
      `UPDATE broadcast_recipients SET status = 'sending'
       WHERE (broadcast_id, email) IN (
         SELECT broadcast_id, email FROM broadcast_recipients WHERE broadcast_id = $1 AND status = 'pending'
         LIMIT $2 FOR UPDATE SKIP LOCKED)
       RETURNING email, name`,
      [b.id, budget - sent - failed],
    );
    for (const r of batch) {
      const unsub = await queryOne("SELECT 1 FROM growth_unsubscribes WHERE store_id = $1 AND email = $2", [store.id, r.email]);
      if (unsub) {
        await query("UPDATE broadcast_recipients SET status = 'skipped' WHERE broadcast_id = $1 AND email = $2", [b.id, r.email]);
        continue;
      }
      const unsubscribeUrl = growthUnsubUrl(store.id, r.email);
      const msg = broadcastEmail(brand, { name: r.name, subject: b.subject, body: b.body, products, coupon: b.coupon_code ? { code: b.coupon_code, note: couponNote } : null, unsubscribeUrl });
      const res = await sendEmail(r.email, msg.subject, msg.html, store.email || store.owner_email || undefined, { unsubscribeUrl, fromName: `${store.name} via Duka` });
      await query("UPDATE broadcast_recipients SET status = $3, error = $4, sent_at = NOW() WHERE broadcast_id = $1 AND email = $2", [
        b.id,
        r.email,
        res.ok ? "sent" : "failed",
        res.ok ? null : res.error.slice(0, 300),
      ]);
      if (res.ok) sent++;
      else failed++;
    }
    // Totals, and done once nothing is left to send
    await query(
      `UPDATE broadcasts SET
         sent = (SELECT COUNT(*) FROM broadcast_recipients WHERE broadcast_id = $1 AND status = 'sent'),
         failed = (SELECT COUNT(*) FROM broadcast_recipients WHERE broadcast_id = $1 AND status = 'failed'),
         status = CASE WHEN EXISTS (SELECT 1 FROM broadcast_recipients WHERE broadcast_id = $1 AND status IN ('pending', 'sending')) THEN status ELSE 'sent' END,
         finished_at = CASE WHEN EXISTS (SELECT 1 FROM broadcast_recipients WHERE broadcast_id = $1 AND status IN ('pending', 'sending')) THEN NULL ELSE NOW() END
       WHERE id = $1`,
      [b.id],
    );
  }
  return { sent, failed };
}

export interface BroadcastRow {
  id: string;
  subject: string;
  audience: Audience;
  status: "sending" | "sent" | "cancelled";
  recipients: number;
  sent: number;
  coupon_code: string | null;
  created_at: string;
  orders: number;
  revenue: number;
}

/** Recent broadcasts, with orders placed by recipients in the 7 days after. */
export async function listBroadcasts(storeId: string, limit = 8): Promise<BroadcastRow[]> {
  await ensureGrowthSchema();
  const rows = await query<BroadcastRow & { orders: string; revenue: string }>(
    `SELECT b.id, b.subject, b.audience, b.status, b.recipients, b.sent, b.coupon_code, b.created_at,
            COALESCE(x.orders, 0) AS orders, COALESCE(x.revenue, 0) AS revenue
     FROM broadcasts b
     LEFT JOIN LATERAL (
       SELECT COUNT(*) AS orders, SUM(o.total) AS revenue FROM orders o
       WHERE o.store_id = b.store_id AND o.order_status <> 'cancelled'
         AND o.created_at >= b.created_at AND o.created_at < b.created_at + INTERVAL '7 days'
         AND lower(o.customer_email) IN (SELECT email FROM broadcast_recipients r WHERE r.broadcast_id = b.id AND r.status = 'sent')
     ) x ON true
     WHERE b.store_id = $1 AND b.status <> 'cancelled'
     ORDER BY b.created_at DESC LIMIT $2`,
    [storeId, limit],
  );
  return rows.map((r) => ({ ...r, orders: Number(r.orders), revenue: Number(r.revenue) }));
}

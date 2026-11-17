// Admin campaigns to vendors: pick an audience (category, plan, activity,
// location, or hand-picked stores), write once, send by email, push and/or
// an announcement inside the vendor dashboard.
//
// Email respects the marketing opt-out ("upgrade:<storeId>" in
// setup_reminders, the same "unsubscribe from offers" link) and Resend's
// bounce/complaint suppression. Each store gets each channel once per
// campaign (admin_campaign_recipients).

import { query, queryOne } from "@/lib/db";
import { getAppUrl } from "@/lib/paystack";
import { emailConfigured, sendEmail } from "@/lib/notify/providers";
import { emailHeader } from "@/lib/notify/email-brand";
import { ensureTable as ensureRemindersTable, esc, unsubscribeUrl } from "@/lib/notify/setup-reminders";

import { ACTIVITIES, CHANNELS, type Activity, type Audience, type Channel } from "./campaigns-shared";
export { ACTIVITIES, CHANNELS, type Activity, type Audience, type Channel };

export interface CampaignContent {
  name: string;
  subject: string;
  headline: string;
  body: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  channels: Channel[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let ready = false;
export async function ensureCampaignTables() {
  if (ready) return;
  await query(`
    CREATE TABLE IF NOT EXISTS admin_campaigns (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      channels    TEXT[] NOT NULL,
      audience    JSONB NOT NULL DEFAULT '{}'::jsonb,
      subject     TEXT NOT NULL,
      headline    TEXT NOT NULL,
      body        TEXT NOT NULL,
      cta_label   TEXT,
      cta_url     TEXT,
      status      TEXT NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'failed')),
      audience_size INT NOT NULL DEFAULT 0,
      sent        INT NOT NULL DEFAULT 0,
      failed      INT NOT NULL DEFAULT 0,
      created_by  TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ
    )`);
  await query(`
    CREATE TABLE IF NOT EXISTS admin_campaign_recipients (
      campaign_id  UUID NOT NULL REFERENCES admin_campaigns(id) ON DELETE CASCADE,
      store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      channel      TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      error        TEXT,
      sent_at      TIMESTAMPTZ,
      dismissed_at TIMESTAMPTZ,
      PRIMARY KEY (campaign_id, store_id, channel)
    )`);
  await query(`CREATE INDEX IF NOT EXISTS admin_campaign_recipients_inapp ON admin_campaign_recipients (store_id) WHERE channel = 'inapp' AND dismissed_at IS NULL`);
  ready = true;
}

/* ───────────────────────────── Audience ───────────────────────────── */

/** The WHERE clause (on stores s) for an audience. Every value is a bound parameter. */
export function audienceWhere(a: Audience): { sql: string; params: unknown[] } {
  const params: unknown[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  const where = ["s.is_active = true", "s.deleted_at IS NULL"];

  const ids = (a.storeIds ?? []).filter((id) => UUID.test(id));
  if (a.storeIds?.length) where.push(`s.id = ANY(${p(ids)}::uuid[])`);

  if (a.categories?.length) where.push(`s.primary_category = ANY(${p(a.categories)}::text[])`);

  if (a.plans?.length) {
    const paidNow = `(s.current_plan_id IS NOT NULL AND s.plan_expires_at > NOW() AND COALESCE((SELECT price_monthly FROM plans WHERE id = s.current_plan_id), 0) > 0)`;
    const ors: string[] = [];
    if (a.plans.includes("free")) ors.push(`(NOT ${paidNow} AND (s.current_plan_id IS NULL OR COALESCE((SELECT price_monthly FROM plans WHERE id = s.current_plan_id), 0) = 0))`);
    if (a.plans.includes("lapsed")) ors.push(`(NOT ${paidNow} AND COALESCE((SELECT price_monthly FROM plans WHERE id = s.current_plan_id), 0) > 0)`);
    if (a.plans.includes("paid")) ors.push(paidNow);
    const planIds = a.plans.filter((x) => UUID.test(x));
    if (planIds.length) ors.push(`(s.current_plan_id = ANY(${p(planIds)}::uuid[]) AND s.plan_expires_at > NOW())`);
    if (ors.length) where.push(`(${ors.join(" OR ")})`);
  }

  const orders30 = `(SELECT COUNT(*) FROM orders o WHERE o.store_id = s.id AND o.payment_status = 'paid' AND o.created_at > NOW() - INTERVAL '30 days')`;
  const acts: string[] = [];
  for (const act of a.activity ?? []) {
    if (act === "new_7d") acts.push(`s.created_at > NOW() - INTERVAL '7 days'`);
    if (act === "no_products") acts.push(`NOT EXISTS (SELECT 1 FROM products p WHERE p.store_id = s.id AND p.is_active = true)`);
    if (act === "no_payout") acts.push(`NOT (s.duka_pay_status = 'active' OR COALESCE(s.bank_account_number, '') <> '')`);
    if (act === "near_limit")
      acts.push(`(SELECT COUNT(*) FROM products p WHERE p.store_id = s.id) >= 0.8 * COALESCE(
        (SELECT max_products FROM plans WHERE id = s.current_plan_id AND s.plan_expires_at > NOW()),
        (SELECT max_products FROM plans WHERE price_monthly = 0 AND is_active = true ORDER BY sort_order LIMIT 1), 0) AND COALESCE(
        (SELECT max_products FROM plans WHERE id = s.current_plan_id AND s.plan_expires_at > NOW()),
        (SELECT max_products FROM plans WHERE price_monthly = 0 AND is_active = true ORDER BY sort_order LIMIT 1), 0) > 0`);
    if (act === "no_orders_30d") acts.push(`${orders30} = 0`);
    if (act === "selling_30d") acts.push(`${orders30} > 0`);
    if (act === "top_sellers")
      acts.push(`s.id IN (
        SELECT store_id FROM (
          SELECT store_id, PERCENT_RANK() OVER (ORDER BY SUM(COALESCE(total_amount, total))) AS pr
            FROM orders WHERE payment_status = 'paid' AND created_at > NOW() - INTERVAL '30 days' GROUP BY store_id
        ) r WHERE r.pr >= 0.8)`);
  }
  // Activity filters: a store matching any of them
  if (acts.length) where.push(`(${acts.join(" OR ")})`);

  if (a.states?.length) {
    where.push(`(
      SELECT o.delivery_state FROM orders o
       WHERE o.store_id = s.id AND COALESCE(o.delivery_state, '') <> '' AND o.created_at > NOW() - INTERVAL '180 days'
       GROUP BY o.delivery_state ORDER BY COUNT(*) DESC LIMIT 1
    ) ILIKE ANY(${p(a.states)}::text[])`);
  }
  return { sql: where.join("\n   AND "), params };
}

export async function audienceCount(a: Audience): Promise<number> {
  const { sql, params } = audienceWhere(a);
  const r = await queryOne<{ n: number }>(`SELECT COUNT(*)::int AS n FROM stores s WHERE ${sql}`, params);
  return Number(r?.n ?? 0);
}

export async function audienceSample(a: Audience, limit = 8) {
  const { sql, params } = audienceWhere(a);
  return query<{ id: string; name: string; primary_category: string | null }>(
    `SELECT s.id, s.name, s.primary_category FROM stores s WHERE ${sql} ORDER BY s.created_at DESC LIMIT ${Math.min(50, limit)}`,
    params,
  );
}

/** Choices for the builder: categories and states that actually exist, and plans. */
export async function audienceOptions() {
  const [categories, plans, states] = await Promise.all([
    query<{ name: string; n: number }>(
      `SELECT primary_category AS name, COUNT(*)::int AS n FROM stores WHERE is_active = true AND deleted_at IS NULL AND primary_category IS NOT NULL GROUP BY 1 ORDER BY 2 DESC`,
    ),
    query<{ id: string; name: string; price_monthly: string }>(`SELECT id, name, price_monthly FROM plans WHERE is_active = true ORDER BY sort_order, price_monthly`),
    query<{ name: string; n: number }>(
      `SELECT INITCAP(TRIM(delivery_state)) AS name, COUNT(DISTINCT store_id)::int AS n FROM orders
        WHERE COALESCE(TRIM(delivery_state), '') <> '' AND created_at > NOW() - INTERVAL '180 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 40`,
    ).catch(() => []),
  ]);
  return { categories, plans: plans.map((p) => ({ ...p, price_monthly: Number(p.price_monthly) })), states };
}

/* ───────────────────────────── Content ───────────────────────────── */

/** Body text -> email HTML (paragraphs, line breaks, **bold**, links). Everything escaped first. */
export function bodyHtml(body: string): string {
  return body
    .trim()
    .split(/\n{2,}/)
    .map((para) => {
      const html = esc(para)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#b45309">$1</a>')
        .replace(/\n/g, "<br>");
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3f3f46">${html}</p>`;
    })
    .join("");
}

/** {store} and {name} placeholders. */
export function personalise(text: string, d: { store: string; name?: string | null }): string {
  const first = (d.name ?? "").trim().split(/\s+/)[0] || "there";
  return text.replace(/\{store\}/gi, d.store).replace(/\{name\}/gi, first);
}

export function campaignEmail(c: Pick<CampaignContent, "subject" | "headline" | "body" | "ctaLabel" | "ctaUrl">, d: { store: string; name?: string | null; unsubscribe: string }) {
  const headline = personalise(c.headline, d);
  const body = personalise(c.body, d);
  const cta = c.ctaLabel && c.ctaUrl ? `<p style="margin:22px 0 0"><a href="${esc(c.ctaUrl)}" style="display:inline-block;background:#f59e0b;color:#000;font-weight:700;font-size:15px;text-decoration:none;padding:13px 22px;border-radius:10px">${esc(c.ctaLabel)}</a></p>` : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:28px"><tr><td>
${emailHeader()}
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3">${esc(headline)}</h1>
${bodyHtml(body)}${cta}
<p style="margin:24px 0 0;font-size:12px;color:#a1a1aa">Questions? Just reply to this email.</p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:11px;color:#a1a1aa">You're receiving this because you have a store on Duka. <a href="${d.unsubscribe}" style="color:#a1a1aa">Unsubscribe from offers</a></p>
</td></tr></table></body></html>`;
  return { subject: personalise(c.subject, d), html };
}

/* ───────────────────────────── Sending ───────────────────────────── */

export async function createCampaign(c: CampaignContent, audience: Audience, by: string): Promise<{ id: string; size: number }> {
  await ensureCampaignTables();
  const size = await audienceCount(audience);
  const row = await queryOne<{ id: string }>(
    `INSERT INTO admin_campaigns (name, channels, audience, subject, headline, body, cta_label, cta_url, audience_size, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [c.name, c.channels, JSON.stringify(audience), c.subject, c.headline, c.body, c.ctaLabel || null, c.ctaUrl || null, size, by],
  );
  return { id: row!.id, size };
}

/** Send a campaign to its whole audience. Safe to call twice: each store/channel is claimed once. */
export async function runCampaign(id: string): Promise<{ sent: number; failed: number }> {
  await ensureCampaignTables();
  await ensureRemindersTable();
  const c = await queryOne<{ channels: Channel[]; audience: Audience; subject: string; headline: string; body: string; cta_label: string | null; cta_url: string | null }>(
    `SELECT channels, audience, subject, headline, body, cta_label, cta_url FROM admin_campaigns WHERE id = $1`,
    [id],
  );
  if (!c) return { sent: 0, failed: 0 };
  const { sql, params } = audienceWhere(c.audience ?? {});
  const stores = await query<{ id: string; name: string; owner_id: string; owner_email: string | null; offers_off: boolean }>(
    `SELECT s.id, s.name, s.owner_id, s.owner_email,
            COALESCE((SELECT opted_out FROM setup_reminders r WHERE r.subject = 'upgrade:' || s.id::text), false) AS offers_off
       FROM stores s WHERE ${sql} ORDER BY s.created_at`,
    params,
  );
  const { notifyStoreEvent } = await import("@/lib/push");
  let sent = 0;
  let failed = 0;
  const content = { subject: c.subject, headline: c.headline, body: c.body, ctaLabel: c.cta_label, ctaUrl: c.cta_url };

  for (const s of stores) {
    for (const ch of c.channels) {
      // Claim: one send per store + channel, even if run twice
      const claimed = await query(
        `INSERT INTO admin_campaign_recipients (campaign_id, store_id, channel) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING store_id`,
        [id, s.id, ch],
      );
      if (!claimed.length) continue;
      let ok = false;
      let error: string | null = null;
      try {
        if (ch === "email") {
          if (s.offers_off) error = "Unsubscribed from offers";
          else if (!emailConfigured()) error = "Email not configured";
          else {
            let email = s.owner_email;
            let name: string | null = null;
            try {
              const { adminAuth } = await import("@/lib/firebase-admin");
              const u = await adminAuth.getUser(s.owner_id);
              email = email || u.email || null;
              name = u.displayName ?? null;
            } catch {
              /* store email only */
            }
            if (!email) error = "No email";
            else {
              const unsub = unsubscribeUrl(`upgrade:${s.id}`);
              const m = campaignEmail(content, { store: s.name, name, unsubscribe: unsub });
              const r = await sendEmail(email, m.subject, m.html, undefined, { unsubscribeUrl: unsub });
              ok = r.ok;
              if (!r.ok) error = r.error ?? "Send failed";
            }
          }
        } else if (ch === "push") {
          await notifyStoreEvent(s.id, {
            type: "announcement",
            title: personalise(c.headline, { store: s.name }).slice(0, 80),
            body: personalise(c.body, { store: s.name }).replace(/\*\*/g, "").replace(/\s+/g, " ").slice(0, 160),
            data: { campaignId: id },
            url: c.cta_url && c.cta_url.startsWith("/") ? c.cta_url : "/dashboard",
          });
          ok = true;
        } else {
          ok = true; // in-app: the row itself is the announcement
        }
      } catch (e) {
        error = e instanceof Error ? e.message : "Failed";
      }
      await query(`UPDATE admin_campaign_recipients SET status = $4, error = $5, sent_at = NOW() WHERE campaign_id = $1 AND store_id = $2 AND channel = $3`, [
        id,
        s.id,
        ch,
        ok ? "sent" : "failed",
        error,
      ]);
      if (ok) sent++;
      else failed++;
    }
    await query(`UPDATE admin_campaigns SET sent = $2, failed = $3 WHERE id = $1`, [id, sent, failed]);
  }
  await query(`UPDATE admin_campaigns SET status = 'sent', sent = $2, failed = $3, finished_at = NOW() WHERE id = $1`, [id, sent, failed]);
  return { sent, failed };
}

export async function listCampaigns() {
  await ensureCampaignTables();
  return query<{ id: string; name: string; channels: Channel[]; status: string; audience_size: number; sent: number; failed: number; created_by: string | null; created_at: string; finished_at: string | null }>(
    `SELECT id, name, channels, status, audience_size, sent, failed, created_by, created_at, finished_at FROM admin_campaigns ORDER BY created_at DESC LIMIT 100`,
  );
}

/* ─────────────────────── In-dashboard announcements ─────────────────────── */

export async function activeAnnouncement(storeId: string) {
  try {
    return await queryOne<{ campaign_id: string; headline: string; body: string; cta_label: string | null; cta_url: string | null; store_name: string }>(
      `SELECT r.campaign_id, c.headline, c.body, c.cta_label, c.cta_url, s.name AS store_name
         FROM admin_campaign_recipients r
         JOIN admin_campaigns c ON c.id = r.campaign_id
         JOIN stores s ON s.id = r.store_id
        WHERE r.store_id = $1 AND r.channel = 'inapp' AND r.status = 'sent' AND r.dismissed_at IS NULL
          AND r.sent_at > NOW() - INTERVAL '30 days'
        ORDER BY r.sent_at DESC LIMIT 1`,
      [storeId],
    );
  } catch {
    return null; // tables not created yet
  }
}

export async function dismissAnnouncement(storeId: string, campaignId: string) {
  await query(`UPDATE admin_campaign_recipients SET dismissed_at = NOW() WHERE store_id = $1 AND campaign_id = $2 AND channel = 'inapp'`, [storeId, campaignId]).catch(() => {});
}

export const appUrlForCta = () => getAppUrl();

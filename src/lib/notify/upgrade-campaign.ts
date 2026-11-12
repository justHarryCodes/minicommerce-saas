// Marketing email: invite Free-plan vendors to upgrade to Pro or Business.
// Prices, limits and features come from the live plans (and the admin's
// yearly discount), so the email never goes out of date. Sent from
// Admin -> Campaigns. Respects unsubscribes (this email's own link and the
// setup-reminder one), bounces / spam complaints, and never reaches the
// same store twice within 30 days.

import { query } from "@/lib/db";
import { getAppUrl } from "@/lib/paystack";
import { FEATURES, featuresForPlan, type Feature } from "@/lib/features-shared";
import { yearlyPrice, yearlySavings } from "@/lib/plan-pricing";
import { emailConfigured, sendEmail } from "./providers";
import { ensureTable, esc, unsubscribeUrl } from "./setup-reminders";

export interface CampaignPlan {
  id: string;
  name: string;
  price_monthly: number | string;
  max_products: number;
  max_reels: number;
  features: string[] | null;
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

/** The selling points, in the order a small seller cares about them. */
const HIGHLIGHTS: { feature: Feature; emoji: string; title: string; text: string }[] = [
  { feature: "custom_domain", emoji: "🌐", title: "Your own web address", text: "Sell on yourbrand.com instead of a Duka link. Customers trust it, and it's easy to remember." },
  { feature: "analytics", emoji: "📊", title: "See what sells", text: "Sales, visitors, top products and where your customers come from, in one place." },
  { feature: "abandoned_carts", emoji: "🛒", title: "Win back lost sales", text: "Shoppers who leave without paying get an automatic reminder to complete their order." },
  { feature: "coupons", emoji: "🏷️", title: "Discount codes", text: "Run promos and give influencers their own codes, and see which ones bring orders." },
  { feature: "ai_tools", emoji: "✨", title: "AI writes for you", text: "Product descriptions and categories done in seconds from a photo." },
  { feature: "customers", emoji: "👥", title: "Know your customers", text: "Every customer, what they bought and who keeps coming back." },
];

export function buildUpgradeEmail(d: {
  storeName: string;
  ownerName?: string | null;
  plans: CampaignPlan[];
  yearlyDiscount: number;
  appUrl: string;
  unsubscribeUrl: string;
}): { subject: string; html: string } {
  const paid = d.plans.filter((p) => Number(p.price_monthly) > 0).sort((a, b) => Number(a.price_monthly) - Number(b.price_monthly));
  const entry = paid[0];
  const hi = (d.ownerName ?? "").trim().split(/\s+/)[0];
  const entryFeatures = new Set(entry ? featuresForPlan({ isPro: true, features: entry.features }) : []);
  const shown = HIGHLIGHTS.filter((h) => entryFeatures.has(h.feature)).slice(0, 6);
  const billing = `${d.appUrl}/dashboard/billing`;

  const highlights = shown
    .map(
      (h) => `<tr><td style="padding:10px 0;vertical-align:top;width:34px;font-size:20px">${h.emoji}</td>
<td style="padding:10px 0"><p style="margin:0;font-size:15px;font-weight:700">${esc(h.title)}</p>
<p style="margin:3px 0 0;font-size:14px;color:#52525b;line-height:1.5">${esc(h.text)}</p></td></tr>`,
    )
    .join("");

  const planCards = paid
    .map((p, i) => {
      const monthly = Number(p.price_monthly);
      const features = featuresForPlan({ isPro: true, features: p.features });
      const extra = i > 0 ? features.filter((f) => !entryFeatures.has(f)).map((f) => FEATURES[f].label) : [];
      const lines = [
        `Up to ${Number(p.max_products).toLocaleString("en-NG")} products`,
        p.max_reels > 0 ? `${p.max_reels} video reels a month` : null,
        ...(i === 0 ? [`${features.length} pro features`] : extra.length ? [`Everything in ${entry!.name}, plus ${extra.slice(0, 3).join(", ")}`] : [`Everything in ${entry!.name}, with higher limits`]),
      ].filter(Boolean) as string[];
      return `<td width="${Math.floor(100 / paid.length)}%" style="padding:6px;vertical-align:top">
<div style="border:1px solid ${i === 0 ? "#f59e0b" : "#e4e4e7"};border-radius:12px;padding:16px;background:${i === 0 ? "#fffbeb" : "#ffffff"}">
<p style="margin:0;font-size:16px;font-weight:900">${esc(p.name)}</p>
<p style="margin:6px 0 0;font-size:22px;font-weight:900">${naira(monthly)}<span style="font-size:13px;font-weight:600;color:#71717a">/month</span></p>
${d.yearlyDiscount > 0 ? `<p style="margin:4px 0 0;font-size:12px;color:#15803d;font-weight:700">or ${naira(yearlyPrice(monthly, d.yearlyDiscount))}/year: save ${naira(yearlySavings(monthly, d.yearlyDiscount))}</p>` : ""}
<p style="margin:10px 0 0;font-size:13px;color:#3f3f46;line-height:1.7">${lines.map((l) => `✓ ${esc(l)}`).join("<br>")}</p>
</div></td>`;
    })
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:28px"><tr><td>
<p style="margin:0 0 20px;font-size:20px;font-weight:900;color:#f59e0b">Duka</p>
<h1 style="margin:0 0 10px;font-size:24px;line-height:1.25">Hi${hi ? ` ${esc(hi)}` : ""}, ready to grow ${esc(d.storeName)}?</h1>
<p style="margin:0 0 18px;font-size:15px;color:#3f3f46;line-height:1.6">You're on the Free plan. ${entry ? `${esc(entry.name)}` : "A paid plan"} gives you the tools serious sellers use to get more orders and look professional:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${highlights}</table>
${paid.length ? `<p style="margin:22px 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#71717a">Plans</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 -6px"><tr>${planCards}</tr></table>` : ""}
<p style="margin:24px 0 0"><a href="${billing}" style="display:inline-block;background:#f59e0b;color:#000;font-weight:700;font-size:15px;text-decoration:none;padding:13px 22px;border-radius:10px">See plans and upgrade</a></p>
<p style="margin:14px 0 0;font-size:13px;color:#71717a;line-height:1.5">Pay by card, transfer or USSD. Your plan starts as soon as payment is confirmed${d.yearlyDiscount > 0 ? `, and paying yearly saves you ${d.yearlyDiscount}%` : ""}.</p>
<p style="margin:24px 0 0;font-size:12px;color:#a1a1aa">Questions? Just reply to this email.</p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:11px;color:#a1a1aa">You're receiving this because you have a store on Duka. <a href="${d.unsubscribeUrl}" style="color:#a1a1aa">Unsubscribe from offers</a></p>
</td></tr></table></body></html>`;

  return {
    subject: entry ? `${d.storeName}: get your own domain, analytics and more with ${entry.name}` : `Grow ${d.storeName} with Duka`,
    html,
  };
}

/* ───────────────────────────── Audience ───────────────────────────── */

export interface AudienceStore {
  id: string;
  name: string;
  owner_id: string;
  owner_email: string | null;
}

/**
 * Active stores not on a running paid plan, at least 3 days old, that
 * haven't opted out of these emails or of setup reminders, and weren't sent
 * this email in the last 30 days. Stores with products first.
 */
const AUDIENCE_FROM = `
     FROM stores s
     LEFT JOIN plans pl ON pl.id = s.current_plan_id
     LEFT JOIN setup_reminders up ON up.subject = 'upgrade:' || s.id::text
     LEFT JOIN setup_reminders sr ON sr.subject = 'store:' || s.id::text
     WHERE s.is_active = true
       AND s.created_at < NOW() - INTERVAL '3 days'
       AND NOT (s.current_plan_id IS NOT NULL AND s.plan_expires_at > NOW() AND COALESCE(pl.price_monthly, 0) > 0)
       AND COALESCE(up.opted_out, false) = false
       AND COALESCE(sr.opted_out, false) = false
       AND (up.last_sent_at IS NULL OR up.last_sent_at < NOW() - INTERVAL '30 days')`;

export async function upgradeAudienceCount(): Promise<number> {
  await ensureTable();
  const rows = await query<{ n: number }>(`SELECT COUNT(*)::int AS n ${AUDIENCE_FROM}`);
  return Number(rows[0]?.n ?? 0);
}

export async function upgradeAudience(limit: number): Promise<AudienceStore[]> {
  await ensureTable();
  return query<AudienceStore>(
    `SELECT s.id, s.name, s.owner_id, s.owner_email ${AUDIENCE_FROM}
     ORDER BY (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id AND p.is_active = true) DESC, s.created_at DESC
     LIMIT $1`,
    [limit],
  );
}

export async function activePlans(): Promise<CampaignPlan[]> {
  return query<CampaignPlan>(
    `SELECT DISTINCT ON (name) id, name, price_monthly, max_products, max_reels, features
     FROM plans WHERE is_active = true ORDER BY name, sort_order, created_at`,
  );
}

/** Record the send first (atomically), so two admins clicking can't double-send. */
async function claimSend(storeId: string): Promise<boolean> {
  const rows = await query(
    `INSERT INTO setup_reminders (subject, step, last_sent_at) VALUES ($1, 1, NOW())
     ON CONFLICT (subject) DO UPDATE SET step = setup_reminders.step + 1, last_sent_at = NOW(), updated_at = NOW()
     WHERE setup_reminders.opted_out = false
       AND (setup_reminders.last_sent_at IS NULL OR setup_reminders.last_sent_at < NOW() - INTERVAL '30 days')
     RETURNING subject`,
    [`upgrade:${storeId}`],
  );
  return rows.length > 0;
}

export async function sendUpgradeCampaign(opts: { yearlyDiscount: number; limit?: number }): Promise<{ sent: number; failed: number; remaining: number }> {
  if (!emailConfigured()) throw new Error("Email isn't configured (RESEND_API_KEY / EMAIL_FROM)");
  const limit = Math.min(opts.limit ?? 200, 300);
  const [batch, plans] = await Promise.all([upgradeAudience(limit), activePlans()]);
  const appUrl = getAppUrl();
  const { adminAuth } = await import("@/lib/firebase-admin");

  let sent = 0;
  let failed = 0;
  for (const s of batch) {
    let email = s.owner_email;
    let name: string | null = null;
    try {
      const u = await adminAuth.getUser(s.owner_id);
      email = email || u.email || null;
      name = u.displayName ?? null;
    } catch {
      /* store row email only */
    }
    if (!email || !(await claimSend(s.id))) continue;
    const subject = `upgrade:${s.id}`;
    const msg = buildUpgradeEmail({ storeName: s.name, ownerName: name, plans, yearlyDiscount: opts.yearlyDiscount, appUrl, unsubscribeUrl: unsubscribeUrl(subject) });
    const res = await sendEmail(email, msg.subject, msg.html, undefined, { unsubscribeUrl: unsubscribeUrl(subject) }).catch(() => null);
    if (res?.ok) sent++;
    else failed++;
  }
  return { sent, failed, remaining: await upgradeAudienceCount() };
}

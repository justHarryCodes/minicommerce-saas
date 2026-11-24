// Growth engine emails: written in the STORE's name and colours (a shopper
// hears from the shop they bought from, not from Duka), with a one-click,
// signed "stop emails from this store" link.
import crypto from "crypto";
import { getAppUrl } from "./paystack";

/* ───────────────────────── Unsubscribe ───────────────────────── */

function key(): string | null {
  return process.env.REMINDER_SECRET || process.env.CRON_SECRET || null;
}

export function growthUnsubToken(storeId: string, email: string, k = key()): string | null {
  if (!k) return null;
  return crypto.createHmac("sha256", k).update(`growth-unsub:${storeId}:${email.trim().toLowerCase()}`).digest("base64url").slice(0, 32);
}

export function verifyGrowthUnsub(storeId: string, email: string, token: string, k = key()): boolean {
  const want = growthUnsubToken(storeId, email, k);
  if (!want || !token) return false;
  const a = Buffer.from(want);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function growthUnsubUrl(storeId: string, email: string): string {
  const e = email.trim().toLowerCase();
  return `${getAppUrl()}/api/growth/unsubscribe?s=${encodeURIComponent(storeId)}&e=${encodeURIComponent(e)}&t=${encodeURIComponent(growthUnsubToken(storeId, e) ?? "")}`;
}

/* ───────────────────────── Layout ───────────────────────── */

export interface StoreBrand {
  name: string;
  accent: string;
  logo: string | null;
  url: string; // the store's address (absolute)
}

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

/** Black or white text, whichever reads better on the store's colour. */
export function onAccent(hex: string): string {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (!m) return "#ffffff";
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#111111" : "#ffffff";
}

/** Adds ?utm_source=email so orders from these emails are counted on the Growth page. */
export function emailLink(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", "email");
    return u.toString();
  } catch {
    return url;
  }
}

function button(brand: StoreBrand, href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:${esc(brand.accent)};color:${onAccent(brand.accent)};text-decoration:none;padding:14px 26px;border-radius:12px;font-weight:700;font-size:15px">${esc(label)}</a>`;
}

function codeBox(brand: StoreBrand, code: string, note: string): string {
  return `<div style="margin:22px 0;text-align:center">
  <div style="display:inline-block;border:2px dashed ${esc(brand.accent)};border-radius:14px;padding:14px 24px;font-family:'Courier New',monospace;font-size:24px;font-weight:700;letter-spacing:2px;color:#111">${esc(code)}</div>
  <p style="margin:8px 0 0;font-size:12px;color:#71717a">${esc(note)}</p>
</div>`;
}

export interface ProductTeaser {
  name: string;
  price: number;
  image: string | null;
  url: string;
}

function products(list: ProductTeaser[], title: string): string {
  if (!list.length) return "";
  const cells = list
    .slice(0, 3)
    .map(
      (p) => `<td width="33%" style="padding:6px;vertical-align:top">
  <a href="${esc(emailLink(p.url))}" style="text-decoration:none;color:#18181b">
    ${p.image ? `<img src="${esc(p.image)}" width="160" alt="" style="display:block;width:100%;height:auto;border-radius:12px;background:#f4f4f5">` : ""}
    <p style="margin:8px 0 2px;font-size:13px;line-height:1.3">${esc(p.name)}</p>
    <p style="margin:0;font-size:13px;font-weight:700">${naira(p.price)}</p>
  </a>
</td>`,
    )
    .join("");
  return `<p style="margin:28px 0 6px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#71717a">${esc(title)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`;
}

function shell(brand: StoreBrand, preheader: string, body: string, unsubscribeUrl: string | null): string {
  const logo = brand.logo
    ? `<img src="${esc(brand.logo)}" alt="${esc(brand.name)}" height="44" style="display:block;margin:0 auto 6px;max-height:44px;width:auto">`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="height:6px;background:${esc(brand.accent)}"></td></tr>
<tr><td style="padding:26px 26px 0;text-align:center">${logo}<a href="${esc(emailLink(brand.url))}" style="font-size:18px;font-weight:700;color:#18181b;text-decoration:none">${esc(brand.name)}</a></td></tr>
<tr><td style="padding:18px 26px 28px;font-size:15px;line-height:1.6">${body}</td></tr>
</table>
<p style="max-width:520px;margin:16px auto 0;font-size:11px;line-height:1.5;color:#a1a1aa;text-align:center">
You're getting this because you shopped with or signed up to ${esc(brand.name)}.
${unsubscribeUrl ? `<a href="${esc(unsubscribeUrl)}" style="color:#71717a">Stop emails from ${esc(brand.name)}</a>` : ""}<br>Sent with Duka</p>
</td></tr></table></body></html>`;
}

const hi = (name: string | null | undefined) => (name?.trim() ? `Hi ${esc(name.trim().split(/\s+/)[0])},` : "Hi there,");

/* ───────────────────────── The emails ───────────────────────── */

export function welcomeCodeEmail(brand: StoreBrand, d: { name?: string | null; code: string; percent: number; unsubscribeUrl: string | null }) {
  const subject = `Your ${d.percent}% welcome code for ${brand.name}`;
  const html = shell(
    brand,
    `Here's ${d.percent}% off your first order.`,
    `<p style="margin:0 0 12px">${hi(d.name)}</p>
<p style="margin:0">Thanks for joining ${esc(brand.name)}! Here's your welcome code for <strong>${d.percent}% off</strong> your first order.</p>
${codeBox(brand, d.code, "One use, on your first order. Valid for 30 days.")}
<p style="margin:0;text-align:center">${button(brand, emailLink(brand.url), "Start shopping")}</p>`,
    d.unsubscribeUrl,
  );
  return { subject, html };
}

export function welcomeReminderEmail(brand: StoreBrand, d: { name?: string | null; code: string; percent: number; daysLeft: number; products: ProductTeaser[]; unsubscribeUrl: string | null }) {
  const subject = `Your ${d.percent}% code is waiting at ${brand.name}`;
  const html = shell(
    brand,
    `Your ${d.percent}% off is still here, for ${d.daysLeft} more days.`,
    `<p style="margin:0 0 12px">${hi(d.name)}</p>
<p style="margin:0">Just a reminder: your <strong>${d.percent}% off</strong> welcome code is still waiting for you${d.daysLeft > 0 ? `, for ${d.daysLeft} more day${d.daysLeft === 1 ? "" : "s"}` : ""}.</p>
${codeBox(brand, d.code, "Enter it at checkout. One use, on your first order.")}
<p style="margin:0;text-align:center">${button(brand, emailLink(brand.url), "Use my code")}</p>
${products(d.products, "Popular right now")}`,
    d.unsubscribeUrl,
  );
  return { subject, html };
}

export function reviewRequestEmail(brand: StoreBrand, d: { name?: string | null; orderNumber: string; items: ProductTeaser[]; unsubscribeUrl: string | null; referral?: { link: string; code: string; percent: number; reward: number } | null }) {
  const subject = `How was your order from ${brand.name}?`;
  const rows = d.items
    .slice(0, 4)
    .map(
      (p) => `<tr><td style="padding:8px 0;border-top:1px solid #f4f4f5">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    ${p.image ? `<td width="56" style="padding-right:12px"><img src="${esc(p.image)}" width="56" height="56" alt="" style="display:block;border-radius:10px;object-fit:cover"></td>` : ""}
    <td style="font-size:14px">${esc(p.name)}</td>
    <td align="right"><a href="${esc(emailLink(p.url))}#reviews" style="font-size:13px;font-weight:700;color:#18181b;white-space:nowrap">⭐ Rate it</a></td>
  </tr></table>
</td></tr>`,
    )
    .join("");
  const html = shell(
    brand,
    "A quick favour: tell others what you think.",
    `<p style="margin:0 0 12px">${hi(d.name)}</p>
<p style="margin:0">Thank you for your order <strong>${esc(d.orderNumber)}</strong> 💛 We hope you love it.</p>
<p style="margin:12px 0 4px">Could you take 30 seconds to rate what you bought? It helps other shoppers, and it helps a small business like ours a lot.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">${rows}</table>
<p style="margin:22px 0 0;text-align:center">${button(brand, emailLink(brand.url), `Shop ${brand.name} again`)}</p>
${d.referral ? referralBlock(brand, d.referral) : ""}`,
    d.unsubscribeUrl,
  );
  return { subject, html };
}

export function winBackEmail(brand: StoreBrand, d: { name?: string | null; code: string; percent: number; days: number; products: ProductTeaser[]; unsubscribeUrl: string | null }) {
  const subject = `We miss you! Here's ${d.percent}% off at ${brand.name}`;
  const html = shell(
    brand,
    `A little something to welcome you back: ${d.percent}% off.`,
    `<p style="margin:0 0 12px">${hi(d.name)}</p>
<p style="margin:0">It's been a while, and we miss you at ${esc(brand.name)}! Here's <strong>${d.percent}% off</strong> your next order, just for you.</p>
${codeBox(brand, d.code, `One use. Valid for ${d.days} days.`)}
<p style="margin:0;text-align:center">${button(brand, emailLink(brand.url), "See what's new")}</p>
${products(d.products, "New in store")}`,
    d.unsubscribeUrl,
  );
  return { subject, html };
}

/** "Give friends X% off, earn ₦Y" block (review emails, when the store runs referrals). */
export function referralBlock(brand: StoreBrand, d: { link: string; code: string; percent: number; reward: number }): string {
  const wa = `https://wa.me/?text=${encodeURIComponent(`I shop at ${brand.name} and I think you'll love it 💛 Here's ${d.percent}% off your first order: ${d.link}`)}`;
  return `<div style="margin:26px 0 0;padding:18px;border-radius:16px;background:#fafafa;border:1px solid #f4f4f5;text-align:center">
  <p style="margin:0;font-size:16px;font-weight:700">Give ${d.percent}%, get ${naira(d.reward)} 🎁</p>
  <p style="margin:6px 0 12px;font-size:14px;color:#52525b">Share your link. Friends get ${d.percent}% off their first order, and you get ${naira(d.reward)} to spend here when it's delivered.</p>
  <p style="margin:0 0 12px;font-family:'Courier New',monospace;font-size:18px;font-weight:700;letter-spacing:1px">${esc(d.code)}</p>
  <a href="${esc(wa)}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:700;font-size:14px">Share on WhatsApp</a>
</div>`;
}

export function creditEarnedEmail(brand: StoreBrand, d: { name?: string | null; reward: number; balance: number; creditCode: string; friend?: string | null; unsubscribeUrl: string | null }) {
  const subject = `You earned ${naira(d.reward)} at ${brand.name} 🎉`;
  const html = shell(
    brand,
    `Your friend's order arrived, so here's ${naira(d.reward)} to spend.`,
    `<p style="margin:0 0 12px">${hi(d.name)}</p>
<p style="margin:0">${d.friend ? `${esc(d.friend.split(/\s+/)[0])}` : "Your friend"} ordered with your link and it's been delivered. Thank you for sharing! You've earned <strong>${naira(d.reward)}</strong> to spend at ${esc(brand.name)}.</p>
${codeBox(brand, d.creditCode, `Your balance: ${naira(d.balance)}. Enter this code at checkout as a gift card.`)}
<p style="margin:0;text-align:center">${button(brand, emailLink(brand.url), "Spend my credit")}</p>`,
    d.unsubscribeUrl,
  );
  return { subject, html };
}

/** A vendor's broadcast. Their words are plain text: escaped, blank lines become paragraphs. */
export function broadcastEmail(brand: StoreBrand, d: { name?: string | null; subject: string; body: string; products: ProductTeaser[]; coupon?: { code: string; note: string } | null; unsubscribeUrl: string | null }) {
  const paragraphs = d.body
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p style="margin:0 0 12px">${esc(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const html = shell(
    brand,
    d.body.trim().slice(0, 110),
    `<p style="margin:0 0 12px">${hi(d.name)}</p>
${paragraphs}
${d.coupon ? codeBox(brand, d.coupon.code, d.coupon.note) : ""}
<p style="margin:6px 0 0;text-align:center">${button(brand, emailLink(brand.url), "Shop now")}</p>
${products(d.products, "Picked for you")}`,
    d.unsubscribeUrl,
  );
  return { subject: d.subject, html };
}

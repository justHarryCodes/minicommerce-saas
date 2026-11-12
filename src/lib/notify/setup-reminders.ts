// Nudge vendors who haven't finished setting up: people who signed up but
// never created a store, and stores with no products or no way to get paid.
// Reminders go out on day 1, 3, 7 and 14 after sign-up (email, plus the
// in-app / phone / browser push for stores), stop the moment setup is done,
// respect an unsubscribe link and an admin switch, and only send between
// 9am and 8pm Lagos time. Run from the scheduled jobs (api/cron/jobs).

import crypto from "crypto";
import { query, queryOne } from "@/lib/db";
import { getAppUrl } from "@/lib/paystack";
import { sendEmail, emailConfigured } from "./providers";
import { emailHeader } from "./email-brand";

export const REMINDER_DAYS = [1, 3, 7, 14] as const;
const MAX_AGE_DAYS = 30;

/* ───────────────────────────── Pure helpers ───────────────────────────── */

/**
 * Which reminder (1-based) is due, given the account's age and how many went
 * out already. Only ever one per run, and never a backlog: an account found
 * on day 10 with none sent gets the day-7 message, not four in a row.
 */
export function dueStep(ageDays: number, sent: number): number | null {
  let latest = 0;
  REMINDER_DAYS.forEach((d, i) => {
    if (ageDays >= d) latest = i + 1;
  });
  return latest > sent ? latest : null;
}

export type SetupTask = "products" | "more_products" | "payout" | "logo";

/** A store with a single product still gets nudged to add more. */
export const MIN_PRODUCTS = 2;

export interface StoreSetup {
  products: number;
  hasPayout: boolean;
  hasLogo: boolean;
}

/** What's still missing, most important first. */
export function missingTasks(s: StoreSetup): SetupTask[] {
  const out: SetupTask[] = [];
  if (s.products <= 0) out.push("products");
  else if (s.products < MIN_PRODUCTS) out.push("more_products");
  if (!s.hasPayout) out.push("payout");
  if (!s.hasLogo) out.push("logo");
  return out;
}

/** "Set up" = something to sell and a way to be paid. (A logo is nice, not required.) */
export function isSetUp(s: StoreSetup): boolean {
  return s.products >= MIN_PRODUCTS && s.hasPayout;
}

/** Lagos is UTC+1 all year: 9:00–19:59 local. */
export function inSendingHours(now = new Date()): boolean {
  const h = (now.getUTCHours() + 1) % 24;
  return h >= 9 && h < 20;
}

const TASK_TEXT: Record<SetupTask, { title: string; text: string; path: string; cta: string }> = {
  products: {
    title: "Add your first products",
    text: "Snap a photo with your phone, add a price, done. Our AI can write the description for you.",
    path: "/dashboard/products/new",
    cta: "Add a product",
  },
  more_products: {
    title: "Add a few more products",
    text: "You have one product so far. More choice gives shoppers more reasons to buy, and fills your store page.",
    path: "/dashboard/products/new",
    cta: "Add another product",
  },
  payout: {
    title: "Choose how you get paid",
    text: "Turn on Duka Pay so customers can pay by card, transfer or USSD, straight into your bank.",
    path: "/dashboard/settings#payments",
    cta: "Set up payments",
  },
  logo: {
    title: "Upload your logo",
    text: "A logo makes your store look trustworthy and memorable.",
    path: "/dashboard/settings",
    cta: "Upload logo",
  },
};

const STORE_SUBJECTS = [
  (n: string) => `${n} is almost ready, add your first product`,
  (n: string) => `Customers can't buy from an empty store: finish ${n}`,
  (n: string) => `Need a hand setting up ${n}? It takes 10 minutes`,
  (n: string) => `Last reminder: ${n} is waiting for you`,
];

const STORE_INTROS = [
  "You created your store on Duka. Nice! A few quick steps and it's ready for customers.",
  "Your store link is live, but shoppers who visit can't buy anything yet. Here's what's left:",
  "Most sellers finish setup in about 10 minutes from their phone. Here's exactly what's missing:",
  "We won't keep reminding you, but your store is still here and only a few steps from your first sale:",
];

function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function emailShell(inner: string, unsubscribeUrl: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px">
<tr><td>
${emailHeader()}
${inner}
<p style="margin:28px 0 0;font-size:12px;color:#a1a1aa">Questions? Just reply to this email and we'll help.</p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:11px;color:#a1a1aa">You're receiving this because you started a store on Duka. <a href="${unsubscribeUrl}" style="color:#a1a1aa">Stop these reminders</a></p>
</td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#f59e0b;color:#000;font-weight:700;font-size:14px;text-decoration:none;padding:12px 20px;border-radius:10px">${esc(label)}</a>`;

export function buildStoreReminder(d: {
  step: number;
  storeName: string;
  ownerName?: string | null;
  missing: SetupTask[];
  appUrl: string;
  unsubscribeUrl: string;
}): { subject: string; html: string; pushTitle: string; pushBody: string } {
  const i = Math.min(Math.max(d.step, 1), STORE_SUBJECTS.length) - 1;
  const hi = firstName(d.ownerName);
  const tasks = d.missing.length ? d.missing : (["products"] as SetupTask[]);
  const items = tasks
    .map((t, n) => {
      const x = TASK_TEXT[t];
      return `<tr><td style="padding:12px 0;border-top:1px solid #f4f4f5">
<p style="margin:0;font-size:15px;font-weight:700">${n + 1}. ${esc(x.title)}</p>
<p style="margin:4px 0 10px;font-size:14px;color:#52525b;line-height:1.5">${esc(x.text)}</p>
<a href="${d.appUrl}${x.path}" style="font-size:14px;font-weight:700;color:#b45309">${esc(x.cta)} →</a></td></tr>`;
    })
    .join("");
  const first = TASK_TEXT[tasks[0]];
  const html = emailShell(
    `<h1 style="margin:0 0 10px;font-size:22px;line-height:1.3">Hi${hi ? ` ${esc(hi)}` : ""}, let's get ${esc(d.storeName)} selling</h1>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6">${esc(STORE_INTROS[i])}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
<p style="margin:22px 0 0">${button(`${d.appUrl}${first.path}`, first.cta)}</p>`,
    d.unsubscribeUrl,
  );
  return {
    subject: STORE_SUBJECTS[i](d.storeName),
    html,
    pushTitle: tasks[0] === "products" ? "Add your first product 📦" : tasks[0] === "more_products" ? "Add more products 📦" : "Finish setting up your store",
    pushBody:
      tasks[0] === "products"
        ? `${d.storeName} has no products yet. Shoppers can't buy until you add some. It takes 2 minutes.`
        : tasks[0] === "more_products"
          ? `${d.storeName} has just one product. Add a few more so shoppers have more to choose from.`
          : `${first.title} so customers can buy from ${d.storeName}.`,
  };
}

const NO_STORE_SUBJECTS = [
  "Your Duka store is one step away",
  "Finish creating your store, it's free",
  "Still thinking about selling online?",
  "Last reminder: your free Duka store",
];

export function buildNoStoreReminder(d: { step: number; name?: string | null; appUrl: string; unsubscribeUrl: string }): { subject: string; html: string } {
  const i = Math.min(Math.max(d.step, 1), NO_STORE_SUBJECTS.length) - 1;
  const hi = firstName(d.name);
  const html = emailShell(
    `<h1 style="margin:0 0 10px;font-size:22px;line-height:1.3">Hi${hi ? ` ${esc(hi)}` : ""}, your store is waiting</h1>
<p style="margin:0 0 14px;font-size:15px;color:#3f3f46;line-height:1.6">You signed up for Duka but haven't created your store yet. It takes about 5 minutes and it's free:</p>
<ol style="margin:0 0 18px;padding-left:20px;font-size:15px;color:#3f3f46;line-height:1.8">
<li>Pick your store name and link</li><li>Add your products with photos from your phone</li><li>Share your link on WhatsApp and Instagram</li></ol>
<p style="margin:0">${button(`${d.appUrl}/onboarding`, "Create my store")}</p>`,
    d.unsubscribeUrl,
  );
  return { subject: NO_STORE_SUBJECTS[i], html };
}

/* ───────────────────────────── Unsubscribe ───────────────────────────── */

function signingKey(): string | null {
  return process.env.REMINDER_SECRET || process.env.CRON_SECRET || null;
}

export function unsubscribeToken(subject: string, key = signingKey()): string | null {
  if (!key) return null;
  return crypto.createHmac("sha256", key).update(`setup-reminders:${subject}`).digest("base64url").slice(0, 32);
}

export function verifyUnsubscribe(subject: string, token: string, key = signingKey()): boolean {
  const want = unsubscribeToken(subject, key);
  if (!want || !token) return false;
  const a = Buffer.from(want);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function unsubscribeUrl(subject: string): string {
  const t = unsubscribeToken(subject) ?? "";
  return `${getAppUrl()}/api/reminders/unsubscribe?s=${encodeURIComponent(subject)}&t=${encodeURIComponent(t)}`;
}

/* ───────────────────────────── Storage ───────────────────────────── */

let tableReady = false;
/** The contact log shared by setup reminders and marketing emails. */
export async function ensureTable() {
  if (tableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS setup_reminders (
      subject      TEXT        PRIMARY KEY,
      step         INT         NOT NULL DEFAULT 0,
      last_sent_at TIMESTAMPTZ,
      opted_out    BOOLEAN     NOT NULL DEFAULT FALSE,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  tableReady = true;
}

/** Claim a step atomically, so overlapping runs never send twice. */
async function claim(subject: string, step: number): Promise<boolean> {
  const rows = await query(
    `INSERT INTO setup_reminders (subject, step, last_sent_at) VALUES ($1, $2, NOW())
     ON CONFLICT (subject) DO UPDATE SET step = EXCLUDED.step, last_sent_at = NOW(), updated_at = NOW()
     WHERE setup_reminders.step < EXCLUDED.step AND setup_reminders.opted_out = false
     RETURNING subject`,
    [subject, step],
  );
  return rows.length > 0;
}

export async function optOut(subject: string): Promise<void> {
  await ensureTable();
  await query(
    `INSERT INTO setup_reminders (subject, opted_out) VALUES ($1, true)
     ON CONFLICT (subject) DO UPDATE SET opted_out = true, updated_at = NOW()`,
    [subject],
  );
}

/* ───────────────────────────── The job ───────────────────────────── */

export interface SetupReminderResult {
  stores: number;
  signups: number;
  skipped?: string;
}

export async function sendDueSetupReminders(opts: { now?: Date; enabled: boolean; limit?: number }): Promise<SetupReminderResult> {
  const now = opts.now ?? new Date();
  if (!opts.enabled) return { stores: 0, signups: 0, skipped: "turned off in admin settings" };
  if (!inSendingHours(now)) return { stores: 0, signups: 0, skipped: "outside 9am–8pm Lagos" };
  await ensureTable();
  const appUrl = getAppUrl();
  const limit = opts.limit ?? 100;

  // ── Stores that exist but aren't ready to sell ──
  const stores = await query<{
    id: string; name: string; owner_id: string; owner_email: string | null; created_at: Date;
    products: number; has_payout: boolean; has_logo: boolean; step: number | null;
  }>(
    `SELECT s.id, s.name, s.owner_id, s.owner_email, s.created_at,
            (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id AND p.is_active = true)::int AS products,
            (s.duka_pay_status = 'active' OR COALESCE(s.bank_account_number, '') <> '') AS has_payout,
            (COALESCE(s.logo_url, '') <> '') AS has_logo,
            r.step
     FROM stores s
     LEFT JOIN setup_reminders r ON r.subject = 'store:' || s.id::text
     WHERE s.is_active = true
       AND s.created_at < NOW() - INTERVAL '1 day'
       AND s.created_at > NOW() - make_interval(days => $1)
       AND COALESCE(r.opted_out, false) = false
       AND (r.last_sent_at IS NULL OR r.last_sent_at < NOW() - INTERVAL '20 hours')
     ORDER BY s.created_at DESC
     LIMIT $2`,
    [MAX_AGE_DAYS, limit],
  );

  let storesSent = 0;
  const { notifyStoreEvent } = await import("@/lib/push");
  const { adminAuth } = await import("@/lib/firebase-admin");
  for (const s of stores) {
    const setup = { products: Number(s.products), hasPayout: !!s.has_payout, hasLogo: !!s.has_logo };
    if (isSetUp(setup)) continue;
    const ageDays = (now.getTime() - new Date(s.created_at).getTime()) / 86_400_000;
    const step = dueStep(ageDays, s.step ?? 0);
    if (!step) continue;
    const subject = `store:${s.id}`;
    if (!(await claim(subject, step))) continue;

    let email = s.owner_email;
    let name: string | null = null;
    try {
      const u = await adminAuth.getUser(s.owner_id);
      email = email || u.email || null;
      name = u.displayName ?? null;
    } catch {
      /* no Firebase user: email from the store row only */
    }
    const msg = buildStoreReminder({ step, storeName: s.name, ownerName: name, missing: missingTasks(setup), appUrl, unsubscribeUrl: unsubscribeUrl(subject) });
    if (email && emailConfigured()) await sendEmail(email, msg.subject, msg.html, undefined, { unsubscribeUrl: unsubscribeUrl(subject) }).catch(() => null);
    await notifyStoreEvent(s.id, {
      type: "setup_reminder",
      title: msg.pushTitle,
      body: msg.pushBody,
      url: ["products", "more_products"].includes(missingTasks(setup)[0]) ? "/dashboard/products/new" : "/dashboard",
    }).catch(() => {});
    storesSent++;
  }

  // ── People who signed up but never created a store (once a day, first
  // run from 10am — scheduled runs can be hours apart, so not "at 10") ──
  let signupsSent = 0;
  const hour = (now.getUTCHours() + 1) % 24;
  if (hour >= 10 && emailConfigured()) {
    const already = await queryOne<{ last_sent_at: Date | null }>(
      "SELECT last_sent_at FROM setup_reminders WHERE subject = 'job:signups'",
    );
    const ranToday = already?.last_sent_at && now.getTime() - new Date(already.last_sent_at).getTime() < 20 * 3_600_000;
    if (!ranToday) {
      await query(
        `INSERT INTO setup_reminders (subject, step, last_sent_at) VALUES ('job:signups', 0, NOW())
         ON CONFLICT (subject) DO UPDATE SET last_sent_at = NOW(), updated_at = NOW()`,
      );
      // A Firebase hiccup must not lose the store reminders already sent
      signupsSent = await remindSignupsWithoutStore(now, appUrl, limit).catch((err) => {
        console.error("[setup-reminders] sign-up pass failed:", err);
        return 0;
      });
    }
  }

  return { stores: storesSent, signups: signupsSent };
}

async function remindSignupsWithoutStore(now: Date, appUrl: string, limit: number): Promise<number> {
  const { adminAuth } = await import("@/lib/firebase-admin");
  // Recent sign-ups from Firebase (it can't filter by date, so page through)
  const candidates: { uid: string; email: string; name: string | null; ageDays: number }[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 10; page++) {
    const res = await adminAuth.listUsers(1000, pageToken);
    for (const u of res.users) {
      if (!u.email || u.disabled) continue;
      const ageDays = (now.getTime() - new Date(u.metadata.creationTime).getTime()) / 86_400_000;
      if (ageDays < REMINDER_DAYS[0] || ageDays > MAX_AGE_DAYS) continue;
      candidates.push({ uid: u.uid, email: u.email, name: u.displayName ?? null, ageDays });
    }
    pageToken = res.pageToken;
    if (!pageToken) break;
  }
  if (!candidates.length) return 0;

  // Not store owners, team members, admins or affiliates-only accounts; not opted out
  const uids = candidates.map((c) => c.uid);
  const busy = await query<{ uid: string }>(
    `SELECT owner_id AS uid FROM stores WHERE owner_id = ANY($1::text[])
     UNION SELECT firebase_uid FROM store_members WHERE firebase_uid = ANY($1::text[])
     UNION SELECT firebase_uid FROM admin_users WHERE firebase_uid = ANY($1::text[])`,
    [uids],
  ).catch(() => [] as { uid: string }[]);
  const skip = new Set(busy.map((b) => b.uid));
  const reminders = await query<{ subject: string; step: number; opted_out: boolean }>(
    "SELECT subject, step, opted_out FROM setup_reminders WHERE subject = ANY($1::text[])",
    [uids.map((u) => `user:${u}`)],
  );
  const state = new Map(reminders.map((r) => [r.subject, r]));

  let sent = 0;
  for (const c of candidates) {
    if (sent >= limit) break;
    if (skip.has(c.uid)) continue;
    const subject = `user:${c.uid}`;
    const r = state.get(subject);
    if (r?.opted_out) continue;
    const step = dueStep(c.ageDays, r?.step ?? 0);
    if (!step || !(await claim(subject, step))) continue;
    const msg = buildNoStoreReminder({ step, name: c.name, appUrl, unsubscribeUrl: unsubscribeUrl(subject) });
    const res = await sendEmail(c.email, msg.subject, msg.html, undefined, { unsubscribeUrl: unsubscribeUrl(subject) }).catch(() => null);
    if (res?.ok) sent++;
  }
  return sent;
}

/** For the admin overview: stores that still need setting up (last 30 days). */
export async function unfinishedStoreCount(): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM stores s
     WHERE s.is_active = true AND s.created_at > NOW() - INTERVAL '30 days'
       AND ((SELECT COUNT(*) FROM products p WHERE p.store_id = s.id AND p.is_active = true) < ${MIN_PRODUCTS}
            OR NOT (s.duka_pay_status = 'active' OR COALESCE(s.bank_account_number, '') <> ''))`,
  );
  return row?.n ?? 0;
}

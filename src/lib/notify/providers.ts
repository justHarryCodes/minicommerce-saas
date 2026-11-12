// Outbound customer messaging providers. Both are optional: with no keys
// configured, sends are skipped (logged) and the rest of checkout works.
//
//   SMS   — Termii (TERMII_API_KEY, TERMII_SENDER_ID, optional TERMII_BASE_URL)
//   Email — Resend (RESEND_API_KEY, EMAIL_FROM e.g. "Duka <orders@dukanigeria.com>")

import { toNgInternational } from "@/lib/phone";

export type SendResult = { ok: true } | { ok: false; error: string };

export function smsConfigured(): boolean {
  return !!process.env.TERMII_API_KEY && !!process.env.TERMII_SENDER_ID;
}

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

export async function sendSms(phone: string, text: string): Promise<SendResult> {
  if (!smsConfigured()) return { ok: false, error: "SMS not configured" };
  const to = toNgInternational(phone);
  if (!to) return { ok: false, error: "Invalid phone number" };
  const base = (process.env.TERMII_BASE_URL ?? "https://api.ng.termii.com").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TERMII_API_KEY,
        to,
        from: process.env.TERMII_SENDER_ID,
        sms: text,
        type: "plain",
        // "dnd" routes reach numbers on Nigeria's Do-Not-Disturb list,
        // which "generic" silently drops — needed for transactional texts.
        channel: process.env.TERMII_CHANNEL ?? "dnd",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, error: `Termii ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "SMS send failed" };
  }
}

/** A readable plain-text copy of an HTML email (mail providers trust multipart mail more). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
      const text = label.replace(/<[^>]+>/g, "").trim();
      return text && text !== href ? `${text} (${href})` : href;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li|table|ol|ul)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter((l, i, a) => l || (a[i - 1] ?? "") !== "")
    .join("\n")
    .trim();
}

export interface EmailOptions {
  /** Plain-text body; derived from the HTML when omitted */
  text?: string;
  /** Marketing / reminder mail: adds RFC 8058 one-click unsubscribe headers */
  unsubscribeUrl?: string;
}

export async function sendEmail(to: string, subject: string, html: string, replyTo?: string, opts: EmailOptions = {}): Promise<SendResult> {
  if (!emailConfigured()) return { ok: false, error: "Email not configured" };
  // Bounced or complained before: sending again only hurts the domain's reputation
  const { isSuppressed } = await import("./suppressions");
  if (await isSuppressed(to)) return { ok: false, error: "Address suppressed (bounced or marked as spam)" };
  const reply = replyTo ?? process.env.EMAIL_REPLY_TO;
  const headers: Record<string, string> = {};
  if (opts.unsubscribeUrl) {
    // Gmail / Yahoo show their own "Unsubscribe" button: people use it instead of "Report spam"
    headers["List-Unsubscribe"] = `<${opts.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject,
        html,
        text: opts.text ?? htmlToText(html),
        ...(reply ? { reply_to: reply } : {}),
        ...(Object.keys(headers).length ? { headers } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Email send failed" };
  }
}

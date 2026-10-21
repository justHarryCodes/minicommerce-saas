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

export async function sendEmail(to: string, subject: string, html: string, replyTo?: string): Promise<SendResult> {
  if (!emailConfigured()) return { ok: false, error: "Email not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Email send failed" };
  }
}

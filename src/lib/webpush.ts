// ─── Web Push (VAPID) ──────────────────────────────────────────────
// Wraps the `web-push` package — unlike the rest of this codebase's REST
// integrations (Paystack, Cloudinary, Groq, Gemini — all plain `fetch`
// calls with a bearer token), sending a Web Push message requires
// implementing RFC 8291 payload encryption and signing a VAPID JWT. That's
// a real cryptographic protocol, not a simple authenticated request, so a
// well-audited library is used here deliberately rather than hand-rolled.
import webpush from "web-push";
import { query } from "./db";

export interface WebPushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

let vapidConfigured = false;

/** Presence-check only — no network call. Callers should short-circuit on
 *  this before doing any work, same pattern as isAiEnabled(). */
export function isWebPushEnabled(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

function ensureVapidConfigured(): void {
  if (vapidConfigured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  vapidConfigured = true;
}

export interface WebPushPayload {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
}

export type WebPushSendResult =
  | { status: "sent" }
  | { status: "skipped"; reason: "not_configured" }
  | { status: "expired" } // subscription is dead (404/410) — caller should delete it
  | { status: "failed"; error: string };

/** Sends to a single subscription. Never throws — every failure mode is a
 *  typed result the caller inspects, since this sits in fire-and-forget
 *  notification paths that must never break the request that triggered them. */
export async function sendWebPush(
  sub: WebPushSubscriptionRow,
  payload: WebPushPayload
): Promise<WebPushSendResult> {
  if (!isWebPushEnabled()) return { status: "skipped", reason: "not_configured" };
  ensureVapidConfigured();

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload)
    );
    return { status: "sent" };
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    // 404/410 mean the push service has permanently invalidated this
    // subscription (user revoked permission, uninstalled the PWA, browser
    // data cleared, etc.) — retrying or keeping the row around is pointless.
    if (statusCode === 404 || statusCode === 410) return { status: "expired" };
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

/** Sends the same payload to every subscription for a subject, cleaning up
 *  any that come back expired. Best-effort — a failure on one subscription
 *  never stops the others, and this function itself never throws. */
export async function sendWebPushToSubject(
  subjectType: "vendor" | "admin",
  subjectId: string,
  payload: WebPushPayload
): Promise<void> {
  if (!isWebPushEnabled()) return;

  const subs = await query<WebPushSubscriptionRow>(
    "SELECT id, endpoint, p256dh, auth FROM web_push_subscriptions WHERE subject_type = $1 AND subject_id = $2",
    [subjectType, subjectId]
  ).catch(() => [] as WebPushSubscriptionRow[]);

  if (!subs.length) return;

  const expiredIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      const result = await sendWebPush(sub, payload);
      if (result.status === "expired") expiredIds.push(sub.id);
    })
  );

  if (expiredIds.length) {
    await query("DELETE FROM web_push_subscriptions WHERE id = ANY($1::uuid[])", [expiredIds]).catch(() => {});
  }
}

/** Fans out to every active admin's subscriptions — for platform-wide
 *  events (e.g. a bank-transfer payment awaiting confirmation) rather than
 *  one specific admin. */
export async function sendWebPushToAllAdmins(payload: WebPushPayload): Promise<void> {
  if (!isWebPushEnabled()) return;

  const admins = await query<{ firebase_uid: string }>(
    "SELECT firebase_uid FROM admin_users WHERE is_active = true",
    []
  ).catch(() => [] as { firebase_uid: string }[]);

  await Promise.all(admins.map((a) => sendWebPushToSubject("admin", a.firebase_uid, payload)));
}

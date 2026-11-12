import { NextRequest, NextResponse } from "next/server";
import { suppress } from "@/lib/notify/suppressions";
import { verifySvix } from "@/lib/notify/svix";

export const dynamic = "force-dynamic";

// Resend tells us when an email hard-bounced or was marked as spam; that
// address is never emailed again (lib/notify/suppressions). Set up in Resend:
// Webhooks -> https://dukanigeria.com/api/resend/webhook with the events
// email.bounced and email.complained, and copy its signing secret into
// RESEND_WEBHOOK_SECRET (signature check: lib/notify/svix).

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  const body = await req.text();
  const ok = verifySvix(
    secret,
    req.headers.get("svix-id") ?? "",
    req.headers.get("svix-timestamp") ?? "",
    body,
    req.headers.get("svix-signature") ?? "",
  );
  if (!ok) return NextResponse.json({ error: "Bad signature" }, { status: 401 });

  let event: { type?: string; data?: { to?: string[] | string; bounce?: { type?: string } } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const to = Array.isArray(event.data?.to) ? event.data!.to : event.data?.to ? [event.data.to] : [];
  // Soft bounces (full inbox, temporary) are retried by providers; only permanent ones suppress
  const permanentBounce = event.type === "email.bounced" && !/transient|soft|temporary/i.test(event.data?.bounce?.type ?? "");
  if (permanentBounce || event.type === "email.complained") {
    for (const email of to) await suppress(email, event.type === "email.complained" ? "complained" : "bounced");
  }
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { createDeletionRequest, DELETION_DAYS } from "@/lib/data-deletion";
import { sendEmail } from "@/lib/notify/providers";
import { emailHeader } from "@/lib/notify/email-brand";
import { esc } from "@/lib/notify/setup-reminders";
import { sendWebPushToAllAdmins } from "@/lib/webpush";
import { getAppUrl } from "@/lib/paystack";

export const dynamic = "force-dynamic";

// Public "delete my data" form on /data-deletion. Anyone can ask (vendors who
// can't sign in, shoppers, people who chatted with a store on WhatsApp /
// Instagram / Facebook); the team checks who they are before deleting.

const Schema = z.object({
  role: z.enum(["vendor", "customer", "other"]),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30).optional().default(""),
  storeName: z.string().trim().max(120).optional().default(""),
  details: z.string().trim().max(2000).optional().default(""),
  website: z.string().optional().default(""), // honeypot: people never fill it
});

const ROLE_LABEL = { vendor: "Vendor (I have a Duka store)", customer: "Shopper (I bought from or messaged a store)", other: "Other" } as const;

function supportAddress(): string {
  return process.env.EMAIL_REPLY_TO || "support@dukanigeria.com";
}

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, { key: "rl:data-deletion", max: 5, window: 3600 });
  if (limited) return limited;

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 422 });
  const d = parsed.data;
  // Bots fill every field: pretend it worked, store nothing.
  if (d.website) return NextResponse.json({ ok: true, code: null });

  const code = await createDeletionRequest({
    source: "web",
    role: d.role,
    email: d.email.toLowerCase(),
    phone: d.phone || null,
    storeName: d.storeName || null,
    details: d.details || null,
  });

  const statusUrl = `${getAppUrl()}/data-deletion?code=${code}`;
  const rows = [
    ["Code", code],
    ["Who", ROLE_LABEL[d.role]],
    ["Email", d.email],
    ["Phone", d.phone || "-"],
    ["Store", d.storeName || "-"],
    ["Details", d.details || "-"],
  ]
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#71717a;vertical-align:top">${k}</td><td style="padding:4px 0">${esc(v).replace(/\n/g, "<br>")}</td></tr>`)
    .join("");

  // To the team (reply goes straight to the person)
  await sendEmail(
    supportAddress(),
    `Data deletion request ${code}`,
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#18181b">${emailHeader()}
<p style="margin:0 0 12px">New data deletion request. Confirm it's really them (reply from the same email, or the store owner's sign-in email), then delete within ${DELETION_DAYS} days.</p>
<table style="font-size:14px">${rows}</table></div>`,
    d.email,
  ).catch(() => null);

  // To the person: their code and where to check
  await sendEmail(
    d.email,
    `We got your data deletion request (${code})`,
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#18181b;max-width:520px">${emailHeader()}
<p style="margin:0 0 12px;font-size:15px;line-height:1.6">We've received your request to delete your data from Duka. Your reference code is <strong>${code}</strong>.</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6">We may reply to this email to confirm it's really you. We'll finish within ${DELETION_DAYS} days.</p>
<p style="margin:0 0 12px"><a href="${statusUrl}" style="color:#b45309;font-weight:700">Check the status of your request</a></p>
<p style="margin:16px 0 0;font-size:12px;color:#a1a1aa">Didn't ask for this? Reply and tell us, and we'll cancel it.</p></div>`,
    supportAddress(),
  ).catch(() => null);

  sendWebPushToAllAdmins({ title: "🗑️ Data deletion request", body: `${code} · ${ROLE_LABEL[d.role]} · ${d.email}`, url: "/admin/data-requests" }).catch(() => {});

  return NextResponse.json({ ok: true, code });
}

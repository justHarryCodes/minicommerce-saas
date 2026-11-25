import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAdminAction, verifyAdminSession } from "@/lib/admin-auth";
import { emailConfigured, sendEmail } from "@/lib/notify/providers";
import { unsubscribeUrl } from "@/lib/notify/setup-reminders";
import {
  ACTIVITIES, type Activity, audienceCount, audienceOptions, audienceSample, campaignEmail, CHANNELS, createCampaign, ensureCampaignTables, runCampaign,
} from "@/lib/admin/campaigns";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Admin campaign builder.
//   GET                          audience choices (categories, plans, states)
//   POST {action:"preview", audience}           how many stores + a few names
//   POST {action:"test", content}               email the admin a copy
//   POST {action:"send", content, audience}     create + send (in the background)

const AudienceSchema = z.object({
  categories: z.array(z.string().max(80)).max(50).optional(),
  plans: z.array(z.string().max(60)).max(20).optional(),
  activity: z.array(z.enum(ACTIVITIES.map((a) => a.id) as [Activity, ...Activity[]])).max(5).optional(),
  states: z.array(z.string().max(40)).max(40).optional(),
  storeIds: z.array(z.string().uuid()).max(2000).optional(),
});
const ContentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  subject: z.string().trim().min(2).max(150),
  headline: z.string().trim().min(2).max(150),
  body: z.string().trim().min(5).max(5000),
  ctaLabel: z.string().trim().max(40).optional().nullable(),
  ctaUrl: z.string().trim().max(500).regex(/^(https:\/\/|\/)/, "Link must start with https:// or /").optional().nullable().or(z.literal("")),
  channels: z.array(z.enum(CHANNELS as [string, ...string[]])).min(1),
  theme: z.string().trim().max(30).regex(/^[a-z-]+$/).optional().nullable(),
});
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preview"), audience: AudienceSchema }),
  z.object({ action: z.literal("test"), content: ContentSchema }),
  z.object({ action: z.literal("send"), content: ContentSchema, audience: AudienceSchema }),
]);

export async function GET() {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  return NextResponse.json({ ...(await audienceOptions()), activities: ACTIVITIES, emailReady: emailConfigured() });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 422 });
  const d = parsed.data;

  if (d.action === "preview") {
    const [count, sample] = await Promise.all([audienceCount(d.audience), audienceSample(d.audience)]);
    return NextResponse.json({ count, sample });
  }

  // Absolute CTA links in emails ("/dashboard/billing" -> https://dukanigeria.com/dashboard/billing)
  const { getAppUrl } = await import("@/lib/paystack");
  const content = { ...d.content, ctaUrl: d.content.ctaUrl ? (d.content.ctaUrl.startsWith("/") ? `${getAppUrl()}${d.content.ctaUrl}` : d.content.ctaUrl) : null, channels: d.content.channels as ("email" | "push" | "inapp")[] };

  if (d.action === "test") {
    if (!emailConfigured()) return NextResponse.json({ error: "Email isn't configured" }, { status: 503 });
    const m = campaignEmail(content, { store: "Your Store", name: admin.name ?? admin.email, unsubscribe: unsubscribeUrl("upgrade:00000000-0000-0000-0000-000000000000") });
    const r = await sendEmail(admin.email, `[Test] ${m.subject}`, m.html);
    return r.ok ? NextResponse.json({ ok: true, to: admin.email }) : NextResponse.json({ error: r.error ?? "Send failed" }, { status: 502 });
  }

  await ensureCampaignTables();
  const { id, size } = await createCampaign(content, d.audience, admin.email);
  if (!size) return NextResponse.json({ error: "No stores match this audience" }, { status: 422 });
  await logAdminAction({ adminUid: admin.firebaseUid, adminEmail: admin.email, action: "campaign_send", targetType: "campaign", targetId: id, details: { name: content.name, channels: content.channels, size } }).catch(() => {});
  after(() => runCampaign(id).then(() => undefined, (e) => console.error("[campaign] failed:", e)));
  return NextResponse.json({ ok: true, id, size });
}

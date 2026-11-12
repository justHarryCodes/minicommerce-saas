import { NextRequest, NextResponse } from "next/server";
import { getPlatformSettings, logAdminAction, verifyAdminSession } from "@/lib/admin-auth";
import { getAppUrl } from "@/lib/paystack";
import { emailConfigured, sendEmail } from "@/lib/notify/providers";
import { activePlans, buildUpgradeEmail, sendUpgradeCampaign, upgradeAudienceCount } from "@/lib/notify/upgrade-campaign";

export const dynamic = "force-dynamic";

/** Preview + who would receive it. */
export async function GET() {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [plans, settings, audience] = await Promise.all([activePlans(), getPlatformSettings(), upgradeAudienceCount().catch(() => 0)]);
  const preview = buildUpgradeEmail({
    storeName: "Your Store",
    ownerName: admin.name ?? null,
    plans,
    yearlyDiscount: settings.yearly_discount_percent,
    appUrl: getAppUrl(),
    unsubscribeUrl: "#",
  });
  return NextResponse.json({ audience, preview, emailReady: emailConfigured() });
}

/** { mode: "test" } sends the preview to you; { mode: "send" } sends to the audience (up to 200 per click). */
export async function POST(req: NextRequest) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!emailConfigured()) return NextResponse.json({ error: "Email isn't configured (RESEND_API_KEY / EMAIL_FROM)" }, { status: 503 });
  const { mode } = await req.json().catch(() => ({}));
  const settings = await getPlatformSettings();

  if (mode === "test") {
    const plans = await activePlans();
    const msg = buildUpgradeEmail({ storeName: "Your Store", ownerName: admin.name ?? null, plans, yearlyDiscount: settings.yearly_discount_percent, appUrl: getAppUrl(), unsubscribeUrl: `${getAppUrl()}/` });
    const r = await sendEmail(admin.email, `[Test] ${msg.subject}`, msg.html);
    return r.ok ? NextResponse.json({ ok: true, to: admin.email }) : NextResponse.json({ error: r.error }, { status: 502 });
  }

  if (mode === "send") {
    const result = await sendUpgradeCampaign({ yearlyDiscount: settings.yearly_discount_percent, limit: 200 });
    await logAdminAction({ adminUid: admin.firebaseUid, adminEmail: admin.email, action: "send_upgrade_campaign", details: result }).catch(() => {});
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "mode must be test or send" }, { status: 400 });
}

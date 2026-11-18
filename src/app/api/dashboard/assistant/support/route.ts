import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/auth";
import { getStoreAccess } from "@/lib/access";
import { getEffectivePlan } from "@/lib/plan";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/notify/providers";
import { esc } from "@/lib/notify/setup-reminders";
import { sendWebPushToAllAdmins } from "@/lib/webpush";

export const dynamic = "force-dynamic";

// "Contact support" from the Duka Assistant (confirmed by the seller):
// emails Duka's support inbox with the store details, replying to the seller.

const Body = z.object({
  subject: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(2000),
  transcript: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(12).optional(),
});

export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await getStoreAccess(user);
  if (!access) return NextResponse.json({ error: "No store" }, { status: 403 });
  if (!(await rateLimit(`rl:support:${user.firebaseUid}`, 5, 3600))) {
    return NextResponse.json({ error: "You've contacted support several times this hour. We'll reply soon." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please describe the problem." }, { status: 422 });
  const { subject, message, transcript } = parsed.data;
  const st = access.store as unknown as Record<string, unknown>;
  const plan = await getEffectivePlan(String(st.id)).catch(() => null);

  const rows: [string, string][] = [
    ["Store", `${st.name} (${st.slug})`],
    ["From", `${user.displayName ?? ""} <${user.email}> · ${access.role}`],
    ["Plan", plan?.name ?? "?"],
  ];
  const convo = (transcript ?? [])
    .slice(-8)
    .map((m) => `<p style="margin:6px 0"><strong>${m.role === "user" ? "Seller" : "Assistant"}:</strong> ${esc(m.content.slice(0, 1200)).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const html = `<h2 style="font-family:sans-serif">${esc(subject)}</h2>
<table style="font-family:sans-serif;font-size:14px">${rows.map(([k, v]) => `<tr><td style="color:#71717a;padding:2px 12px 2px 0">${k}</td><td>${esc(v)}</td></tr>`).join("")}</table>
<p style="font-family:sans-serif;font-size:15px;white-space:pre-wrap">${esc(message)}</p>
${convo ? `<hr><p style="font-family:sans-serif;color:#71717a;font-size:12px">Recent chat with the Duka Assistant</p><div style="font-family:sans-serif;font-size:13px">${convo}</div>` : ""}`;

  const to = process.env.SUPPORT_EMAIL || process.env.EMAIL_REPLY_TO || "support@dukanigeria.com";
  const sent = await sendEmail(to, `[Support] ${subject} · ${st.name}`, html, user.email || undefined);
  sendWebPushToAllAdmins({ title: "🛟 Support request", body: `${st.name}: ${subject}`, url: "/admin" }).catch(() => {});
  if (!sent.ok) {
    console.error("[support] email failed:", sent.error);
    return NextResponse.json({ error: "Couldn't send right now. Please email support@dukanigeria.com." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

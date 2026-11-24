import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { hasFeature } from "@/lib/plan";
import { checkRateLimit } from "@/lib/rate-limit";
import { claimWelcome } from "@/lib/growth";
import { sendWelcomeCodeEmail } from "@/lib/growth-automations";

// Growth engine: a shopper takes a store's welcome offer. They become a
// contact (they agreed to hear from the store) and get their own one-time
// code for a first order.
const Body = z.object({
  phone: z.string().trim().min(7).max(30),
  name: z.string().trim().max(80).optional().nullable(),
  email: z.string().trim().email().max(160).optional().nullable().or(z.literal("")),
  consent: z.literal(true),
  visitorId: z.string().max(64).optional().nullable(),
  /** Honeypot: people never fill this in */
  website: z.string().max(0).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const limited = await checkRateLimit(req, { key: `welcome:${slug}`, max: 6, window: 3600, message: "Too many tries. Please wait a little and try again." });
  if (limited) return limited;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    const consent = parsed.error.issues.some((i) => i.path[0] === "consent");
    return NextResponse.json({ error: consent ? "Please tick the box to get your code" : "Please check your WhatsApp number" }, { status: 422 });
  }

  const store = await queryOne<{ id: string; welcome_offer_enabled: boolean; welcome_offer_percent: number }>(
    "SELECT id, welcome_offer_enabled, welcome_offer_percent FROM stores WHERE slug = $1 AND is_active = true",
    [slug],
  );
  if (!store?.welcome_offer_enabled || !(await hasFeature(store.id, "coupons"))) {
    return NextResponse.json({ error: "This offer isn't available right now" }, { status: 404 });
  }

  const d = parsed.data;
  const visitorId = d.visitorId && /^[\w-]{8,64}$/.test(d.visitorId) ? d.visitorId : null;
  const result = await claimWelcome(store, { phone: d.phone, name: d.name, email: d.email || null, visitorId });
  if (result.status === "invalid_phone") {
    return NextResponse.json({ error: "Please enter a Nigerian mobile number, like 0803 123 4567" }, { status: 422 });
  }
  if (result.status === "code" && d.email && result.contactId) {
    await sendWelcomeCodeEmail(store.id, { contactId: result.contactId, email: d.email, name: d.name, code: result.code, percent: result.percent }).catch(() => {});
  }
  // The contact id stays on the server
  const { contactId: _contactId, ...shown } = result as typeof result & { contactId?: string };
  return NextResponse.json(shown);
}

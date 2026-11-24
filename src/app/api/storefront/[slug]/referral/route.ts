import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensureReferrer, referralSettingsFor } from "@/lib/growth-referrals";

// A buyer asks for their share link from their receipt. The receipt's
// secret token proves it's their order.
const Body = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  token: z.string().regex(/^[a-f0-9]{16,64}$/i),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const limited = await checkRateLimit(req, { key: `referral:${slug}`, max: 20, window: 3600 });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const order = await queryOne<{ store_id: string; slug: string; name: string; custom_domain: string | null; customer_phone: string; customer_name: string; customer_email: string | null; order_status: string }>(
    `SELECT o.store_id, s.slug, s.name, s.custom_domain, o.customer_phone, o.customer_name, o.customer_email, o.order_status
     FROM orders o JOIN stores s ON s.id = o.store_id
     WHERE s.slug = $1 AND o.order_number = $2 AND o.access_token = $3`,
    [slug, parsed.data.orderNumber.toUpperCase(), parsed.data.token],
  );
  if (!order || order.order_status === "cancelled") return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const { settings, active } = await referralSettingsFor(order.store_id);
  if (!active) return NextResponse.json({ error: "This store isn't running referrals right now" }, { status: 404 });

  const ref = await ensureReferrer(
    { id: order.store_id, slug: order.slug, name: order.name, custom_domain: order.custom_domain },
    { phone: order.customer_phone, name: order.customer_name, email: order.customer_email },
    settings,
  );
  if (!ref) return NextResponse.json({ error: "We couldn't make your link for this phone number" }, { status: 422 });
  return NextResponse.json({ code: ref.code, link: ref.link, percent: settings.friendPercent, reward: settings.reward });
}

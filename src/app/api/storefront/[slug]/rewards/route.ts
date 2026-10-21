import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkGiftCard } from "@/lib/gift-cards";
import { loyaltyFor } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

const Schema = z.object({
  phone: z.string().trim().max(30).optional().nullable(),
  giftCardCode: z.string().trim().max(40).optional().nullable(),
});

/**
 * Checkout preview: is this phone's order the loyalty-rewarded one, and
 * what's on a gift card. The order API re-checks both, so this is display
 * only. Tight rate limit — gift card codes must not be guessable by brute force.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  const { phone, giftCardCode } = parsed.data;

  const limited = giftCardCode
    ? await checkRateLimit(req, { key: "rl:giftcard", max: 10, window: 600 })
    : await checkRateLimit(req, { key: "rl:rewards", max: 60, window: 600 });
  if (limited) return limited;

  const { slug } = await params;
  const store = await queryOne<{ id: string; loyalty_every_n: number | null; loyalty_percent: number }>(
    "SELECT id, loyalty_every_n, loyalty_percent FROM stores WHERE slug = $1 AND is_active = true",
    [slug]
  );
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const [loyalty, giftCard] = await Promise.all([
    phone && phone.replace(/\D/g, "").length >= 10 ? loyaltyFor(store, phone) : Promise.resolve(null),
    giftCardCode ? checkGiftCard(store.id, giftCardCode) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    loyalty,
    giftCard: giftCard ? (giftCard.ok ? { code: giftCard.code, balance: giftCard.balance } : { error: giftCard.error }) : null,
  });
}

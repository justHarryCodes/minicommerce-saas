import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getStoreFor } from "@/lib/access";
import { checkGiftCard } from "@/lib/gift-cards";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// POS: look up a gift card's balance before charging (staff can use the till).
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, { key: "rl:pos-giftcard", max: 30, window: 600 });
  if (limited) return limited;
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "pos");
  if (!store) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const g = await checkGiftCard(store.id, String(code ?? ""));
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: 400 });
  return NextResponse.json({ code: g.code, balance: g.balance });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { getTheme } from "@/lib/themes/catalog";
import { FREE_THEME_IDS } from "@/lib/features-shared";
import { ownsTheme } from "@/lib/theme-access";
import { startPayment, targets } from "@/lib/payments";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Buy one theme for its one-time price (₦10,000–₦50,000). Plans don't
 * include themes.
 * Owner only. The theme unlocks when Paystack confirms the payment
 * (webhook / return page / reconcile, applied exactly once).
 */
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, { key: "rl:theme-buy", max: 20, window: 600 });
  if (limited) return limited;
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "Only the store owner can buy themes" }, { status: 403 });

  const parsed = z.object({ themeId: z.string().min(1).max(50) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Choose a theme" }, { status: 422 });
  const theme = getTheme(parsed.data.themeId);
  if (!theme) return NextResponse.json({ error: "Unknown theme" }, { status: 404 });
  if (FREE_THEME_IDS.has(theme.id) || !(theme.price > 0)) return NextResponse.json({ error: `${theme.name} is free — just apply it` }, { status: 400 });
  if (await ownsTheme(store.id, theme.id)) return NextResponse.json({ error: `You already own ${theme.name}` }, { status: 409 });
  if (!user.email) return NextResponse.json({ error: "Your account needs an email address to pay" }, { status: 400 });

  const started = await startPayment({
    kind: "theme",
    storeId: store.id,
    targetId: targets.theme(store.id, theme.id),
    amount: theme.price,
    email: user.email,
    referencePrefix: "THEME",
    metadata: { store_id: store.id, theme_id: theme.id, theme_name: theme.name },
  });
  if (!started.ok) return NextResponse.json({ error: started.error }, { status: started.status });
  if ("alreadyPaid" in started) return NextResponse.json({ alreadyPaid: true });
  return NextResponse.json({ authorization_url: started.authorizationUrl });
}

import { NextRequest, NextResponse } from "next/server";
import { invalidateStore } from "@/lib/store-cache";
import { THEME_PRICE_NGN } from "@/lib/features-shared";
import { canUseTheme } from "@/lib/theme-access";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { query } from "@/lib/db";
import { cacheDel, cacheKey } from "@/lib/redis";
import { cardStyleFor, getTheme, mergeTheme, parseCustomization } from "@/lib/themes";

const Schema = z.object({
  themeId: z.string().min(1).max(50),
  customization: z.unknown().optional(),
});

export async function PUT(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "No store" }, { status: 404 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const theme = getTheme(parsed.data.themeId);
  if (!theme) return NextResponse.json({ error: "Unknown theme" }, { status: 400 });
  if (!(await canUseTheme(store.id, theme.id))) {
    return NextResponse.json(
      { error: `${theme.name} is a premium theme. Buy it once for ₦${THEME_PRICE_NGN.toLocaleString("en-NG")} or upgrade to Pro for every theme.`, code: "plan_required", feature: "premium_themes" },
      { status: 403 }
    );
  }

  const customization = parseCustomization(parsed.data.customization);
  const resolved = mergeTheme(theme, customization);

  // The legacy columns are kept in sync so anything still reading them
  // (mobile app, older components) sees the same accent / font / style.
  await query(
    `UPDATE stores SET
       storefront_theme_id = $1,
       storefront_customization = $2::jsonb,
       storefront_accent_color = $3,
       storefront_font = $4,
       storefront_card_style = $5,
       storefront_theme_mode = $6,
       updated_at = NOW()
     WHERE id = $7`,
    [
      theme.id,
      JSON.stringify(customization),
      resolved.tokens.accent,
      resolved.tokens.bodyFont,
      cardStyleFor(resolved),
      resolved.tokens.mode === "auto" ? "both" : resolved.tokens.mode,
      store.id,
    ]
  );

  await cacheDel(cacheKey.storeMeta(store.slug));
  await invalidateStore(store.id, store.slug);

  return NextResponse.json({ ok: true, themeId: theme.id, customization });
}

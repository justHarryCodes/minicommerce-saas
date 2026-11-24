import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/auth";
import { getStoreFor } from "@/lib/access";
import { query, queryOne } from "@/lib/db";
import { invalidateStore } from "@/lib/store-cache";
import { requireFeature } from "@/lib/plan";
import { ensureGrowthSchema } from "@/lib/growth-schema";
import { parseAutomations } from "@/lib/growth-automations-shared";
import { parseReferralSettings } from "@/lib/growth-referrals-shared";
import { syncReferralPercent } from "@/lib/growth-referrals";

// Growth engine settings (owner only): the storefront welcome offer and the
// automatic follow-up emails and shopper referrals. Each part is optional, so
// the page saves one at a time.
const Body = z.object({
  welcomeEnabled: z.boolean().optional(),
  welcomePercent: z.number().int().min(1).max(50).optional(),
  welcomeHeadline: z.string().trim().max(80).optional().nullable(),
  automations: z
    .object({
      welcomeReminder: z.boolean().optional(),
      reviewRequest: z.boolean().optional(),
      winBack: z.boolean().optional(),
      winBackPercent: z.number().int().min(1).max(50).optional(),
    })
    .optional(),
  referrals: z
    .object({
      enabled: z.boolean().optional(),
      friendPercent: z.number().int().min(1).max(50).optional(),
      reward: z.number().int().min(100).max(100_000).optional(),
    })
    .optional(),
});

export async function PATCH(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "owner");
  if (!store) return NextResponse.json({ error: "Only the store owner can change this" }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Choose a discount between 1% and 50%" }, { status: 422 });
  const d = parsed.data;
  await ensureGrowthSchema();

  if (d.welcomeEnabled !== undefined || d.welcomePercent !== undefined || d.welcomeHeadline !== undefined) {
    // Welcome codes are discount codes: the plan must include coupons
    if (d.welcomeEnabled) {
      const denied = await requireFeature(store.id, "coupons");
      if (denied) return denied;
    }
    await query(
      `UPDATE stores SET
         welcome_offer_enabled = COALESCE($1, welcome_offer_enabled),
         welcome_offer_percent = COALESCE($2, welcome_offer_percent),
         welcome_offer_headline = CASE WHEN $3::boolean THEN $4 ELSE welcome_offer_headline END,
         updated_at = NOW()
       WHERE id = $5`,
      [d.welcomeEnabled ?? null, d.welcomePercent ?? null, d.welcomeHeadline !== undefined, d.welcomeHeadline || null, store.id],
    );
  }

  if (d.automations) {
    const denied = await requireFeature(store.id, "automations");
    if (denied) return denied;
    const current = await queryOne<{ growth_automations: unknown }>("SELECT growth_automations FROM stores WHERE id = $1", [store.id]);
    const next = { ...parseAutomations(current?.growth_automations), ...d.automations };
    await query(`UPDATE stores SET growth_automations = $1::jsonb, updated_at = NOW() WHERE id = $2`, [JSON.stringify(next), store.id]);
  }

  if (d.referrals) {
    const denied = await requireFeature(store.id, "shopper_referrals");
    if (denied) return denied;
    const current = await queryOne<{ referral_settings: unknown }>("SELECT referral_settings FROM stores WHERE id = $1", [store.id]);
    const before = parseReferralSettings(current?.referral_settings);
    const next = parseReferralSettings({ ...before, ...d.referrals });
    await query(`UPDATE stores SET referral_settings = $1::jsonb, updated_at = NOW() WHERE id = $2`, [JSON.stringify(next), store.id]);
    // Friend codes already shared follow the new discount
    if (next.friendPercent !== before.friendPercent) await syncReferralPercent(store.id, next.friendPercent);
  }

  await invalidateStore(store.id, store.slug);
  return NextResponse.json({ ok: true });
}

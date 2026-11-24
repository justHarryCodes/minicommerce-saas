// Shopper referrals (server). See growth-referrals-shared.ts for the idea.
import { randomInt } from "crypto";
import { query, queryOne, withTransaction } from "./db";
import { PHONE_KEY_SQL } from "./customers";
import { toNgInternational } from "./phone";
import { generateGiftCode } from "./gift-cards";
import { hasFeature } from "./plan";
import { storeAccent } from "./store-brand";
import { storeCanonicalBase } from "./seo";
import { clLogo } from "./cloudinary";
import { emailConfigured, sendEmail } from "./notify/providers";
import { ensureGrowthSchema } from "./growth-schema";
import { creditEarnedEmail, growthUnsubUrl, type StoreBrand } from "./growth-emails";
import { parseReferralSettings, referralLink, type ReferralSettings, type ReferralStats } from "./growth-referrals-shared";

export * from "./growth-referrals-shared";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** "ADA-K7P2": the buyer's first name (letters only, up to 6) and 4 random characters. */
export function referralCode(name: string | null | undefined): string {
  const word = (name ?? "").trim().split(/\s+/)[0]?.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "FRIEND";
  let tail = "";
  for (let i = 0; i < 4; i++) tail += ALPHABET[randomInt(ALPHABET.length)];
  return `${word}-${tail}`;
}

type StoreLite = { id: string; slug: string; name: string; custom_domain?: string | null; referral_settings?: unknown };

export async function referralSettingsFor(storeId: string): Promise<{ settings: ReferralSettings; active: boolean }> {
  await ensureGrowthSchema();
  const row = await queryOne<{ referral_settings: unknown }>("SELECT referral_settings FROM stores WHERE id = $1", [storeId]);
  const settings = parseReferralSettings(row?.referral_settings);
  return { settings, active: settings.enabled && (await hasFeature(storeId, "shopper_referrals")) };
}

/**
 * The buyer's referral code and link, made on first ask. Their code is also a
 * coupon (kind 'referral') the friend types or gets filled in at checkout.
 */
export async function ensureReferrer(store: StoreLite, buyer: { phone: string; name?: string | null; email?: string | null }, settings: ReferralSettings): Promise<{ id: string; code: string; link: string } | null> {
  const phoneKey = toNgInternational(buyer.phone);
  if (!phoneKey) return null;
  await ensureGrowthSchema();
  const existing = await queryOne<{ id: string; code: string }>("SELECT id, code FROM shopper_referrers WHERE store_id = $1 AND phone_key = $2", [store.id, phoneKey]);
  const base = storeCanonicalBase(store as never);
  if (existing) {
    if (buyer.email) await query("UPDATE shopper_referrers SET email = COALESCE(email, $2) WHERE id = $1", [existing.id, buyer.email.trim().toLowerCase()]);
    return { ...existing, link: referralLink(base, existing.code) };
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = referralCode(buyer.name);
    const taken = await queryOne("SELECT 1 FROM coupons WHERE store_id = $1 AND code = $2", [store.id, code]);
    if (taken) continue;
    const row = await queryOne<{ id: string }>(
      `INSERT INTO shopper_referrers (store_id, phone_key, name, email, code) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING RETURNING id`,
      [store.id, phoneKey, buyer.name?.trim() || null, buyer.email?.trim().toLowerCase() || null, code],
    );
    if (!row) {
      // Lost a race for this phone: use theirs
      const again = await queryOne<{ id: string; code: string }>("SELECT id, code FROM shopper_referrers WHERE store_id = $1 AND phone_key = $2", [store.id, phoneKey]);
      if (again) return { ...again, link: referralLink(base, again.code) };
      continue;
    }
    await query(
      `INSERT INTO coupons (store_id, code, discount_type, discount_value, min_order_amount, max_uses, kind)
       VALUES ($1, $2, 'percentage', $3, 0, NULL, 'referral')`,
      [store.id, code, settings.friendPercent],
    );
    return { id: row.id, code, link: referralLink(base, code) };
  }
  return null;
}

/**
 * At checkout: is this a referral code, and may this buyer use it?
 * Returns null when the code isn't a referral code at all.
 */
export async function checkReferralUse(storeId: string, code: string, buyerPhone: string): Promise<{ ok: true; referrerId: string; friendPhoneKey: string } | { ok: false; error: string } | null> {
  await ensureGrowthSchema();
  const ref = await queryOne<{ id: string; phone_key: string }>("SELECT id, phone_key FROM shopper_referrers WHERE store_id = $1 AND code = $2", [storeId, code.trim().toUpperCase()]);
  if (!ref) return null;
  if (!(await hasFeature(storeId, "shopper_referrals"))) return { ok: false, error: "This friend code isn't active right now" };
  const friend = toNgInternational(buyerPhone) ?? buyerPhone.replace(/\D/g, "");
  if (friend === ref.phone_key) return { ok: false, error: "That's your own friend code. Share it with friends instead 💛" };
  const before = await queryOne(
    `SELECT 1 FROM orders o WHERE o.store_id = $1 AND o.order_status <> 'cancelled' AND ${PHONE_KEY_SQL} = $2 LIMIT 1`,
    [storeId, friend],
  );
  if (before) return { ok: false, error: "Friend codes are for first orders. Welcome back, though!" };
  return { ok: true, referrerId: ref.id, friendPhoneKey: friend };
}

export async function recordReferral(storeId: string, referrerId: string, orderId: string, friendPhoneKey: string): Promise<void> {
  await query(
    `INSERT INTO shopper_referrals (store_id, referrer_id, order_id, friend_phone_key) VALUES ($1, $2, $3, $4) ON CONFLICT (order_id) DO NOTHING`,
    [storeId, referrerId, orderId, friendPhoneKey],
  );
}

/** The friend's order was cancelled: no reward. */
export async function voidReferral(orderId: string): Promise<void> {
  await ensureGrowthSchema().catch(() => {});
  await query("UPDATE shopper_referrals SET status = 'void' WHERE order_id = $1 AND status = 'pending'", [orderId]).catch(() => {});
}

/**
 * The friend's order was delivered: the referrer earns store credit (added to
 * their one store-credit card, made on their first reward) and an email.
 */
export async function rewardReferral(orderId: string, storeId: string): Promise<{ reward: number } | null> {
  await ensureGrowthSchema();
  const { settings, active } = await referralSettingsFor(storeId);
  if (!active) return null;
  const result = await withTransaction(async (client) => {
    const r = (
      await client.query<{ id: string; referrer_id: string }>(
        `UPDATE shopper_referrals SET status = 'rewarded', reward = $3, rewarded_at = NOW()
         WHERE order_id = $1 AND store_id = $2 AND status = 'pending' RETURNING id, referrer_id`,
        [orderId, storeId, settings.reward],
      )
    ).rows[0];
    if (!r) return null;
    const referrer = (
      await client.query<{ id: string; name: string | null; email: string | null; phone_key: string; credit_card_id: string | null }>(
        "SELECT id, name, email, phone_key, credit_card_id FROM shopper_referrers WHERE id = $1 FOR UPDATE",
        [r.referrer_id],
      )
    ).rows[0];
    let cardId = referrer.credit_card_id;
    let code: string;
    let balance: number;
    const live = cardId
      ? (await client.query<{ code: string; balance: string }>("UPDATE gift_cards SET balance = balance + $2, is_active = true WHERE id = $1 RETURNING code, balance", [cardId, settings.reward])).rows[0]
      : undefined;
    if (live) {
      code = live.code;
      balance = Number(live.balance);
    } else {
      code = generateGiftCode();
      const card = (
        await client.query<{ id: string }>(
          `INSERT INTO gift_cards (store_id, code, kind, initial_amount, balance, recipient_name, recipient_phone, recipient_email, note, created_by)
           VALUES ($1, $2, 'store_credit', $3, $3, $4, $5, $6, 'Referral rewards', 'referrals') RETURNING id`,
          [storeId, code, settings.reward, referrer.name, referrer.phone_key, referrer.email],
        )
      ).rows[0];
      cardId = card.id;
      balance = settings.reward;
      await client.query("UPDATE shopper_referrers SET credit_card_id = $2 WHERE id = $1", [referrer.id, cardId]);
    }
    await client.query(
      `INSERT INTO gift_card_ledger (gift_card_id, order_id, change, balance_after, reason) VALUES ($1, $2, $3, $4, 'issued')`,
      [cardId, orderId, settings.reward, balance],
    );
    const friend = (await client.query<{ customer_name: string | null }>("SELECT customer_name FROM orders WHERE id = $1", [orderId])).rows[0];
    return { referrer, code, balance, friend: friend?.customer_name ?? null };
  });
  if (!result) return null;

  // Tell them (email only, if we have one and they haven't opted out)
  if (result.referrer.email && emailConfigured()) {
    const store = await queryOne<StoreLite & { logo_url: string | null; email: string | null; owner_email: string | null }>("SELECT * FROM stores WHERE id = $1", [storeId]);
    const unsub = await queryOne("SELECT 1 FROM growth_unsubscribes WHERE store_id = $1 AND email = lower($2)", [storeId, result.referrer.email]);
    if (store && !unsub) {
      const brand: StoreBrand = { name: store.name, accent: await storeAccent(store as never).catch(() => "#f59e0b"), logo: store.logo_url ? clLogo(store.logo_url) : null, url: storeCanonicalBase(store as never) };
      const unsubscribeUrl = growthUnsubUrl(storeId, result.referrer.email);
      const msg = creditEarnedEmail(brand, { name: result.referrer.name, reward: settings.reward, balance: result.balance, creditCode: result.code, friend: result.friend, unsubscribeUrl });
      await sendEmail(result.referrer.email, msg.subject, msg.html, store.email || store.owner_email || undefined, { unsubscribeUrl, fromName: `${store.name} via Duka` }).catch(() => null);
    }
  }
  return { reward: settings.reward };
}

/** The friend discount follows the store's setting (existing codes included). */
export async function syncReferralPercent(storeId: string, percent: number): Promise<void> {
  await query("UPDATE coupons SET discount_value = $2 WHERE store_id = $1 AND kind = 'referral'", [storeId, percent]);
}

export async function referralStats(storeId: string, days: number): Promise<ReferralStats> {
  await ensureGrowthSchema();
  const [totals, top] = await Promise.all([
    queryOne<{ referrers: number; orders: number; rewarded: number; paid: string; revenue: string }>(
      `SELECT
         (SELECT COUNT(*)::int FROM shopper_referrers WHERE store_id = $1) AS referrers,
         COUNT(r.id) FILTER (WHERE r.status <> 'void')::int AS orders,
         COUNT(r.id) FILTER (WHERE r.status = 'rewarded')::int AS rewarded,
         COALESCE(SUM(r.reward) FILTER (WHERE r.status = 'rewarded'), 0) AS paid,
         COALESCE(SUM(o.total) FILTER (WHERE r.status <> 'void'), 0) AS revenue
       FROM shopper_referrals r JOIN orders o ON o.id = r.order_id
       WHERE r.store_id = $1 AND r.created_at > NOW() - make_interval(days => $2::int)`,
      [storeId, days],
    ),
    query<{ name: string | null; code: string; friends: number; earned: string }>(
      `SELECT s.name, s.code, COUNT(r.id) FILTER (WHERE r.status <> 'void')::int AS friends, COALESCE(SUM(r.reward) FILTER (WHERE r.status = 'rewarded'), 0) AS earned
       FROM shopper_referrers s LEFT JOIN shopper_referrals r ON r.referrer_id = s.id
       WHERE s.store_id = $1 GROUP BY s.id HAVING COUNT(r.id) FILTER (WHERE r.status <> 'void') > 0
       ORDER BY friends DESC, earned DESC LIMIT 5`,
      [storeId],
    ),
  ]);
  return {
    referrers: totals?.referrers ?? 0,
    orders: totals?.orders ?? 0,
    rewarded: totals?.rewarded ?? 0,
    rewardsPaid: Number(totals?.paid ?? 0),
    revenue: Number(totals?.revenue ?? 0),
    top: top.map((t) => ({ name: t.name, code: t.code, friends: Number(t.friends), earned: Number(t.earned) })),
  };
}

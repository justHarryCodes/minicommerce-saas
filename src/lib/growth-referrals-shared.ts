// Shopper referrals (growth engine, phase 3). Client-safe settings.
//
// A buyer gets their own link and code (e.g. ADA-K7P2). A friend who orders
// with it gets friendPercent off their FIRST order; once that order is
// delivered, the buyer earns `reward` naira of store credit to spend at the
// same store. Pro ("shopper_referrals"); credit is spent like a gift card.

export interface ReferralSettings {
  enabled: boolean;
  friendPercent: number;
  reward: number;
}

export const REFERRAL_DEFAULTS: ReferralSettings = { enabled: false, friendPercent: 10, reward: 1000 };
export const REFERRAL_PERCENTS = [5, 10, 15, 20] as const;
export const REFERRAL_REWARDS = [500, 1000, 2000, 5000] as const;

export function parseReferralSettings(raw: unknown): ReferralSettings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const pct = Number(o.friendPercent);
  const reward = Number(o.reward);
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : REFERRAL_DEFAULTS.enabled,
    friendPercent: Number.isFinite(pct) && pct >= 1 && pct <= 50 ? Math.round(pct) : REFERRAL_DEFAULTS.friendPercent,
    reward: Number.isFinite(reward) && reward >= 100 && reward <= 100_000 ? Math.round(reward) : REFERRAL_DEFAULTS.reward,
  };
}

/** The link a buyer shares: the store with their code attached. */
export function referralLink(storeUrl: string, code: string): string {
  const u = new URL(storeUrl);
  u.searchParams.set("ref", code);
  u.searchParams.set("utm_source", "referral");
  return u.toString();
}

/** What the buyer sends their friends on WhatsApp. */
export function referralMessage(storeName: string, percent: number, link: string): string {
  return `I shop at ${storeName} and I think you'll love it 💛 Here's ${percent}% off your first order: ${link}`;
}

export interface ReferralStats {
  referrers: number;
  orders: number;
  rewarded: number;
  rewardsPaid: number;
  revenue: number;
  top: { name: string | null; code: string; friends: number; earned: number }[];
}

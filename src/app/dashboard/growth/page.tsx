import { verifySession } from "@/lib/auth";
import { getPageAccess } from "@/lib/access";
import { freeLimitsFor, getStoreFeatures } from "@/lib/plan";
import { growthStats, listContacts } from "@/lib/growth";
import { automationResults, parseAutomations } from "@/lib/growth-automations";
import { audienceCounts, listBroadcasts } from "@/lib/growth-broadcasts";
import { parseReferralSettings, referralStats } from "@/lib/growth-referrals";
import { query } from "@/lib/db";
import { getStoreUrl } from "@/lib/utils";
import { storeAccent } from "@/lib/store-brand";
import GrowthClient from "./GrowthClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Growth" };

const RANGES = [7, 30, 90] as const;

// The growth engine: reach -> capture -> convert -> bring back.
export default async function GrowthPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await verifySession();
  const { store } = await getPageAccess(user!, "owner");
  const limits = await freeLimitsFor(store.id);
  const asked = Number((await searchParams).range);
  // Free plan: the last 7 days (like Analytics); longer history is Pro
  const days = limits ? limits.analyticsDays : (RANGES as readonly number[]).includes(asked) ? asked : 30;

  const s = store as typeof store & { welcome_offer_enabled?: boolean; welcome_offer_percent?: number; welcome_offer_headline?: string | null; growth_automations?: unknown; referral_settings?: unknown };
  const [stats, contacts, features, results, audience, broadcasts, refStats, products, coupons, accent] = await Promise.all([
    growthStats(store.id, days),
    listContacts(store.id),
    getStoreFeatures(store.id),
    automationResults(store.id, days),
    audienceCounts(store.id),
    listBroadcasts(store.id),
    referralStats(store.id, days),
    // For the broadcast composer: products to feature and live codes to include
    query<{ id: string; name: string; price: string; image_url: string | null }>(
      "SELECT id, name, price, image_url FROM products WHERE store_id = $1 AND is_active ORDER BY is_featured DESC NULLS LAST, created_at DESC LIMIT 40",
      [store.id],
    ),
    query<{ id: string; code: string; discount_type: string; discount_value: string }>(
      "SELECT id, code, discount_type, discount_value FROM coupons WHERE store_id = $1 AND kind = 'standard' AND is_active AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY created_at DESC LIMIT 20",
      [store.id],
    ),
    // The store's brand colour: broadcast emails are sent in it
    storeAccent(store as never).catch(() => "#f59e0b"),
  ]);

  return (
    <GrowthClient
      store={{ name: store.name, slug: store.slug, url: getStoreUrl(store.slug, store.customDomain ?? store.custom_domain), accent }}
      stats={stats}
      contacts={contacts}
      days={days}
      limited={!!limits}
      couponsAllowed={features.has("coupons")}
      automations={{ allowed: features.has("automations"), settings: parseAutomations(s.growth_automations), results }}
      broadcasts={{
        allowed: features.has("broadcasts"),
        audience,
        history: broadcasts,
        products: products.map((p) => ({ id: p.id, name: p.name, price: Number(p.price), image: p.image_url })),
        coupons: coupons.map((c) => ({ id: c.id, code: c.code, label: c.discount_type === "percentage" ? `${Number(c.discount_value)}% off` : `₦${Number(c.discount_value).toLocaleString("en-NG")} off` })),
      }}
      referrals={{ allowed: features.has("shopper_referrals"), settings: parseReferralSettings(s.referral_settings), stats: refStats }}
      giftCardsAllowed={features.has("gift_cards")}
      welcome={{ enabled: !!s.welcome_offer_enabled, percent: Number(s.welcome_offer_percent ?? 10), headline: s.welcome_offer_headline ?? "" }}
    />
  );
}

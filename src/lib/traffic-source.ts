// Where a storefront visit came from. Browser-safe (no server imports).
// utm_source wins when present (merchants can tag links, e.g. ?utm_source=instagram);
// otherwise the referrer host is mapped to a channel. Note WhatsApp's in-app
// browser usually sends no referrer, so those visits land in "direct" unless
// the link is tagged.

export const SOURCES = ["whatsapp", "instagram", "facebook", "tiktok", "twitter", "google", "duka", "other", "direct"] as const;
export type TrafficSource = (typeof SOURCES)[number];

export const SOURCE_LABELS: Record<TrafficSource, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  twitter: "X / Twitter",
  google: "Google search",
  duka: "Duka marketplace",
  other: "Other websites",
  direct: "Direct / untagged",
};

const RULES: [RegExp, TrafficSource][] = [
  [/(^|\.)(whatsapp\.com|wa\.me)$|^whatsapp$/, "whatsapp"],
  [/(^|\.)(instagram\.com)$|^(ig|instagram)$/, "instagram"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$|^(fb|facebook)$/, "facebook"],
  [/(^|\.)(tiktok\.com)$|^tiktok$/, "tiktok"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$|^(twitter|x)$/, "twitter"],
  [/(^|\.)google\.[a-z.]+$|(^|\.)(bing\.com|duckduckgo\.com|yahoo\.com)$|^google$/, "google"],
  [/(^|\.)(dukanigeria\.com|awarizonmall\.com)$|^duka$/, "duka"],
];

export function classifySource(input: { utmSource?: string | null; referrer?: string | null; ownHost?: string | null }): TrafficSource {
  const utm = input.utmSource?.trim().toLowerCase();
  if (utm) {
    for (const [re, src] of RULES) if (re.test(utm)) return src;
    return "other";
  }
  let host = "";
  try {
    host = input.referrer ? new URL(input.referrer).hostname.toLowerCase().replace(/^www\./, "") : "";
  } catch {
    host = "";
  }
  if (!host) return "direct";
  // Moving around inside the store itself isn't a new source
  const own = input.ownHost?.toLowerCase().replace(/^www\./, "");
  if (own && host === own) return "direct";
  for (const [re, src] of RULES) if (re.test(host)) return src;
  return "other";
}

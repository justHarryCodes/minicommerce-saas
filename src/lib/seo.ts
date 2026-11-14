// Search engine helpers: canonical URLs and schema.org structured data.
//
// Every store gets these for free. The structured data is what makes a
// product eligible for Google's product rich results (price, stock, rating
// stars, shipping and returns under the link) and its free Shopping
// listings, even without a Merchant Center feed.
//
// Rules we follow (Google's merchant listing guidelines): only state what
// the store has really told us. No shipping rate unless we know it, no
// return window unless the policy says one, no rating without reviews.

import { getStoreUrl } from "@/lib/utils";
import { deliveryDays } from "@/lib/delivery-estimate";
import { clCrawler } from "@/lib/cloudinary";
import type { Product, ProductSize, Store } from "@/types";

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://dukanigeria.com").replace(/\/$/, "");
}

/** The store's one official address: its custom domain if live, else its subdomain. Always absolute. */
export function storeCanonicalBase(store: Pick<Store, "slug"> & { custom_domain?: string | null }): string {
  const url = getStoreUrl(store.slug, store.custom_domain ?? null);
  return url.startsWith("http") ? url.replace(/\/$/, "") : `${appUrl()}${url}`;
}

/** Plain text for meta descriptions: no markup, one line, cut at a word. */
export function metaText(input: string | null | undefined, max = 160): string {
  const t = (input ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`>~[\]]/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

/** Safe to drop inside <script type="application/ld+json">. */
export function jsonLd(data: unknown): string {
  // "<" and the two JS line-separator characters (U+2028/9) could break out of the tag
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .split(String.fromCharCode(0x2028)).join("\\u2028")
    .split(String.fromCharCode(0x2029)).join("\\u2029");
}

const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
const SCHEMA = "https://schema.org/";

/* ───────────────────────────── Returns ───────────────────────────── */

/**
 * The store's written return policy as schema.org, when it's clear enough:
 * "no returns" or "returns within N days". Anything vaguer is left out
 * rather than guessed.
 */
export function returnPolicyLd(text: string | null | undefined) {
  const t = (text ?? "").toLowerCase();
  if (!t.trim()) return null;
  const base = { "@type": "MerchantReturnPolicy", applicableCountry: "NG" };
  if (/\b(no|not accept(?:ing)?|don'?t accept|do not accept)\s+(returns?|refunds?|exchanges?)\b|\bno refund|\bnon[- ]?refundable|\ball sales? (?:are )?final\b/.test(t)) {
    return { ...base, returnPolicyCategory: `${SCHEMA}MerchantReturnNotPermitted` };
  }
  const days = t.match(/(\d{1,3})\s*(?:-|to)?\s*(?:working |business )?days?/);
  const n = days ? Number(days[1]) : 0;
  if (n > 0 && n <= 365) {
    return {
      ...base,
      returnPolicyCategory: `${SCHEMA}MerchantReturnFiniteReturnWindow`,
      merchantReturnDays: n,
      returnMethod: `${SCHEMA}ReturnByMail`,
    };
  }
  return null;
}

/* ───────────────────────────── Shipping ──────────────────────────── */

type ShippingStore = Pick<Store, "delivery_time_frame"> & { free_delivery_threshold?: number | string | null; delivery_zones?: unknown };

/** Delivery fees the store charges, from its delivery zones. */
function zoneFees(store: ShippingStore): number[] {
  const zones = Array.isArray(store.delivery_zones) ? (store.delivery_zones as { fee?: unknown }[]) : [];
  return zones.map((z) => Number(z?.fee)).filter((f) => Number.isFinite(f) && f >= 0);
}

/**
 * Shipping to Nigeria. The rate is only stated when it's certain for this
 * price: free delivery over the store's threshold, or every zone costs the
 * same. Delivery time comes from the store's "1-3 days" estimate.
 */
export function shippingLd(store: ShippingStore, price: number) {
  const days = deliveryDays(store.delivery_time_frame);
  const threshold = Number(store.free_delivery_threshold ?? 0);
  const fees = [...new Set(zoneFees(store))];
  const rate = threshold > 0 && price >= threshold ? 0 : fees.length === 1 ? fees[0] : null;
  if (rate === null && !days) return null;
  return {
    "@type": "OfferShippingDetails",
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "NG" },
    ...(rate !== null ? { shippingRate: { "@type": "MonetaryAmount", value: money(rate), currency: "NGN" } } : {}),
    ...(days
      ? {
          deliveryTime: {
            "@type": "ShippingDeliveryTime",
            handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: Math.min(1, days[1]), unitCode: "DAY" },
            transitTime: { "@type": "QuantitativeValue", minValue: days[0], maxValue: days[1], unitCode: "DAY" },
          },
        }
      : {}),
  };
}

/* ───────────────────────────── Products ──────────────────────────── */

export interface LdReview {
  customer_name: string | null;
  rating: number;
  body: string | null;
  created_at: string | Date;
}

const USED = /\b(uk[- ]?used|tokunbo|fairly[- ]used|pre[- ]?owned|second[- ]?hand|used)\b/i;
const REFURB = /\b(refurbished|renewed)\b/i;

function condition(p: Product): string {
  const t = `${p.name} ${p.short_description ?? ""}`;
  if (REFURB.test(t)) return `${SCHEMA}RefurbishedCondition`;
  if (USED.test(t)) return `${SCHEMA}UsedCondition`;
  return `${SCHEMA}NewCondition`;
}

function availability(stock: number, p: Product, store: { allow_preorders?: boolean | null }, today: string): string {
  if (p.is_bookable) return `${SCHEMA}InStock`;
  if (p.sold_out_until && p.sold_out_until >= today) return `${SCHEMA}OutOfStock`;
  if (stock > 0) return `${SCHEMA}InStock`;
  return store.allow_preorders ? `${SCHEMA}PreOrder` : `${SCHEMA}OutOfStock`;
}

// Option names vendors use → the schema.org property Google reads for variants.
const VARIES: Record<string, string> = { size: "size", colour: "color", color: "color", material: "material", pattern: "pattern" };

/**
 * Product (or ProductGroup, when it has variants) structured data.
 * `today` is the Lagos date YYYY-MM-DD, for sold-out-until-date foods.
 */
export function productLd(opts: {
  store: Store;
  product: Product & { brand?: string | null; gtin?: string | null };
  url: string;
  rating?: [number, number] | null;
  reviews?: LdReview[];
  today: string;
}) {
  const { store, product: p, url, rating, reviews = [], today } = opts;
  const base = storeCanonicalBase(store);
  const images = [...new Set([p.image_url, ...(p.images ?? [])].filter((u): u is string => !!u))].map(clCrawler);
  const price = Number(p.price);
  const compare = Number(p.compare_price ?? 0);
  const seller = { "@type": "Organization", name: store.name, url: base };
  const ship = shippingLd(store as ShippingStore, price);
  const returns = returnPolicyLd(store.return_policy);
  const description = metaText(p.description || p.short_description, 5000) || undefined;

  const offer = (amount: number, stock: number, extra: Record<string, unknown> = {}) => ({
    "@type": "Offer",
    url,
    price: money(amount),
    priceCurrency: "NGN",
    ...(compare > amount
      ? {
          priceSpecification: [
            { "@type": "UnitPriceSpecification", price: money(amount), priceCurrency: "NGN" },
            { "@type": "UnitPriceSpecification", priceType: `${SCHEMA}StrikethroughPrice`, price: money(compare), priceCurrency: "NGN" },
          ],
        }
      : {}),
    availability: availability(stock, p, store, today),
    itemCondition: condition(p),
    seller,
    ...(ship ? { shippingDetails: ship } : {}),
    ...(returns ? { hasMerchantReturnPolicy: returns } : {}),
    ...extra,
  });

  const ratingLd =
    rating && rating[1] > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating[0], reviewCount: rating[1], bestRating: 5, worstRating: 1 } }
      : {};
  const reviewLd = reviews.length
    ? {
        review: reviews.slice(0, 5).map((r) => ({
          "@type": "Review",
          author: { "@type": "Person", name: (r.customer_name || "Verified buyer").trim().slice(0, 60) },
          datePublished: new Date(r.created_at).toISOString().slice(0, 10),
          reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
          ...(r.body ? { reviewBody: metaText(r.body, 1000) } : {}),
        })),
      }
    : {};

  const common = {
    name: p.name,
    ...(description ? { description } : {}),
    ...(images.length ? { image: images } : {}),
    brand: { "@type": "Brand", name: p.brand || store.name },
    ...(p.category_name && p.category_slug !== "uncategorized" ? { category: p.category_name } : {}),
    ...ratingLd,
    ...reviewLd,
  };

  const sizes = (p.sizes ?? []) as ProductSize[];
  if (sizes.length >= 2) {
    const keys = [...new Set(sizes.flatMap((s) => Object.keys(s.options ?? {})))];
    const varies = [...new Set(keys.map((k) => VARIES[k.toLowerCase()]).filter(Boolean))];
    return {
      "@context": "https://schema.org",
      "@type": "ProductGroup",
      "@id": `${url}#product`,
      url,
      productGroupID: p.id,
      ...common,
      ...(varies.length ? { variesBy: varies.map((v) => `${SCHEMA}${v}`) } : {}),
      hasVariant: sizes.map((s, i) => {
        const props: Record<string, string> = {};
        for (const [k, v] of Object.entries(s.options ?? {})) {
          const prop = VARIES[k.toLowerCase()];
          if (prop && v) props[prop] = v;
        }
        if (!Object.keys(props).length && s.label) props.size = s.label;
        const vImage = clCrawler(s.image_url || s.imageUrl);
        return {
          "@type": "Product",
          name: `${p.name} - ${s.label}`,
          sku: s.sku || `${p.id}-${s.id ?? i}`,
          ...(vImage ? { image: vImage } : images[0] ? { image: images[0] } : {}),
          ...props,
          offers: offer(s.price != null && Number(s.price) > 0 ? Number(s.price) : price, Number(s.stock_quantity ?? 0), {
            url: `${url}?variant=${encodeURIComponent(s.id ?? String(i))}`,
          }),
        };
      }),
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    url,
    sku: p.id,
    ...(p.gtin ? { gtin: p.gtin } : {}),
    ...common,
    offers: offer(price, Number(p.stock_quantity ?? 0)),
  };
}

/* ─────────────────────────── Store & site ────────────────────────── */

/** The store as an online shop (Google's Organization / OnlineStore markup), plus its website. */
export function storeLd(store: Store) {
  const base = storeCanonicalBase(store);
  const returns = returnPolicyLd(store.return_policy);
  const phone = store.phone || store.whatsapp;
  // A public pickup point is the only street address a store publishes
  const pickup = store as { pickup_enabled?: boolean | null; pickup_address?: string | null };
  const street = pickup.pickup_enabled && pickup.pickup_address ? pickup.pickup_address.trim() : null;
  return [
    {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      "@id": `${base}/#store`,
      name: store.name,
      url: `${base}/`,
      ...(store.logo_url ? { logo: clCrawler(store.logo_url), image: clCrawler(store.logo_url) } : {}),
      ...(store.description ? { description: metaText(store.description, 500) } : {}),
      ...(phone ? { telephone: phone } : {}),
      address: { "@type": "PostalAddress", ...(street ? { streetAddress: street } : {}), addressCountry: "NG" },
      ...(returns ? { hasMerchantReturnPolicy: returns } : {}),
      ...(store.created_at ? { foundingDate: new Date(store.created_at).toISOString().slice(0, 10) } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${base}/#website`,
      name: store.name,
      url: `${base}/`,
      publisher: { "@id": `${base}/#store` },
      inLanguage: "en-NG",
    },
  ];
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

/** Duka itself, for the platform homepage. */
export function platformLd() {
  const base = appUrl();
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${base}/#organization`,
      name: "Duka",
      alternateName: "Duka by Awarizon",
      url: `${base}/`,
      logo: `${base}/icons/icon-512.png`,
      email: "support@dukanigeria.com",
      sameAs: ["https://play.google.com/store/apps/details?id=com.awarizon.dukavendors"],
      areaServed: "NG",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${base}/#website`,
      name: "Duka",
      url: `${base}/`,
      publisher: { "@id": `${base}/#organization` },
      inLanguage: "en-NG",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Duka for Vendors",
      operatingSystem: "Android, Web",
      applicationCategory: "BusinessApplication",
      offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
      url: "https://play.google.com/store/apps/details?id=com.awarizon.dukavendors",
      publisher: { "@id": `${base}/#organization` },
    },
  ];
}

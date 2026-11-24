// Growth engine: client-safe pieces (dashboard + storefront share these).
//
// The engine runs a simple loop for each store:
//   Reach    tracked share links, so a vendor sees which channel brings BUYERS
//   Capture  a welcome offer turns anonymous visitors into contacts (with consent)
//   Convert  each sign-up gets a one-time code for their first order
//   Return   (phase 2, Pro) automatic follow-ups bring buyers back
// Marketing goes out by email or from the vendor's own WhatsApp; never SMS.

import type { TrafficSource } from "./traffic-source";

export const WELCOME_PERCENTS = [5, 10, 15, 20] as const;
export const WELCOME_DEFAULT_PERCENT = 10;
export const WELCOME_CODE_DAYS = 30;

export function welcomeHeadline(percent: number, custom?: string | null): string {
  return custom?.trim() || `Get ${percent}% off your first order`;
}

/** The channels a vendor shares on, each with its own tracked link. */
export const SHARE_CHANNELS: { source: TrafficSource; label: string; hint: string; color: string }[] = [
  { source: "whatsapp", label: "WhatsApp", hint: "Status, chats and groups", color: "#25D366" },
  { source: "instagram", label: "Instagram", hint: "Bio, stories and DMs", color: "#E1306C" },
  { source: "tiktok", label: "TikTok", hint: "Bio and video captions", color: "#111111" },
  { source: "facebook", label: "Facebook", hint: "Page, posts and groups", color: "#1877F2" },
  { source: "twitter", label: "X / Twitter", hint: "Bio and posts", color: "#0F1419" },
];

/** The store link tagged for one channel (the storefront's VisitTracker reads utm_source). */
export function trackedLink(storeUrl: string, source: TrafficSource): string {
  const u = new URL(storeUrl);
  u.searchParams.set("utm_source", source);
  return u.toString();
}

export interface GrowthStats {
  days: number;
  visitors: number;
  newContacts: number;
  firstOrders: number;
  returningBuyers: number;
  repeatRate: number; // % of all buyers who ordered more than once
  revenue: number;
  returningRevenue: number;
  channels: { source: string; visitors: number; orders: number; buyers: number; revenue: number }[];
  welcome: { issued: number; used: number; revenue: number };
  totalContacts: number;
}

export interface ContactRow {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  source: "welcome" | "checkout" | "manual";
  first_source: string | null;
  created_at: string;
  unsubscribed_at: string | null;
  orders: number;
  spent: number;
  code: string | null;
  code_used: boolean;
}

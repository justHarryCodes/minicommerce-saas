// Duka Vendor Grant & Support Fund: client-safe types and rules.

export type GrantStatus = "unverified" | "submitted" | "shortlisted" | "selected" | "rejected";

export interface GrantRound {
  id: string;
  title: string;
  amount: number;
  min_products: number;
  is_open: boolean;
  closes_at: string | null;
  created_at: string;
}

/** Applications are accepted while the round is switched on and the countdown hasn't run out. */
export function roundAcceptsApplications(r: Pick<GrantRound, "is_open" | "closes_at"> | null, now = new Date()): boolean {
  return !!r && r.is_open && (!r.closes_at || new Date(r.closes_at) > now);
}

export const STATUS_LABEL: Record<GrantStatus, string> = {
  unverified: "Email not confirmed",
  submitted: "Submitted",
  shortlisted: "Shortlisted",
  selected: "Selected",
  rejected: "Not selected",
};

export const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

/** What a store needs before it can apply (shown on /grant and checked automatically). */
export function grantRequirements(minProducts: number): { title: string; detail: string }[] {
  return [
    { title: `At least ${minProducts} different products`, detail: "Live, with real photos and prices. The same product listed twice counts once." },
    { title: "A business logo", detail: "Uploaded in your store settings." },
    { title: "A store description", detail: "A short line telling shoppers what you sell." },
    { title: "A phone or WhatsApp number", detail: "So customers (and we) can reach you." },
    { title: "A way to get paid", detail: "Duka Pay switched on, or your bank details added." },
    { title: "Your Duka login email", detail: "We email a link there to confirm the store is yours." },
  ];
}

/** The terms applicants agree to (shown on /grant). The amount is shown on the form, per round. */
export function grantTerms(minProducts: number): string[] {
  return [
    "You must own an active Duka store. Only the store owner can apply.",
    `Your store must be properly set up: at least ${minProducts} different live products with real photos and prices, a business logo, a store description, a phone or WhatsApp number, and Duka Pay or bank details. This is checked automatically when you apply and again when you confirm. Applications from stores that aren't set up are not accepted.`,
    "Sales are not a criterion. New and growing stores are just as welcome as established ones.",
    "Apply with the email address you use to log in to Duka (or your store's contact email in Settings). We send a confirmation link there to make sure the store is yours. Unconfirmed applications are not reviewed.",
    "One application per store in each funding round.",
    "Placeholder, copied or duplicate products, or running more than one store to increase your chances, will lead to disqualification.",
    "One business is selected in each round. The support amount for the round is shown on the application form and may change from round to round. Support may be paid to the store owner's bank account on file, or spent on stock, packaging, marketing or other agreed business needs.",
    "Selected merchants may be asked for more information about their business, and agree that Duka can share their story (with their approval).",
    "Duka's selection is final. Duka may change, pause or end the programme, the support amount or these terms at any time.",
  ];
}

/** Parts of a store address people paste: "kemi.dukanigeria.com/products/x", "dukanigeria.com/store/kemi", "kemi", "shop.kemi.com". */
export function parseStoreLink(raw: string, rootDomain: string): { slug?: string; domain?: string } | null {
  let s = raw.trim().toLowerCase();
  if (!s) return null;
  if (/^[a-z0-9-]{2,63}$/.test(s)) return { slug: s };
  if (!/^https?:\/\//.test(s)) s = `https://${s}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  const root = rootDomain.toLowerCase().replace(/^www\./, "");
  if (host === root) {
    const m = u.pathname.match(/^\/store\/([a-z0-9-]+)/);
    return m ? { slug: m[1] } : null;
  }
  if (host.endsWith(`.${root}`)) {
    const sub = host.slice(0, -(root.length + 1));
    return /^[a-z0-9-]+$/.test(sub) ? { slug: sub } : null;
  }
  return host.includes(".") ? { domain: host } : null;
}

/** "kemi@gmail.com" -> "k***@gmail.com" (shown after applying). */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user.slice(0, 1)}${"*".repeat(Math.max(2, Math.min(6, user.length - 1)))}@${domain}`;
}

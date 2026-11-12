// Plan pricing: monthly, or yearly at a discount (admin setting, default 20%).
// Client-safe — the billing page, the pricing page and the server all price
// from here, so what a vendor sees is exactly what Paystack charges.

export type BillingCycle = "monthly" | "yearly";

export const DEFAULT_YEARLY_DISCOUNT = 20;
const MAX_YEARLY_DISCOUNT = 50;

export function isBillingCycle(v: unknown): v is BillingCycle {
  return v === "monthly" || v === "yearly";
}

/** A sane percentage: 0–50, whole numbers. */
export function clampDiscount(pct: unknown): number {
  const n = Math.round(Number(pct));
  if (!Number.isFinite(n)) return DEFAULT_YEARLY_DISCOUNT;
  return Math.min(MAX_YEARLY_DISCOUNT, Math.max(0, n));
}

/** One year, paid upfront: 12 months less the discount, to the naira. */
export function yearlyPrice(monthly: number, discountPct: number): number {
  return Math.round(Number(monthly) * 12 * (1 - clampDiscount(discountPct) / 100));
}

/** What one billing period costs. */
export function priceFor(monthly: number, cycle: BillingCycle, discountPct: number): number {
  return cycle === "yearly" ? yearlyPrice(monthly, discountPct) : Math.round(Number(monthly));
}

/** Naira saved by paying yearly instead of 12 monthly payments. */
export function yearlySavings(monthly: number, discountPct: number): number {
  return Math.round(Number(monthly) * 12) - yearlyPrice(monthly, discountPct);
}

/** Yearly price spread over 12 months, for "₦8,000/mo billed yearly". */
export function yearlyPerMonth(monthly: number, discountPct: number): number {
  return Math.round(yearlyPrice(monthly, discountPct) / 12);
}

export function cycleMonths(cycle: BillingCycle): number {
  return cycle === "yearly" ? 12 : 1;
}

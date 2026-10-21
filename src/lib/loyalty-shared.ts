// Client-safe loyalty maths.

export interface LoyaltySettings {
  everyN: number
  percent: number
}

export interface LoyaltyStatus {
  /** This order is the rewarded one */
  eligible: boolean
  /** Orders still to place before the reward (0 when eligible) */
  remaining: number
}

export function loyaltySettingsOf(store: Record<string, unknown>): LoyaltySettings | null {
  const n = Number(store.loyalty_every_n ?? store.loyaltyEveryN)
  const pct = Number(store.loyalty_percent ?? store.loyaltyPercent ?? 10)
  if (!Number.isInteger(n) || n < 2) return null
  if (!(pct >= 1 && pct <= 90)) return null
  return { everyN: n, percent: pct }
}

/** With `previous` qualifying orders, is the next one the Nth? */
export function loyaltyStatus(previous: number, everyN: number): LoyaltyStatus {
  const position = (previous % everyN) + 1 // 1..N for the order being placed
  return position === everyN ? { eligible: true, remaining: 0 } : { eligible: false, remaining: everyN - position }
}

/** Reward on goods after any coupon, rounded to the naira. */
export function loyaltyDiscount(goodsAfterCoupon: number, percent: number): number {
  return Math.max(0, Math.round((Math.max(0, goodsAfterCoupon) * percent) / 100))
}

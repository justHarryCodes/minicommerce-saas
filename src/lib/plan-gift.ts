// Duka admins can gift a paid plan (Pro, Business, …) for a set number of
// months. Pure date maths here so it can be tested; the admin vendor API
// applies it. When a gift runs out, getEffectivePlan falls back to Free.

export const GIFT_MONTHS = [1, 3, 6, 12] as const
export type GiftMonths = (typeof GIFT_MONTHS)[number]

/** Add calendar months; a 31st that doesn't exist lands on the month's last day. */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return d
}

/**
 * When the gifted plan starts and ends. Gifting the plan the store already
 * has (still running) adds the months on top; a different plan starts now.
 */
export function giftPeriod(
  current: { planId: string | null; expiresAt: Date | string | null },
  planId: string,
  months: GiftMonths,
  now = new Date()
): { startsAt: Date; expiresAt: Date; extended: boolean } {
  const end = current.expiresAt ? new Date(current.expiresAt) : null
  const extended = current.planId === planId && !!end && end > now
  const startsAt = extended ? end! : now
  return { startsAt, expiresAt: addMonths(startsAt, months), extended }
}

// Loyalty: every Nth completed order from the same phone number gets X% off.
import { queryOne } from './db'
import { PHONE_KEY_SQL } from './customers'
import { toNgInternational } from './phone'
import { hasFeature } from './plan'
import { loyaltyStatus, loyaltySettingsOf, type LoyaltySettings, type LoyaltyStatus } from './loyalty-shared'

export * from './loyalty-shared'

/** Earlier orders that count: paid (or part-paid) or delivered, never cancelled. */
export async function qualifyingOrderCount(storeId: string, phone: string): Promise<number> {
  const key = toNgInternational(phone) ?? phone.replace(/\D/g, '')
  if (!key) return 0
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM orders o
     WHERE o.store_id = $1 AND ${PHONE_KEY_SQL} = $2
       AND o.order_status <> 'cancelled'
       AND (o.payment_status IN ('paid', 'deposit_paid') OR o.order_status = 'delivered')`,
    [storeId, key]
  )
  return row?.n ?? 0
}

export async function loyaltyFor(
  store: { id: string } & Record<string, unknown>,
  phone: string
): Promise<(LoyaltyStatus & LoyaltySettings) | null> {
  const settings = loyaltySettingsOf(store)
  if (!settings) return null
  if (!(await hasFeature(store.id, 'loyalty'))) return null
  const count = await qualifyingOrderCount(store.id, phone)
  return { ...settings, ...loyaltyStatus(count, settings.everyN) }
}

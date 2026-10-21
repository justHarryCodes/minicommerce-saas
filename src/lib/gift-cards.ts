// Gift cards & store credit. A card's balance only changes inside a
// transaction that also writes a ledger row, so every naira is traceable.
import { randomInt } from 'crypto'
import type { PoolClient } from 'pg'
import { queryOne, withTransaction } from './db'
import { formatGiftCode, normaliseGiftCode } from './gift-cards-shared'
import { hasFeature } from './plan'

export { formatGiftCode, normaliseGiftCode, giftCardCovers } from './gift-cards-shared'

// No 0/O, 1/I/L — codes get read out over the phone and typed on phones.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateGiftCode(): string {
  let raw = ''
  for (let i = 0; i < 12; i++) raw += ALPHABET[randomInt(ALPHABET.length)]
  return formatGiftCode(raw)
}

export interface GiftCardRow {
  id: string
  code: string
  kind: 'gift_card' | 'store_credit'
  initial_amount: number
  balance: number
  recipient_name: string | null
  recipient_phone: string | null
  recipient_email: string | null
  note: string | null
  expires_at: string | Date | null
  is_active: boolean
  created_at: string | Date
}

export type GiftCardCheck =
  | { ok: true; id: string; code: string; balance: number }
  | { ok: false; error: string }

/** Lagos calendar date — expiry is inclusive of the printed day. */
function lagosToday(now = new Date()): string {
  return new Date(now.getTime() + 3_600_000).toISOString().slice(0, 10)
}

function isoDay(v: string | Date): string {
  if (typeof v === 'string') return v.slice(0, 10)
  return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
}

export function giftCardUsable(card: Pick<GiftCardRow, 'is_active' | 'balance' | 'expires_at'>, now = new Date()): string | null {
  if (!card.is_active) return 'This gift card has been disabled'
  if (card.expires_at && isoDay(card.expires_at) < lagosToday(now)) return 'This gift card has expired'
  if (Number(card.balance) <= 0) return 'This gift card has no balance left'
  return null
}

export async function checkGiftCard(storeId: string, rawCode: string): Promise<GiftCardCheck> {
  const code = normaliseGiftCode(rawCode)
  if (code.length < 6) return { ok: false, error: 'Enter the full gift card code' }
  if (!(await hasFeature(storeId, 'gift_cards'))) return { ok: false, error: "Gift cards can't be used at this store right now" }
  const card = await queryOne<GiftCardRow>(
    'SELECT * FROM gift_cards WHERE store_id = $1 AND code = $2',
    [storeId, formatGiftCode(code)]
  )
  if (!card) return { ok: false, error: "We couldn't find that gift card" }
  const problem = giftCardUsable(card)
  if (problem) return { ok: false, error: problem }
  return { ok: true, id: card.id, code: card.code, balance: Number(card.balance) }
}

export class GiftCardBalanceError extends Error {}

/** Take `amount` off a card inside the order transaction (fails if it was spent meanwhile). */
export async function redeemGiftCard(client: PoolClient, cardId: string, amount: number, orderId: string): Promise<number> {
  const res = await client.query<{ balance: string }>(
    `UPDATE gift_cards SET balance = balance - $2
     WHERE id = $1 AND is_active = true AND balance >= $2
     RETURNING balance`,
    [cardId, amount]
  )
  if (!res.rows.length) throw new GiftCardBalanceError('Your gift card balance changed — please re-apply it')
  const after = Number(res.rows[0].balance)
  await client.query(
    `INSERT INTO gift_card_ledger (gift_card_id, order_id, change, balance_after, reason) VALUES ($1, $2, $3, $4, 'redeemed')`,
    [cardId, orderId, -amount, after]
  )
  return after
}

/** Cancelled order: put the gift card amount back, once. */
export async function refundGiftCardForOrder(orderId: string, storeId: string): Promise<number> {
  return withTransaction(async (client) => {
    const o = await client.query<{ gift_card_code: string | null; gift_card_amount: string }>(
      `UPDATE orders SET gift_card_restored_at = NOW()
       WHERE id = $1 AND store_id = $2 AND gift_card_restored_at IS NULL
         AND gift_card_code IS NOT NULL AND gift_card_amount > 0
       RETURNING gift_card_code, gift_card_amount`,
      [orderId, storeId]
    )
    if (!o.rows.length) return 0
    const amount = Number(o.rows[0].gift_card_amount)
    const card = await client.query<{ id: string; balance: string }>(
      'UPDATE gift_cards SET balance = balance + $3 WHERE store_id = $1 AND code = $2 RETURNING id, balance',
      [storeId, o.rows[0].gift_card_code, amount]
    )
    if (!card.rows.length) return 0
    await client.query(
      `INSERT INTO gift_card_ledger (gift_card_id, order_id, change, balance_after, reason) VALUES ($1, $2, $3, $4, 'refunded')`,
      [card.rows[0].id, orderId, amount, Number(card.rows[0].balance)]
    )
    return amount
  })
}

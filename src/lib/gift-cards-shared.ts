// Client-safe gift card helpers.

/** "gift-abcd 2345efgh" → "ABCD2345EFGH" (the GIFT prefix is optional when typing). */
export function normaliseGiftCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^GIFT/, '').slice(0, 24)
}

/** "ABCD2345EFGH" → "GIFT-ABCD-2345-EFGH" */
export function formatGiftCode(raw: string): string {
  const c = normaliseGiftCode(raw)
  return ['GIFT', ...(c.match(/.{1,4}/g) ?? [])].join('-')
}

/** How much of `due` a card with `balance` pays. */
export function giftCardCovers(balance: number, due: number): number {
  return Math.max(0, Math.min(Math.round(balance), Math.round(due)))
}

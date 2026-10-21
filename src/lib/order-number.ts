import { randomInt } from 'crypto'

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/**
 * Order numbers are unique across every store. A bare millisecond timestamp
 * let two shops collide when they took an order at the same moment (one
 * checkout then failed), so a random suffix is added: e.g. ORD-MH3K2A1B-X7Q4KD.
 */
export function newOrderNumber(prefix: 'ORD' | 'POS' = 'ORD'): string {
  let suffix = ''
  for (let i = 0; i < 6; i++) suffix += ALPHABET[randomInt(ALPHABET.length)]
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${suffix}`
}

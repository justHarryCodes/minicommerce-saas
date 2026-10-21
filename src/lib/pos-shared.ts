// Till maths for the POS screen.

/** Change to hand back (negative = customer is short). Null when nothing was entered. */
export function cashChange(tendered: number, total: number): number | null {
  if (!(tendered > 0)) return null
  return Math.round(tendered) - Math.round(total)
}

const NOTES = [500, 1000, 2000, 5000, 10000, 20000, 50000]

/** One-tap "cash received" buttons: exact, then the next round amounts above the total. */
export function quickCashAmounts(total: number): number[] {
  if (!(total > 0)) return []
  const out = new Set<number>([Math.round(total)])
  for (const step of NOTES) {
    const up = Math.ceil(total / step) * step
    if (up > total) out.add(up)
    if (out.size >= 4) break
  }
  return [...out].sort((a, b) => a - b).slice(0, 4)
}

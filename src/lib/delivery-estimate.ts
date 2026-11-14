// Merchant delivery estimates ("2-5 days", "24-48 hours") as whole days.
// Used by the product page (client) and by Google structured data (server).

/** "2-5 days", "24-48 hours", "3 working days" → whole days [min, max]. */
export function deliveryDays(frame: string | null | undefined): [number, number] | null {
  if (!frame) return null;
  const t = frame.toLowerCase();
  const range = t.match(/(\d+)\s*(?:-|–|to)\s*(\d+)\s*(h(?:ou)?rs?|days?|working days?|business days?)/);
  const single = t.match(/(\d+)\s*(h(?:ou)?rs?|days?|working days?|business days?)/);
  const m = range ?? single;
  if (!m) return /same.?day|today/.test(t) ? [0, 0] : /next.?day|tomorrow/.test(t) ? [1, 1] : null;
  const a = Number(m[1]);
  const b = range ? Number(m[2]) : a;
  const unit = (range ? m[3] : m[2]) ?? "";
  const toDays = (n: number) => (unit.startsWith("h") ? Math.ceil(n / 24) : n);
  const lo = toDays(Math.min(a, b));
  const hi = toDays(Math.max(a, b));
  return hi > 60 ? null : [lo, hi];
}

/** Calendar date `days` from now, counted in working days (Mon–Sat). */
export function arrivalDate(days: number, from = new Date()): Date {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) left--;
  }
  return d;
}

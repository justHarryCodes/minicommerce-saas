// Browser-safe customer helpers (no database imports) — shared by the
// customers page and its client component.

export interface CustomerRow {
  key: string;
  name: string;
  phone: string;
  email: string | null;
  orders: number;
  total_spent: number;
  first_order_at: string;
  last_order_at: string;
  last_city: string | null;
}

export type Segment = "all" | "repeat" | "top" | "new" | "lapsed";

/** Pure: which segments a customer belongs to (top = top 10% by spend, min 1). */
export function segmentsOf(c: Pick<CustomerRow, "orders" | "total_spent" | "first_order_at" | "last_order_at">, topSpendCutoff: number, now = Date.now()): Segment[] {
  const day = 86_400_000;
  const s: Segment[] = ["all"];
  if (c.orders >= 2) s.push("repeat");
  if (c.total_spent > 0 && c.total_spent >= topSpendCutoff) s.push("top");
  if (now - new Date(c.first_order_at).getTime() <= 30 * day) s.push("new");
  if (now - new Date(c.last_order_at).getTime() > 60 * day) s.push("lapsed");
  return s;
}

export function topSpendCutoff(spends: number[]): number {
  if (!spends.length) return Infinity;
  const sorted = [...spends].sort((a, b) => b - a);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.1) - 1)];
}

/** CSV with a header row; quotes every field. */
export function toCsv(rows: (string | number | null)[][]): string {
  return rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

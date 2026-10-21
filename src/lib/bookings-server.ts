// Server-side booking: loading calendars and reserving a slot safely.
// Reservation runs inside the order transaction under a per-store advisory
// lock and re-computes availability, so two shoppers can't take the same
// slot even if they click at the same moment.

import type { PoolClient } from "pg";
import { query } from "@/lib/db";
import { addDays, lagosParts, lagosToUtc, parseHours } from "@/lib/hours";
import { computeSlots, slotRulesOf, type ExistingBooking, type StaffLite } from "@/lib/booking";

export class BookingConflictError extends Error {}

type Db = Pick<PoolClient, "query"> | { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };

export async function loadStaff(storeId: string, db?: Db): Promise<StaffLite[]> {
  const sql = "SELECT id, name, product_ids FROM staff_members WHERE store_id = $1 AND is_active = true ORDER BY sort_order, created_at";
  const rows = db
    ? ((await db.query(sql, [storeId])).rows as { id: string; name: string; product_ids: string[] | null }[])
    : await query<{ id: string; name: string; product_ids: string[] | null }>(sql, [storeId]);
  return rows.map((r) => ({ id: r.id, name: r.name, productIds: r.product_ids ?? [] }));
}

/** Confirmed bookings touching a Lagos date (with a day's margin for overnight hours). */
export async function loadBookingsAround(storeId: string, date: string, db?: Db): Promise<ExistingBooking[]> {
  const from = lagosToUtc(addDays(date, -1), 0).toISOString();
  const to = lagosToUtc(addDays(date, 2), 0).toISOString();
  const sql = `SELECT staff_id, starts_at, ends_at FROM bookings
               WHERE store_id = $1 AND status = 'confirmed' AND starts_at < $3 AND ends_at > $2`;
  const rows = db
    ? ((await db.query(sql, [storeId, from, to])).rows as { staff_id: string | null; starts_at: string; ends_at: string }[])
    : await query<{ staff_id: string | null; starts_at: string; ends_at: string }>(sql, [storeId, from, to]);
  return rows.map((r) => ({ staffId: r.staff_id, start: new Date(r.starts_at), end: new Date(r.ends_at) }));
}

export interface ReserveInput {
  store: Record<string, unknown> & { id: string };
  product: { id: string; name: string; duration_minutes: number | null };
  startsAt: string;
  staffId: string | null;
  orderId: string;
  customerName: string;
  customerPhone: string;
  now?: Date;
}

/** Book the slot or throw BookingConflictError. Returns the booking row. */
export async function reserveSlot(client: Db, input: ReserveInput) {
  const start = new Date(input.startsAt);
  if (Number.isNaN(start.getTime())) throw new BookingConflictError("Invalid appointment time");

  // One booking writer per store at a time (released at transaction end)
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`booking:${input.store.id}`]);

  const date = lagosParts(start).date;
  const rules = slotRulesOf(input.store, parseHours(input.store.opening_hours), input.product.duration_minutes);
  const [staff, existing] = await Promise.all([loadStaff(input.store.id, client), loadBookingsAround(input.store.id, date, client)]);
  const slots = computeSlots({
    date,
    rules,
    now: input.now ?? new Date(),
    existing,
    staff,
    productId: input.product.id,
    staffId: input.staffId,
  });
  const slot = slots.find((s) => s.start === start.toISOString());
  if (!slot) throw new BookingConflictError(`Sorry — that ${input.product.name} slot was just taken. Please pick another time.`);

  const staffId = staff.length ? (input.staffId && slot.staffIds.includes(input.staffId) ? input.staffId : slot.staffIds[0]) : null;
  const end = new Date(start.getTime() + rules.durationMin * 60_000);
  const res = await client.query(
    `INSERT INTO bookings (store_id, order_id, product_id, product_name, staff_id, starts_at, ends_at, customer_name, customer_phone)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, starts_at, staff_id`,
    [input.store.id, input.orderId, input.product.id, input.product.name, staffId, start.toISOString(), end.toISOString(), input.customerName, input.customerPhone]
  );
  return (res.rows[0] ?? { id: null, starts_at: start.toISOString(), staff_id: staffId }) as { id: string | null; starts_at: string; staff_id: string | null };
}

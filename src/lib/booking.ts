// Appointment slots for bookable services. Pure + browser-safe: the slot
// API and the order API both call computeSlots(), so what a shopper is
// offered and what the server accepts can never disagree.

import { lagosToUtc, weekdayOf, windowFor, type WeeklyHours } from "@/lib/hours";

/** Always-open stores still need bookable hours — default to 9am–6pm daily. */
export const DEFAULT_BOOKING_HOURS: WeeklyHours = Object.fromEntries(
  Array.from({ length: 7 }, (_, d) => [String(d), { open: "09:00", close: "18:00" }])
);

/** Bookable services don't run out — their stock is pinned to this. */
export const SERVICE_STOCK = 9999;

export interface StaffLite {
  id: string;
  name: string;
  productIds: string[];
}

export interface ExistingBooking {
  staffId: string | null;
  start: Date;
  end: Date;
}

export interface SlotRules {
  hours: WeeklyHours;
  durationMin: number;
  slotMin: number;
  bufferMin: number;
  minNoticeMin: number;
}

export interface Slot {
  start: string; // ISO instant
  staffIds: string[]; // free staff (empty array when the store has no staff)
}

/** Staff who offer this service (empty productIds = offers everything). */
export function staffFor(staff: StaffLite[], productId: string): StaffLite[] {
  return staff.filter((s) => s.productIds.length === 0 || s.productIds.includes(productId));
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Free start times on a Lagos date. Without staff the store is one
 * calendar (one booking at a time); with staff, a slot is free while at
 * least one eligible person is. `staffId` restricts to that person.
 */
export function computeSlots(opts: {
  date: string;
  rules: SlotRules;
  now: Date;
  existing: ExistingBooking[];
  staff: StaffLite[];
  productId: string;
  staffId?: string | null;
}): Slot[] {
  const { date, rules, now, existing, productId } = opts;
  const window = windowFor(rules.hours, weekdayOf(date));
  if (!window) return [];
  const [open, close] = window;
  const earliest = now.getTime() + rules.minNoticeMin * 60_000;
  const buffer = rules.bufferMin * 60_000;
  const eligible = staffFor(opts.staff, productId).filter((s) => !opts.staffId || s.id === opts.staffId);
  if (opts.staff.length > 0 && eligible.length === 0) return [];

  const slots: Slot[] = [];
  for (let t = open; t + rules.durationMin <= close; t += rules.slotMin) {
    const start = lagosToUtc(date, t).getTime();
    if (start < earliest) continue;
    const end = start + rules.durationMin * 60_000;
    const busy = (staffId: string | null) =>
      existing.some(
        (b) => (staffId === null || b.staffId === staffId) && overlaps(start - buffer, end + buffer, b.start.getTime(), b.end.getTime())
      );
    if (opts.staff.length === 0) {
      if (!busy(null)) slots.push({ start: new Date(start).toISOString(), staffIds: [] });
    } else {
      const free = eligible.filter((s) => !busy(s.id)).map((s) => s.id);
      if (free.length) slots.push({ start: new Date(start).toISOString(), staffIds: free });
    }
  }
  return slots;
}

/** Store columns → slot rules (falls back to sensible defaults). */
export function slotRulesOf(store: Record<string, unknown>, hours: WeeklyHours | null, durationMin: number | null | undefined): SlotRules {
  const n = (v: unknown, d: number) => (Number.isFinite(Number(v)) && v !== null && v !== undefined ? Number(v) : d);
  return {
    hours: hours ?? DEFAULT_BOOKING_HOURS,
    durationMin: Math.max(5, n(durationMin, 60)),
    slotMin: n(store.booking_slot_minutes ?? store.bookingSlotMinutes, 30),
    bufferMin: n(store.booking_buffer_minutes ?? store.bookingBufferMinutes, 0),
    minNoticeMin: n(store.booking_min_notice_minutes ?? store.bookingMinNoticeMinutes, 60),
  };
}

export function bookingWindowDays(store: Record<string, unknown>): number {
  const v = Number(store.booking_window_days ?? store.bookingWindowDays ?? 30);
  return Number.isFinite(v) ? Math.min(180, Math.max(1, v)) : 30;
}

/** "Tue 4 Nov, 2:00pm" in Lagos time. */
export function formatAppointment(iso: string | Date): string {
  const d = new Date(new Date(iso).getTime() + 60 * 60_000);
  const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day}, ${h % 12 === 0 ? 12 : h % 12}:${m}${h < 12 ? "am" : "pm"}`;
}

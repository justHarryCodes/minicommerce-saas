// Opening hours, in Lagos time. Nigeria is UTC+1 all year (no DST), so
// conversions are a fixed offset — deterministic and easy to test.
// Browser-safe: no server imports.

export const LAGOS_OFFSET_MIN = 60;
const DAY_MIN = 24 * 60;
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export type DayHours = { open: string; close: string } | null;
/** Keys "0".."6" (Sunday = 0). null = closed that day. */
export type WeeklyHours = Record<string, DayHours>;

const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseHM(s: string): number {
  const m = HM.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

/** Validate stored/submitted hours; null when unusable (= always open). */
export function parseHours(raw: unknown): WeeklyHours | null {
  if (!raw || typeof raw !== "object") return null;
  const out: WeeklyHours = {};
  let anyOpen = false;
  for (let d = 0; d < 7; d++) {
    const v = (raw as Record<string, unknown>)[String(d)];
    if (v && typeof v === "object") {
      const { open, close } = v as { open?: unknown; close?: unknown };
      if (typeof open === "string" && typeof close === "string" && HM.test(open) && HM.test(close) && open !== close) {
        out[String(d)] = { open, close };
        anyOpen = true;
        continue;
      }
    }
    out[String(d)] = null;
  }
  return anyOpen ? out : null;
}

/** Wall-clock parts of an instant in Lagos. */
export function lagosParts(at: Date): { date: string; weekday: number; minutes: number } {
  const shifted = new Date(at.getTime() + LAGOS_OFFSET_MIN * 60_000);
  return {
    date: shifted.toISOString().slice(0, 10),
    weekday: shifted.getUTCDay(),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

/** The instant for a Lagos date ("YYYY-MM-DD") + minutes after midnight. */
export function lagosToUtc(date: string, minutes: number): Date {
  return new Date(Date.parse(`${date}T00:00:00Z`) + (minutes - LAGOS_OFFSET_MIN) * 60_000);
}

export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MIN * 60_000).toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** A day's opening window as [start, end) minutes; end > 1440 for overnight hours. */
export function windowFor(hours: WeeklyHours, weekday: number): [number, number] | null {
  const h = hours[String(weekday)];
  if (!h) return null;
  const open = parseHM(h.open);
  let close = parseHM(h.close);
  if (close <= open) close += DAY_MIN; // e.g. 18:00 → 02:00
  return [open, close];
}

export function isOpenAt(hours: WeeklyHours | null, at: Date): boolean {
  if (!hours) return true;
  const { weekday, minutes } = lagosParts(at);
  const today = windowFor(hours, weekday);
  if (today && minutes >= today[0] && minutes < today[1]) return true;
  // still inside yesterday's overnight window?
  const y = windowFor(hours, (weekday + 6) % 7);
  return !!y && y[1] > DAY_MIN && minutes < y[1] - DAY_MIN;
}

/** Next instant the store opens (strictly after `from` if currently closed). */
export function nextOpening(hours: WeeklyHours, from: Date): Date | null {
  const { date, minutes } = lagosParts(from);
  for (let i = 0; i < 8; i++) {
    const d = addDays(date, i);
    const w = windowFor(hours, weekdayOf(d));
    if (!w) continue;
    if (i === 0 && w[0] <= minutes) continue;
    return lagosToUtc(d, w[0]);
  }
  return null;
}

/** When the current opening window ends (assumes the store is open now). */
export function closingTime(hours: WeeklyHours, at: Date): Date | null {
  const { date, weekday, minutes } = lagosParts(at);
  const today = windowFor(hours, weekday);
  if (today && minutes >= today[0] && minutes < today[1]) return lagosToUtc(date, today[1]);
  const y = windowFor(hours, (weekday + 6) % 7);
  if (y && y[1] > DAY_MIN && minutes < y[1] - DAY_MIN) return lagosToUtc(addDays(date, -1), y[1]);
  return null;
}

export function formatClock(minutes: number): string {
  const m = ((minutes % DAY_MIN) + DAY_MIN) % DAY_MIN;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${mm ? `:${String(mm).padStart(2, "0")}` : ""}${suffix}`;
}

/** "today 9am" / "tomorrow 9am" / "Mon 9am" relative to `now`, in Lagos time. */
export function describeInstant(at: Date, now: Date): string {
  const a = lagosParts(at);
  const n = lagosParts(now);
  const time = formatClock(a.minutes);
  if (a.date === n.date) return `today ${time}`;
  if (a.date === addDays(n.date, 1)) return `tomorrow ${time}`;
  return `${WEEKDAYS[a.weekday].slice(0, 3)} ${time}`;
}

export interface OpenStatus {
  open: boolean;
  /** e.g. "Open now · closes 9pm" / "Closed · opens tomorrow 9am" */
  label: string;
  nextOpen: Date | null;
}

export function openStatus(hours: WeeklyHours | null, now: Date): OpenStatus | null {
  if (!hours) return null;
  if (isOpenAt(hours, now)) {
    const close = closingTime(hours, now);
    return { open: true, label: close ? `Open now · closes ${formatClock(lagosParts(close).minutes)}` : "Open now", nextOpen: null };
  }
  const next = nextOpening(hours, now);
  return { open: false, label: next ? `Closed · opens ${describeInstant(next, now)}` : "Closed", nextOpen: next };
}

/** Handy defaults for the settings editor. */
export const HOURS_PRESETS: { label: string; hours: WeeklyHours }[] = [
  {
    label: "Mon–Sat 9am–9pm",
    hours: { "0": null, "1": { open: "09:00", close: "21:00" }, "2": { open: "09:00", close: "21:00" }, "3": { open: "09:00", close: "21:00" }, "4": { open: "09:00", close: "21:00" }, "5": { open: "09:00", close: "21:00" }, "6": { open: "09:00", close: "21:00" } },
  },
  {
    label: "Every day 10am–10pm",
    hours: Object.fromEntries(Array.from({ length: 7 }, (_, d) => [String(d), { open: "10:00", close: "22:00" }])),
  },
  {
    label: "Mon–Fri 8am–6pm",
    hours: { "0": null, "1": { open: "08:00", close: "18:00" }, "2": { open: "08:00", close: "18:00" }, "3": { open: "08:00", close: "18:00" }, "4": { open: "08:00", close: "18:00" }, "5": { open: "08:00", close: "18:00" }, "6": null },
  },
];

/**
 * Is a product's "sold out until" date today or later (Lagos)? Accepts the
 * YYYY-MM-DD string or the local-midnight Date that pg returns for DATE
 * columns — evaluate this on the server, where that Date was created.
 */
export function isSoldOutToday(value: unknown, now = new Date()): boolean {
  if (!value) return false;
  const date =
    value instanceof Date
      ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
      : String(value).slice(0, 10);
  return date >= lagosParts(now).date;
}

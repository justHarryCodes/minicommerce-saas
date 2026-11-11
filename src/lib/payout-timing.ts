// When a Duka Pay payment reaches the store's bank. Paystack settles on the
// next working day (Mon–Fri) after the payment; weekend sales arrive Monday.
// Public holidays push it a day further — the UI says "expected".

const TZ = "Africa/Lagos";

/** Calendar date (YYYY-MM-DD) of an instant in Lagos time. */
export function lagosDate(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** The working day after the payment's Lagos date, as YYYY-MM-DD. */
export function expectedPayoutDate(paidAt: Date): string {
  const [y, m, d] = lagosDate(paidAt).split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d));
  do {
    day.setUTCDate(day.getUTCDate() + 1);
  } while (day.getUTCDay() === 0 || day.getUTCDay() === 6);
  return day.toISOString().slice(0, 10);
}

/** "Mon 17 Nov" for a YYYY-MM-DD date. */
export function shortDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────
// Tier 3: opening hours (Lagos time), appointment slots, size guides,
// back-in-stock messages, and the order API rules for bookings, minimum
// order, closed stores and sold-out-today items.
// ─────────────────────────────────────────────────────────────────────────

process.env.NEXT_PUBLIC_APP_URL = "https://dukanigeria.com";
vi.mock("@/lib/plan", async () => (await import("./helpers/plan-mock")).planMock.module());
vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn(), queryMany: vi.fn(), withTransaction: vi.fn() }));
vi.mock("@/lib/push", () => ({ notifyStoreNewOrder: vi.fn().mockResolvedValue(undefined), notifyStoreEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/webpush", () => ({ sendWebPushToSubject: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/notify/order-messages", () => ({ notifyCustomer: vi.fn().mockResolvedValue(undefined) }));

import { queryOne, withTransaction } from "@/lib/db";
import { closingTime, isOpenAt, isSoldOutToday, lagosParts, lagosToUtc, nextOpening, openStatus, parseHours, type WeeklyHours } from "@/lib/hours";
import { computeSlots, formatAppointment, type SlotRules } from "@/lib/booking";
import { parseSizeGuide } from "@/lib/size-guide";
import { backInStockMessage } from "@/lib/stock-alerts";

const mockedQueryOne = vi.mocked(queryOne);
const mockedWithTransaction = vi.mocked(withTransaction);
beforeEach(() => vi.clearAllMocks());

// Mon–Sat 9am–9pm, Sunday closed; plus a late-night Friday
const HOURS: WeeklyHours = {
  "0": null,
  "1": { open: "09:00", close: "21:00" },
  "2": { open: "09:00", close: "21:00" },
  "3": { open: "09:00", close: "21:00" },
  "4": { open: "09:00", close: "21:00" },
  "5": { open: "18:00", close: "02:00" },
  "6": { open: "09:00", close: "21:00" },
};
// 2026-10-21 is a Wednesday. Lagos = UTC+1.
const at = (date: string, hhmm: string) => lagosToUtc(date, Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)));

describe("opening hours (Lagos time)", () => {
  it("converts to and from Lagos wall-clock time", () => {
    expect(lagosParts(new Date("2026-10-21T08:30:00Z"))).toEqual({ date: "2026-10-21", weekday: 3, minutes: 570 });
    expect(lagosToUtc("2026-10-21", 9 * 60).toISOString()).toBe("2026-10-21T08:00:00.000Z");
  });

  it("knows when it's open, including past midnight on a late night", () => {
    expect(isOpenAt(HOURS, at("2026-10-21", "08:59"))).toBe(false);
    expect(isOpenAt(HOURS, at("2026-10-21", "09:00"))).toBe(true);
    expect(isOpenAt(HOURS, at("2026-10-21", "21:00"))).toBe(false);
    expect(isOpenAt(HOURS, at("2026-10-24", "01:30"))).toBe(true); // Sat 1:30am — Friday's late night
    expect(isOpenAt(HOURS, at("2026-10-24", "02:00"))).toBe(false);
    expect(isOpenAt(null, at("2026-10-25", "03:00"))).toBe(true); // no hours = always open
  });

  it("finds the next opening and closing time", () => {
    expect(nextOpening(HOURS, at("2026-10-21", "22:00"))?.toISOString()).toBe(at("2026-10-22", "09:00").toISOString());
    expect(nextOpening(HOURS, at("2026-10-25", "12:00"))?.toISOString()).toBe(at("2026-10-26", "09:00").toISOString()); // Sunday closed → Monday
    expect(closingTime(HOURS, at("2026-10-24", "01:00"))?.toISOString()).toBe(at("2026-10-24", "02:00").toISOString());
  });

  it("describes the status for shoppers", () => {
    expect(openStatus(HOURS, at("2026-10-21", "12:00"))?.label).toBe("Open now · closes 9pm");
    expect(openStatus(HOURS, at("2026-10-21", "22:00"))?.label).toBe("Closed · opens tomorrow 9am");
    expect(openStatus(HOURS, at("2026-10-25", "10:00"))?.label).toBe("Closed · opens tomorrow 9am");
  });

  it("drops invalid days and treats all-closed as always open", () => {
    expect(parseHours({ "1": { open: "25:00", close: "10:00" }, "2": { open: "09:00", close: "17:00" } })?.["1"]).toBeNull();
    expect(parseHours({ "1": null })).toBeNull();
    expect(parseHours("junk")).toBeNull();
  });

  it("handles sold-out-today dates", () => {
    expect(isSoldOutToday("2026-10-21", at("2026-10-21", "23:00"))).toBe(true);
    expect(isSoldOutToday("2026-10-21", at("2026-10-22", "00:30"))).toBe(false); // resets at Lagos midnight
    expect(isSoldOutToday(null)).toBe(false);
  });
});

/* ───────────────────────────── Slots ───────────────────────────── */

const rules: SlotRules = { hours: HOURS, durationMin: 60, slotMin: 30, bufferMin: 0, minNoticeMin: 60 };
const NOW = at("2026-10-21", "07:00");
const PRODUCT = "p-cut";

describe("appointment slots", () => {
  it("offers every start time that fits before closing", () => {
    const slots = computeSlots({ date: "2026-10-21", rules, now: NOW, existing: [], staff: [], productId: PRODUCT });
    expect(slots[0].start).toBe(at("2026-10-21", "09:00").toISOString());
    expect(slots.at(-1)!.start).toBe(at("2026-10-21", "20:00").toISOString()); // 8pm + 60min = 9pm close
    expect(slots).toHaveLength(23);
  });

  it("respects minimum notice and closed days", () => {
    const slots = computeSlots({ date: "2026-10-21", rules, now: at("2026-10-21", "12:10"), existing: [], staff: [], productId: PRODUCT });
    expect(slots[0].start).toBe(at("2026-10-21", "13:30").toISOString());
    expect(computeSlots({ date: "2026-10-25", rules, now: NOW, existing: [], staff: [], productId: PRODUCT })).toEqual([]);
  });

  it("blocks overlapping times (plus buffer) when the store has no team", () => {
    const existing = [{ staffId: null, start: at("2026-10-21", "10:00"), end: at("2026-10-21", "11:00") }];
    const starts = computeSlots({ date: "2026-10-21", rules: { ...rules, bufferMin: 15 }, now: NOW, existing, staff: [], productId: PRODUCT }).map((s) => s.start);
    expect(starts).not.toContain(at("2026-10-21", "09:00").toISOString()); // 9:00–10:00 + 15min buffer overlaps
    expect(starts).not.toContain(at("2026-10-21", "10:30").toISOString());
    expect(starts).toContain(at("2026-10-21", "11:30").toISOString());
  });

  it("stays free while any eligible team member is free", () => {
    const staff = [
      { id: "ada", name: "Ada", productIds: [] },
      { id: "bayo", name: "Bayo", productIds: ["other-service"] }, // doesn't do haircuts
    ];
    const existing = [{ staffId: "ada", start: at("2026-10-21", "10:00"), end: at("2026-10-21", "11:00") }];
    const slots = computeSlots({ date: "2026-10-21", rules, now: NOW, existing, staff, productId: PRODUCT });
    expect(slots.find((s) => s.start === at("2026-10-21", "10:00").toISOString())).toBeUndefined();
    expect(slots.find((s) => s.start === at("2026-10-21", "09:00").toISOString())?.staffIds).toEqual(["ada"]);
  });

  it("formats appointments in Lagos time", () => {
    expect(formatAppointment(at("2026-10-21", "14:00"))).toBe("Wed 21 Oct, 2:00pm");
  });
});

/* ───────────────────────────── Clothing ───────────────────────────── */

describe("size guides & back in stock", () => {
  it("normalises size guide tables", () => {
    const g = parseSizeGuide({ columns: ["Size", "Bust"], rows: [["S", "82", "extra"], ["", ""], ["M"]], note: "  " });
    expect(g).toEqual({ columns: ["Size", "Bust"], rows: [["S", "82"], ["M", ""]] });
    expect(parseSizeGuide({ columns: ["Size"], rows: [] })).toBeNull();
    expect(parseSizeGuide("nope")).toBeNull();
  });

  it("writes the back-in-stock message", () => {
    expect(backInStockMessage({ storeName: "Maison Adé", productName: "Silk Dress", label: "M / Red", url: "https://x/y" })).toBe(
      "Maison Adé: Good news! Silk Dress (M / Red) is back in stock. Grab it before it sells out: https://x/y"
    );
  });
});

/* ───────────────────────────── Order API rules ───────────────────────────── */

const STORE_ID = "11111111-1111-1111-1111-111111111111";
const PRODUCT_ID = "22222222-2222-2222-2222-222222222222";
const store = (over: Record<string, unknown> = {}) => ({
  id: STORE_ID, is_active: true, payment_preference: "both", delivery_zones: [], free_delivery_threshold: null,
  pickup_enabled: false, pickup_address: null, pod_enabled: false, pod_deposit_percent: 0, low_stock_threshold: 3,
  opening_hours: null, allow_preorders: true, minimum_order: null,
  booking_slot_minutes: 30, booking_buffer_minutes: 0, booking_window_days: 30, booking_min_notice_minutes: 0,
  ...over,
});
const goods = { id: PRODUCT_ID, name: "Jollof", price: 3000, stock_quantity: 50, has_sizes: false, image_url: null, images: [], low_stock_threshold: null, is_bookable: false, duration_minutes: null, sold_out_until: null };
const req = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest;
const ctx = { params: Promise.resolve({ slug: "shop" }) };
const base = { storeId: STORE_ID, customerName: "Ada", customerPhone: "08012345678", deliveryAddress: "1 St", paymentMethod: "transfer" };

describe("POST orders — tier 3 rules", () => {
  it("enforces the minimum order", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne.mockResolvedValueOnce(store({ minimum_order: 5000 })).mockResolvedValueOnce(goods);
    const res = await POST(req({ ...base, items: [{ productId: PRODUCT_ID, quantity: 1 }] }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/minimum order is ₦5,000/);
  });

  it("rejects items sold out for today", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    const today = lagosParts(new Date()).date;
    mockedQueryOne.mockResolvedValueOnce(store()).mockResolvedValueOnce({ ...goods, sold_out_until: today });
    const res = await POST(req({ ...base, items: [{ productId: PRODUCT_ID, quantity: 1 }] }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/sold out for today/);
  });

  it("refuses orders while closed when order-ahead is off", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    const closedAllWeekButOneHour: WeeklyHours = Object.fromEntries(Array.from({ length: 7 }, (_, d) => [String(d), null]));
    // open only for a minute that isn't now
    const now = lagosParts(new Date());
    const other = (now.minutes + 600) % 1440;
    const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    closedAllWeekButOneHour[String(now.weekday)] = { open: hh(other), close: hh((other + 30) % 1440) };
    mockedQueryOne.mockResolvedValueOnce(store({ opening_hours: closedAllWeekButOneHour, allow_preorders: false })).mockResolvedValueOnce(goods);
    const res = await POST(req({ ...base, items: [{ productId: PRODUCT_ID, quantity: 1 }] }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/closed right now/);
  });

  it("requires a time for bookable services", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    mockedQueryOne.mockResolvedValueOnce(store()).mockResolvedValueOnce({ ...goods, name: "Haircut", is_bookable: true, duration_minutes: 60 });
    const res = await POST(req({ ...base, items: [{ productId: PRODUCT_ID, quantity: 1 }] }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/choose a time for Haircut/);
  });

  it("books a free slot inside the order transaction (no stock touched, no delivery)", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    const tomorrow = lagosParts(new Date(Date.now() + 86_400_000)).date;
    const startsAt = lagosToUtc(tomorrow, 10 * 60).toISOString();
    mockedQueryOne.mockResolvedValueOnce(store()).mockResolvedValueOnce({ ...goods, name: "Haircut", price: 8000, is_bookable: true, duration_minutes: 60 });

    const client = { query: vi.fn() };
    client.query.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO orders")) return { rows: [{ id: "order-1", order_number: "ORD-1", access_token: "t" }] };
      if (sql.includes("INSERT INTO bookings")) return { rows: [{ id: "bk-1", starts_at: startsAt, staff_id: null }] };
      return { rows: [] }; // staff, existing bookings, advisory lock, order items
    });
    mockedWithTransaction.mockImplementation(async (fn) => fn(client as never));

    const res = await POST(req({ ...base, deliveryAddress: "", deliveryMethod: "appointment", items: [{ productId: PRODUCT_ID, quantity: 3, booking: { startsAt } }] }), ctx);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.totals.subtotal).toBe(8000); // quantity forced to 1
    expect(body.bookings).toEqual([{ product: "Haircut", startsAt }]);

    const sqls = client.query.mock.calls.map(([s]) => String(s));
    expect(sqls.some((s) => s.includes("pg_advisory_xact_lock"))).toBe(true);
    expect(sqls.some((s) => s.includes("UPDATE products SET stock_quantity"))).toBe(false);
    const orderInsert = client.query.mock.calls.find(([s]) => String(s).includes("INSERT INTO orders"))!;
    expect((orderInsert[1] as unknown[])[9]).toBe("appointment");
  });

  it("returns 409 when the slot was just taken", async () => {
    const { POST } = await import("@/app/api/storefront/[slug]/orders/route");
    const tomorrow = lagosParts(new Date(Date.now() + 86_400_000)).date;
    const startsAt = lagosToUtc(tomorrow, 10 * 60).toISOString();
    mockedQueryOne.mockResolvedValueOnce(store()).mockResolvedValueOnce({ ...goods, name: "Haircut", is_bookable: true, duration_minutes: 60 });
    const client = { query: vi.fn() };
    client.query.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO orders")) return { rows: [{ id: "order-1", order_number: "ORD-1", access_token: "t" }] };
      if (sql.includes("FROM bookings")) return { rows: [{ staff_id: null, starts_at: startsAt, ends_at: lagosToUtc(tomorrow, 11 * 60).toISOString() }] };
      return { rows: [] };
    });
    mockedWithTransaction.mockImplementation(async (fn) => fn(client as never));
    const res = await POST(req({ ...base, deliveryMethod: "appointment", items: [{ productId: PRODUCT_ID, quantity: 1, booking: { startsAt } }] }), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/just taken/);
  });
});

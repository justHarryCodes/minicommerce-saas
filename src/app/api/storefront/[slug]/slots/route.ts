// Free appointment times for a bookable service on a given Lagos date.
// GET ?productId=…&date=YYYY-MM-DD[&staffId=…]

import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { addDays, lagosParts, parseHours } from "@/lib/hours";
import { bookingWindowDays, computeSlots, slotRulesOf, staffFor } from "@/lib/booking";
import { loadBookingsAround, loadStaff } from "@/lib/bookings-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sp = req.nextUrl.searchParams;
  const productId = sp.get("productId") ?? "";
  const date = sp.get("date") ?? "";
  const staffId = sp.get("staffId") || null;
  if (!/^[0-9a-f-]{36}$/i.test(productId) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (staffId && !/^[0-9a-f-]{36}$/i.test(staffId))) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const store = await queryOne<Record<string, unknown> & { id: string }>(
    `SELECT id, opening_hours, booking_slot_minutes, booking_buffer_minutes, booking_window_days, booking_min_notice_minutes
     FROM stores WHERE slug = $1 AND is_active = true`,
    [slug]
  );
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  const product = await queryOne<{ id: string; duration_minutes: number | null }>(
    "SELECT id, duration_minutes FROM products WHERE id = $1 AND store_id = $2 AND is_active = true AND is_bookable = true",
    [productId, store.id]
  );
  if (!product) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  const now = new Date();
  const today = lagosParts(now).date;
  const lastDay = addDays(today, bookingWindowDays(store) - 1);
  const staff = await loadStaff(store.id);
  const eligible = staffFor(staff, product.id).map((s) => ({ id: s.id, name: s.name }));

  if (date < today || date > lastDay) {
    return NextResponse.json({ slots: [], staff: eligible, firstDate: today, lastDate: lastDay });
  }

  const slots = computeSlots({
    date,
    rules: slotRulesOf(store, parseHours(store.opening_hours), product.duration_minutes),
    now,
    existing: await loadBookingsAround(store.id, date),
    staff,
    productId: product.id,
    staffId,
  });

  return NextResponse.json(
    { slots, staff: eligible, firstDate: today, lastDate: lastDay },
    { headers: { "Cache-Control": "no-store" } }
  );
}

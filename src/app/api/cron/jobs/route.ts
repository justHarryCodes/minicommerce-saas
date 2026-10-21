// All scheduled jobs (abandoned-cart + appointment reminders). Called every 30 min by
// .github/workflows/cron.yml (or any scheduler) with
//   Authorization: Bearer $CRON_SECRET

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sendDueCartReminders } from "@/lib/notify/cart-reminders";
import { sendDueBookingReminders } from "@/lib/notify/booking-reminders";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

async function run(req: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [carts, bookings] = await Promise.all([sendDueCartReminders(), sendDueBookingReminders()]);
  return NextResponse.json({ ok: true, carts, bookings });
}

export const GET = run;
export const POST = run;

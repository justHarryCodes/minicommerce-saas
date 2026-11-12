// All scheduled jobs (abandoned-cart + appointment reminders, custom domains vs plan). Called every 30 min by
// .github/workflows/cron.yml (or any scheduler) with
//   Authorization: Bearer $CRON_SECRET

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sendDueCartReminders } from "@/lib/notify/cart-reminders";
import { sendDueBookingReminders } from "@/lib/notify/booking-reminders";
import { refreshPendingDomains, syncCustomDomainsWithPlans } from "@/lib/domains";
import { reconcilePendingPayments } from "@/lib/payments";
import { getPlatformSettings } from "@/lib/admin-auth";
import { sendDueSetupReminders } from "@/lib/notify/setup-reminders";

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
  const settings = await getPlatformSettings().catch(() => null);
  const [carts, bookings, domains, payments, setupReminders] = await Promise.all([
    sendDueCartReminders(),
    sendDueBookingReminders(),
    // Domains Cloudflare has verified since we last looked, then plan sync
    refreshPendingDomains().then(async (pending) => ({ pending, ...(await syncCustomDomainsWithPlans()) })),
    // Paystack checkouts still pending: settle missed webhooks, close abandoned ones
    reconcilePendingPayments(),
    // Nudge vendors who haven't finished setting up (day 1, 3, 7, 14)
    sendDueSetupReminders({ enabled: settings?.setup_reminders_enabled ?? true }).catch((err) => ({
      stores: 0,
      signups: 0,
      skipped: err instanceof Error ? err.message : "failed",
    })),
  ]);
  return NextResponse.json({ ok: true, carts, bookings, domains, payments, setupReminders });
}

export const GET = run;
export const POST = run;

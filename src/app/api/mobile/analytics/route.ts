import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getStoreFor } from "@/lib/access";
import { freeLimitsFor, requireFeature } from "@/lib/plan";
import { getAnalytics, RANGES, type RangeDays } from "@/lib/analytics";
import { SOURCE_LABELS, type TrafficSource } from "@/lib/traffic-source";

export const dynamic = "force-dynamic";

// Vendor app: sales, visitors and conversion (same as Dashboard -> Analytics).
//   ?days=7 | 30 | 90
export async function GET(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "analytics");
  if (!store) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const denied = await requireFeature(store.id, "analytics");
  if (denied) return denied;

  const asked = Number(req.nextUrl.searchParams.get("days"));
  // Free plan: the last 7 days only, and no traffic sources (both are Pro)
  const limits = await freeLimitsFor(store.id);
  const days: RangeDays = limits ? (limits.analyticsDays as RangeDays) : (RANGES as readonly number[]).includes(asked) ? (asked as RangeDays) : 30;
  const data = await getAnalytics(store.id, days);
  return NextResponse.json({
    ...data,
    days,
    limited: !!limits,
    // Human labels for traffic sources ("whatsapp" -> "WhatsApp")
    sources: limits ? [] : data.sources.map((s) => ({ ...s, label: SOURCE_LABELS[s.source as TrafficSource] ?? s.source })),
  });
}

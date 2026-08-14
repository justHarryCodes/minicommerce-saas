import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { checkRateLimit } from "@/lib/rate-limit";

// Browsers POST here per the CSP `report-uri` directive in next.config.ts,
// as `application/csp-report` (not JSON) — read raw and parse manually,
// same pattern as the Paystack webhook's raw-body handling. Public and
// unauthenticated by nature (the browser sends it, not a logged-in user),
// so it's rate-limited to stop it being abused as an anonymous log-spam sink.
export async function POST(req: NextRequest) {
  const rateLimited = await checkRateLimit(req, {
    key: "csp-report",
    max: 100,
    window: 3600,
  });
  if (rateLimited) return rateLimited;

  try {
    const body = await req.text();
    const parsed = JSON.parse(body);
    // Meant to be read from server/Vercel logs during the Report-Only
    // period, not built into a dashboard — no DB table for this.
    console.error("[csp-report]", JSON.stringify(parsed["csp-report"] ?? parsed));
    Sentry.captureMessage("CSP violation", {
      level: "warning",
      extra: { report: parsed["csp-report"] ?? parsed },
    });
  } catch {
    // Malformed report body — nothing useful to log, just move on.
  }

  return new NextResponse(null, { status: 204 });
}

// Called by the Cloudflare Worker to map a merchant's custom hostname to a
// store slug. Requires the shared WORKER_SECRET header when one is set.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { slugForHostname } from "@/lib/domains";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.WORKER_SECRET;
  if (!secret) return true;
  const got = Buffer.from(req.headers.get("x-worker-secret") ?? "");
  const want = Buffer.from(secret);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const host = (req.nextUrl.searchParams.get("host") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9.-]{3,253}$/.test(host)) return NextResponse.json({ slug: null }, { status: 400 });
  const slug = await slugForHostname(host);
  return NextResponse.json({ slug }, { status: slug ? 200 : 404 });
}

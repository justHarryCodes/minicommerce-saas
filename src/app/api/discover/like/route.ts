import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { setLike, validLike } from "@/lib/discover-feed";

export const dynamic = "force-dynamic";

// POST { productId, visitorId, liked } — heart a product on Discover.
// Anonymous: one like per device (the same visitor id the storefront uses).
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, { key: "rl:discover-like", max: 120, window: 60 });
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  if (!body || !validLike(body.productId, body.visitorId) || typeof body.liked !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  }
  const likes = await setLike(body.productId, body.visitorId, body.liked);
  if (likes === null) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({ ok: true, likes });
}

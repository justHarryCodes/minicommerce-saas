import { NextRequest, NextResponse } from "next/server";
import { feedPage } from "@/lib/discover-feed";

export const dynamic = "force-dynamic";

// GET /api/discover/feed?page=1&category=&q=&v=<visitor id>
// One page of the Discover "For you" feed.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const data = await feedPage({
    category: sp.get("category") ?? "all",
    q: sp.get("q") ?? "",
    page: parseInt(sp.get("page") ?? "1", 10) || 1,
    visitorId: sp.get("v"),
  });
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}

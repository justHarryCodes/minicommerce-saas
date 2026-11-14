import { NextRequest, NextResponse } from "next/server";
import { getCachedStore } from "@/lib/storefront-page";
import { storeRobots, TEXT_HEADERS } from "@/lib/sitemaps";

export const dynamic = "force-dynamic";

// <store address>/robots.txt (the Worker maps it here)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const store = await getCachedStore((await params).slug);
  if (!store) return new NextResponse("User-agent: *\nDisallow: /\n", { status: 404, headers: TEXT_HEADERS });
  return new NextResponse(storeRobots(store), { headers: TEXT_HEADERS });
}

import { NextResponse } from "next/server";
import { platformRobots, TEXT_HEADERS } from "@/lib/sitemaps";

// dukanigeria.com/robots.txt (store addresses get theirs from /store/<slug>/robots.txt)
export async function GET() {
  return new NextResponse(platformRobots(), { headers: TEXT_HEADERS });
}

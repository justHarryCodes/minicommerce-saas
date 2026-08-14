import { NextResponse } from "next/server";
import { getTrendingReels } from "@/lib/reels";

export async function GET() {
  const reels = await getTrendingReels();
  return NextResponse.json({ reels });
}

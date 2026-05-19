import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

type Ctx = { params: Promise<{ reelId: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { reelId } = await params;

  const sessionId = req.headers.get("x-session-id") ?? undefined;

  // Fire-and-forget insert + increment (no await chain in response)
  Promise.all([
    queryOne(
      "INSERT INTO reel_views (reel_id, session_id) VALUES ($1, $2)",
      [reelId, sessionId ?? null]
    ),
    queryOne(
      "UPDATE reels SET view_count = view_count + 1 WHERE id = $1",
      [reelId]
    ),
  ]).catch(() => {});

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

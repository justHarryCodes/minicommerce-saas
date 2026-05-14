import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const body = await req.json().catch(() => ({}));
    const visitorId = typeof body.visitor_id === "string" ? body.visitor_id.slice(0, 64) : null;

    if (!visitorId) return NextResponse.json({ ok: false }, { status: 400 });

    // One unique row per (store, visitor, day) — duplicates silently ignored
    await query(
      `INSERT INTO store_visits (store_id, visitor_id, visited_at)
       VALUES ($1, $2, CURRENT_DATE)
       ON CONFLICT (store_id, visitor_id, visited_at) DO NOTHING`,
      [storeId, visitorId]
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

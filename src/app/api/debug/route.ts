import { NextResponse } from "next/server";

// Removed: this endpoint was leaking internal routing headers to unauthenticated callers.
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

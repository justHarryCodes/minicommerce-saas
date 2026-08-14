import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { isAiEnabled } from "@/lib/ai";

// Presence-check only, gated behind a session so the flag isn't a free public
// probe. Dashboard components call this once to decide whether to render
// AI-assist buttons at all, rather than rendering them and failing loudly.
export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(isAiEnabled());
}

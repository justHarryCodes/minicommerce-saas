import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { acceptInvite, INVITE_COOKIE } from "@/lib/team";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, { key: "rl:team-accept", max: 20, window: 600 });
  if (limited) return limited;

  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Please sign in first" }, { status: 401 });

  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  const result = await acceptInvite(String(token ?? ""), user);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const res = NextResponse.json({ ok: true, storeName: result.storeName });
  res.cookies.delete(INVITE_COOKIE);
  return res;
}

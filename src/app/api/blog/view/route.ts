import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { countView } from "@/lib/blog";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// One view per reader per post per day (best effort, never blocks reading).
export async function POST(req: NextRequest) {
  const parsed = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,100}$/) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 422 });
  const first = await rateLimit(`blog:view:${parsed.data.slug}:${getClientIp(req)}`, 1, 86_400);
  if (first) await countView(parsed.data.slug).catch(() => {});
  return NextResponse.json({ ok: true });
}

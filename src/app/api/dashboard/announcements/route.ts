import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/auth";
import { getStoreAccess } from "@/lib/access";
import { dismissAnnouncement } from "@/lib/admin/campaigns";

export const dynamic = "force-dynamic";

// POST { campaignId }: hide a Duka announcement on this store's dashboard.
export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await getStoreAccess(user);
  if (!access) return NextResponse.json({ error: "No store" }, { status: 404 });
  const parsed = z.object({ campaignId: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  await dismissAnnouncement(access.store.id, parsed.data.campaignId);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/plan";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

// Owner-only: turns the public product feeds on or off.
export async function PATCH(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "Only the store owner can change sales channels" }, { status: 403 });
  const denied = await requireFeature(store.id, "sales_channels");
  if (denied) return denied;
  const parsed = z.object({ feedsEnabled: z.boolean() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  await queryOne("UPDATE stores SET feeds_enabled = $2 WHERE id = $1 RETURNING id", [store.id, parsed.data.feedsEnabled]);
  return NextResponse.json({ ok: true });
}

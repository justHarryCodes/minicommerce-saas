import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

const Schema = z.object({
  everyN: z.number().int().min(2).max(50).nullable(),
  percent: z.number().int().min(1).max(90),
});

// Owner-only: the reward is a standing discount on every Nth order.
export async function PATCH(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "Only the store owner can change loyalty rewards" }, { status: 403 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Every 2–50 orders, 1–90% off" }, { status: 422 });

  await queryOne("UPDATE stores SET loyalty_every_n = $2, loyalty_percent = $3 WHERE id = $1 RETURNING id", [
    store.id,
    parsed.data.everyN,
    parsed.data.percent,
  ]);
  return NextResponse.json({ ok: true });
}

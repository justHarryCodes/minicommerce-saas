import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/auth";
import { getStoreFor } from "@/lib/access";
import { requireFeature } from "@/lib/plan";
import { checkRateLimit } from "@/lib/rate-limit";
import { BROADCAST_LIMITS, createBroadcast, sendBroadcastBatch } from "@/lib/growth-broadcasts";

// Start a broadcast to the store's list (owner, Pro). The first batch goes
// out now; the cron job sends the rest.
const Body = z.object({
  subject: z.string().trim().min(3, "Add a subject").max(120),
  body: z.string().trim().min(10, "Write a short message").max(4000),
  productIds: z.array(z.string().uuid()).max(3).default([]),
  couponId: z.string().uuid().optional().nullable(),
  audience: z.enum(["all", "buyers", "not_bought"]).default("all"),
});

export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "owner");
  if (!store) return NextResponse.json({ error: "Only the store owner can send broadcasts" }, { status: 403 });
  const denied = await requireFeature(store.id, "broadcasts");
  if (denied) return denied;
  const limited = await checkRateLimit(req, { key: `broadcast:${store.id}`, max: 5, window: 3600 });
  if (limited) return limited;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your message" }, { status: 422 });

  const created = await createBroadcast(store.id, parsed.data);
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: 409 });
  const first = await sendBroadcastBatch(BROADCAST_LIMITS.firstBatch, created.id).catch(() => ({ sent: 0, failed: 0 }));
  return NextResponse.json({ ok: true, id: created.id, recipients: created.recipients, sentNow: first.sent });
}

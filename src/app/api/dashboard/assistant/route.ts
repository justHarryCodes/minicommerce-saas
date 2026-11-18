import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/auth";
import { getStoreAccess } from "@/lib/access";
import { getEffectivePlan, getStoreFeatures } from "@/lib/plan";
import { rateLimit } from "@/lib/rate-limit";
import { runAssistant } from "@/lib/assistant/agent";
import type { AssistantContext } from "@/lib/assistant/tools";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The Duka Assistant: answers questions about Duka and the seller's own store,
// teaches good selling habits, and proposes actions the seller confirms.

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(40),
  page: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await getStoreAccess(user);
  if (!access) return NextResponse.json({ error: "No store" }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid message" }, { status: 422 });
  const history = parsed.data.messages.slice(-16);
  const last = history[history.length - 1];
  if (last.role !== "user") return NextResponse.json({ error: "Invalid message" }, { status: 422 });

  // Generous for real use, bounded for cost
  const [burst, daily] = await Promise.all([
    rateLimit(`rl:assistant:${user.firebaseUid}`, 30, 600),
    rateLimit(`rl:assistant-day:${user.firebaseUid}`, 250, 86_400),
  ]);
  if (!burst || !daily) {
    return NextResponse.json({ error: "You've sent a lot of messages. Please wait a few minutes and try again." }, { status: 429 });
  }

  const store = access.store as unknown as Record<string, any>;
  const [plan, features] = await Promise.all([getEffectivePlan(store.id), getStoreFeatures(store.id)]);
  const ctx: AssistantContext = { store, role: access.role, plan, features };

  const result = await runAssistant(ctx, history, { page: parsed.data.page, userName: user.displayName ?? "" });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

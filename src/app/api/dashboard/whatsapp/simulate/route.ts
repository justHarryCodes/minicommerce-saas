import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { handleMessage, type BotState } from "@/lib/meta/bot";

export const dynamic = "force-dynamic";

// The WhatsApp shop simulator: the store owner chats with their own bot in
// the dashboard. It runs the exact bot customers get on WhatsApp, against the
// store's real products, but sends nothing to WhatsApp and needs no Meta
// connection. The conversation state lives in the browser and comes back
// with each message. Checkout creates a real cart link to the store, so the
// whole flow can be tried end to end.

const uuid = z.string().uuid();

const StateSchema = z
  .object({
    cart: z.array(z.object({ p: uuid, v: uuid.nullable().optional(), q: z.number().int().min(1).max(99) })).max(50).optional(),
    await: z.enum(["search", "message"]).nullable().optional(),
    last: z.object({ cat: uuid.nullable(), page: z.number().int().min(1).max(100) }).nullable().optional(),
  })
  .strip();

const BodySchema = z.object({
  state: StateSchema.optional().default({}),
  message: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("text"), text: z.string().max(1000) }),
    z.object({ kind: z.literal("reply"), id: z.string().min(1).max(256), title: z.string().max(100).optional() }),
  ]),
  customerName: z.string().trim().max(60).optional(),
});

export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "Only the store owner can try the WhatsApp shop" }, { status: 403 });

  const limited = await checkRateLimit(req, { key: "rl:wa-sim", max: 120, window: 300, message: "Slow down a little, then try again." });
  if (limited) return limited;

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid message" }, { status: 422 });
  const { state, message, customerName } = parsed.data;

  try {
    const result = await handleMessage(
      {
        store: {
          id: store.id,
          name: store.name,
          slug: store.slug,
          custom_domain: store.customDomain ?? null,
          description: store.description ?? null,
          phone: store.phone ?? null,
          whatsapp: store.whatsapp ?? null,
        },
        // Product lists show as WhatsApp list messages (native catalog cards
        // only exist inside WhatsApp itself)
        catalogId: null,
        state: state as BotState,
        conversationId: null,
        // Not a real customer number: "Track my order" finds nothing here
        customer: { ref: "0000000000", name: customerName || "You" },
      },
      message,
    );
    return NextResponse.json(
      { replies: result.replies, state: result.state, forwarded: result.forward ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[wa-sim] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "The simulator couldn't answer. Please try again." }, { status: 500 });
  }
}

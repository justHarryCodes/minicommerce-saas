import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { queryOne, query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getEffectivePlan } from "@/lib/plan";
import { isAiEnabled, generateText, logAiUsage } from "@/lib/ai";

const Schema = z.object({
  message: z.string().min(1).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(500) }))
    .max(6)
    .optional(),
});

type Ctx = { params: Promise<{ slug: string }> };

// Public, unauthenticated customer-facing chat — every guard here exists to
// bound cost, since anyone can hit this without an account.
export async function POST(req: NextRequest, { params }: Ctx) {
  const { slug } = await params;

  const rateLimited = await checkRateLimit(req, {
    key: `ai:assistant:${slug}`,
    max: 10,
    window: 3600,
    message: "Too many messages — please try again later.",
  });
  if (rateLimited) return rateLimited;

  if (!isAiEnabled().groq) {
    return NextResponse.json({ error: "Assistant not available" }, { status: 503 });
  }

  const store = await queryOne<{
    id: string;
    name: string;
    description: string | null;
    return_policy: string | null;
    ai_assistant_enabled: boolean;
  }>(
    `SELECT id, name, description, return_policy, ai_assistant_enabled
     FROM stores WHERE slug = $1 AND is_active = true`,
    [slug]
  );
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  if (!store.ai_assistant_enabled) {
    return NextResponse.json({ error: "Assistant not enabled for this store" }, { status: 404 });
  }

  const effectivePlan = await getEffectivePlan(store.id);
  if (!effectivePlan.isPro) {
    return NextResponse.json({ error: "Assistant not available" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { message, history = [] } = parsed.data;

  // Lightweight RAG — same ILIKE pattern as /api/storefront/[slug]/search,
  // just reused inline here rather than making an internal fetch.
  const pattern = `%${message.trim().slice(0, 80)}%`;
  const products = await query<{
    name: string;
    slug: string;
    price: number;
    stock_quantity: number;
  }>(
    `SELECT name, slug, price, stock_quantity
     FROM products
     WHERE store_id = $1 AND is_active = true
       AND (name ILIKE $2 OR description ILIKE $2)
     ORDER BY CASE WHEN name ILIKE $2 THEN 0 ELSE 1 END, sort_order
     LIMIT 5`,
    [store.id, pattern]
  );

  const historyText = history
    .map((h) => `${h.role === "user" ? "Customer" : "Assistant"}: ${h.content}`)
    .join("\n");

  const productContext = products.length
    ? products
        .map((p) => `- ${p.name} — ₦${p.price} (${p.stock_quantity > 0 ? "in stock" : "out of stock"})`)
        .join("\n")
    : "No matching products found for this question.";

  const prompt = [
    historyText ? `Conversation so far:\n${historyText}\n` : null,
    `Customer: ${message}`,
    "",
    "Matching products found in the store's catalogue:",
    productContext,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const reply = await generateText({
      system: [
        `You are a helpful shopping assistant for the online store "${store.name}".`,
        store.description ? `Store description: ${store.description}` : null,
        store.return_policy ? `Return policy: ${store.return_policy}` : "No return policy has been provided by the store — say so if asked, don't invent one.",
        "Only use the product list and info given to you. Never invent stock, prices, or policies.",
        "If you don't know something, say so and suggest the customer contact the store directly.",
        "Keep replies short — 2-3 sentences.",
      ]
        .filter(Boolean)
        .join("\n"),
      prompt,
      maxTokens: 250,
    });

    await logAiUsage(store.id, "storefront-assistant", "groq");

    return NextResponse.json({
      reply,
      suggestedProducts: products.map((p) => ({ name: p.name, slug: p.slug, price: p.price })),
    });
  } catch {
    return NextResponse.json({ error: "Assistant is temporarily unavailable" }, { status: 502 });
  }
}

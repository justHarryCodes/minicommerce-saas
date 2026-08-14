import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { requirePro } from "@/lib/plan";
import { checkRateLimit } from "@/lib/rate-limit";
import { isAiEnabled, generateText, logAiUsage } from "@/lib/ai";

const Schema = z.object({
  name: z.string().min(2).max(120),
  keywords: z.string().max(200).optional(),
  category: z.string().max(80).optional(),
});

export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const proErr = await requirePro(store.id);
  if (proErr) return proErr;

  if (!isAiEnabled().groq) {
    return NextResponse.json({ error: "AI features not configured" }, { status: 503 });
  }

  const rateLimited = await checkRateLimit(req, {
    key: `ai:description:${store.id}`,
    max: 20,
    window: 3600,
    message: "AI description limit reached — try again in an hour.",
  });
  if (rateLimited) return rateLimited;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { name, keywords, category } = parsed.data;

  const prompt = [
    `Product name: ${name}`,
    category ? `Category: ${category}` : null,
    keywords ? `Keywords: ${keywords}` : null,
    "",
    'Respond with ONLY minified JSON: {"shortDescription": string, "description": string}',
    "shortDescription: max 100 characters, one punchy line.",
    "description: 2-4 sentences, plain sales copy a small online shop merchant would use. No markdown, no emoji.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await generateText({
      system:
        "You write concise, honest e-commerce product copy for informal/small merchants selling online. Never invent specifications you weren't given.",
      prompt,
      maxTokens: 300,
    });

    let shortDescription = "";
    let description = "";
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const obj = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      shortDescription = typeof obj.shortDescription === "string" ? obj.shortDescription : "";
      description = typeof obj.description === "string" ? obj.description : "";
    } catch {
      // Model didn't return clean JSON — fall back to using the raw text as
      // the full description rather than failing the request outright.
      description = raw;
      shortDescription = raw.split(/[.!?]/)[0]?.slice(0, 100) ?? "";
    }

    await logAiUsage(store.id, "product-description", "groq");

    return NextResponse.json({ shortDescription, description });
  } catch {
    // Never leak provider error details (rate limits, auth failures, etc.) to the client.
    return NextResponse.json({ error: "AI generation failed. Try again." }, { status: 502 });
  }
}

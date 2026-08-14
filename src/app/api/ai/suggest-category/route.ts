import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { requirePro } from "@/lib/plan";
import { checkRateLimit } from "@/lib/rate-limit";
import { isAiEnabled, analyzeImage, logAiUsage } from "@/lib/ai";
import { query } from "@/lib/db";

const Schema = z.object({
  imageUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const proErr = await requirePro(store.id);
  if (proErr) return proErr;

  if (!isAiEnabled().gemini) {
    return NextResponse.json({ error: "AI features not configured" }, { status: 503 });
  }

  const rateLimited = await checkRateLimit(req, {
    key: `ai:category:${store.id}`,
    max: 30,
    window: 3600,
  });
  if (rateLimited) return rateLimited;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const categories = await query<{ id: string; name: string }>(
    "SELECT id, name FROM categories WHERE store_id = $1 AND parent_id IS NULL ORDER BY sort_order, name",
    [store.id]
  );

  // Nothing to suggest into yet — the merchant hasn't created any categories.
  if (categories.length === 0) {
    return NextResponse.json({ suggestedCategoryId: null, suggestedCategoryName: null });
  }

  const names = categories.map((c) => c.name);

  try {
    const raw = await analyzeImage({
      imageUrl: parsed.data.imageUrl,
      prompt: [
        "This is a product photo for an online store. Which of the following categories best fits it?",
        `Categories: ${names.join(", ")}`,
        "Reply with ONLY the exact category name from the list above, nothing else. If none fit reasonably, reply with NONE.",
      ].join("\n"),
      maxTokens: 20,
    });

    const cleaned = raw.trim().replace(/^["'.]+|["'.]+$/g, "");
    const match = categories.find((c) => c.name.toLowerCase() === cleaned.toLowerCase());

    await logAiUsage(store.id, "suggest-category", "gemini");

    if (!match) {
      return NextResponse.json({ suggestedCategoryId: null, suggestedCategoryName: null });
    }
    return NextResponse.json({ suggestedCategoryId: match.id, suggestedCategoryName: match.name });
  } catch {
    return NextResponse.json({ error: "AI analysis failed" }, { status: 502 });
  }
}

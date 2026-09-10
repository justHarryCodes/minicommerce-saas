import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { isAiEnabled, generateText, logAiUsage } from "@/lib/ai";
import { PRIMARY_CATEGORIES } from "@/types";

const Schema = z.object({
  description: z.string().min(10).max(500),
});

const MAX_CATEGORIES = 8;
const MAX_SUBCATEGORIES = 5;

interface SuggestedCategory {
  name: string;
  subcategories: string[];
}

// Free for every merchant, unlike product-description/suggest-category
// (both requirePro()) — this exists specifically to make the first five
// minutes a no-brainer, which is exactly wrong to gate behind a paid plan
// aimed at merchants who are, by definition, brand new. Runs during
// onboarding (no store row exists yet) as well as later from
// dashboard/categories for an existing store — verifySession() is the only
// hard requirement either way.
export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isAiEnabled().groq) {
    return NextResponse.json({ error: "AI features not configured" }, { status: 503 });
  }

  const rateLimited = await checkRateLimit(req, {
    key: `ai:store-structure:${user.firebaseUid}`,
    max: 10,
    window: 3600,
    message: "AI suggestion limit reached — try again in an hour.",
  });
  if (rateLimited) return rateLimited;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { description } = parsed.data;

  const prompt = [
    `A merchant described their store like this: "${description}"`,
    "",
    `Pick the single best-fitting category from this exact list (respond with the exact text, nothing else): ${PRIMARY_CATEGORIES.join(", ")}`,
    "",
    `Then suggest up to ${MAX_CATEGORIES} product categories for organizing their catalogue, each with up to ${MAX_SUBCATEGORIES} subcategories. Base these specifically on what the merchant described — don't invent unrelated product lines, and don't pad the list just to hit the maximum.`,
    "",
    'Respond with ONLY minified JSON: {"primaryCategory": string, "categories": [{"name": string, "subcategories": string[]}]}',
  ].join("\n");

  try {
    const raw = await generateText({
      system:
        "You help small/informal online merchants organize their store's catalogue. Be practical and specific to what they described, not generic.",
      prompt,
      maxTokens: 500,
      temperature: 0.5,
    });

    let result: { primaryCategory: unknown; categories: unknown };
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      return NextResponse.json(
        { error: "Couldn't generate suggestions — try a more detailed description." },
        { status: 422 }
      );
    }

    // Never trust the model's output shape or content blindly: constrain
    // primaryCategory to the actual known list, and sanitize/cap the
    // category tree rather than passing arbitrary AI-generated strings
    // straight through to category creation.
    const primaryCategory =
      typeof result.primaryCategory === "string" &&
      (PRIMARY_CATEGORIES as readonly string[]).includes(result.primaryCategory)
        ? result.primaryCategory
        : null;

    const categories: SuggestedCategory[] = Array.isArray(result.categories)
      ? result.categories
          .filter(
            (c: unknown): c is { name: unknown; subcategories?: unknown } =>
              !!c && typeof c === "object" && typeof (c as { name?: unknown }).name === "string"
          )
          .slice(0, MAX_CATEGORIES)
          .map((c) => ({
            name: String(c.name).trim().slice(0, 100),
            subcategories: Array.isArray(c.subcategories)
              ? c.subcategories
                  .filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
                  .slice(0, MAX_SUBCATEGORIES)
                  .map((s: string) => s.trim().slice(0, 100))
              : [],
          }))
          .filter((c) => c.name.length > 0)
      : [];

    if (!categories.length) {
      return NextResponse.json(
        { error: "Couldn't generate suggestions — try a more detailed description." },
        { status: 422 }
      );
    }

    // No store yet during onboarding — getUserStore resolves to null there,
    // and logAiUsage accepts that (see its own comment for why).
    const store = await getUserStore(user.firebaseUid);
    await logAiUsage(store?.id ?? null, "store-structure", "groq");

    return NextResponse.json({ primaryCategory, categories });
  } catch {
    return NextResponse.json({ error: "AI generation failed. Try again." }, { status: 502 });
  }
}

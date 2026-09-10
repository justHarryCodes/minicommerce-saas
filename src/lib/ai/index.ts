import { query } from "@/lib/db";
import { generateText } from "./groq";
import { analyzeImage } from "./gemini";

export { generateText } from "./groq";
export { analyzeImage } from "./gemini";

export interface AiAvailability {
  groq: boolean;
  gemini: boolean;
}

/** Presence-check only — no network call. Routes should short-circuit on this before doing any work. */
export function isAiEnabled(): AiAvailability {
  return {
    groq: !!process.env.GROQ_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
  };
}

/**
 * Best-effort usage counter — never blocks or throws on the caller.
 * storeId is nullable: suggest-store-structure runs during onboarding,
 * before a store row exists yet, unlike every other AI feature here.
 */
export async function logAiUsage(storeId: string | null, feature: string, provider: "groq" | "gemini") {
  try {
    await query(
      `INSERT INTO ai_usage_log (store_id, feature, provider) VALUES ($1, $2, $3)`,
      [storeId, feature, provider]
    );
  } catch {
    // Non-blocking — a logging failure must never break the AI feature itself.
  }
}

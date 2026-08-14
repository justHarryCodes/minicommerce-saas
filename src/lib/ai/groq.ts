// ─── Groq text generation ─────────────────────────────────────────
// Plain REST call against Groq's OpenAI-compatible chat-completions endpoint
// — no SDK dependency, matching this codebase's existing style (raw `pg`,
// raw `ioredis`, hand-rolled HMAC rather than a payments SDK).
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export interface GenerateTextOptions {
  system?: string;
  prompt: string;
  maxTokens?: number;
  /** 0-1, defaults to a low value — this is assistive copy, not creative writing. */
  temperature?: number;
}

export async function generateText({
  system,
  prompt,
  maxTokens = 400,
  temperature = 0.4,
}: GenerateTextOptions): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  const messages = [
    ...(system ? [{ role: "system", content: system }] : []),
    { role: "user", content: prompt },
  ];

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || DEFAULT_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq request failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("Groq returned an unexpected response shape");
  return text.trim();
}

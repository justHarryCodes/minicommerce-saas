// ─── Groq text generation ─────────────────────────────────────────
// Plain REST call against Groq's OpenAI-compatible chat-completions endpoint
// — no SDK dependency, matching this codebase's existing style (raw `pg`,
// raw `ioredis`, hand-rolled HMAC rather than a payments SDK).
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// llama-3.3-70b-versatile was retired from Groq's catalog (confirmed via a
// live GET /openai/v1/models call — it's gone from the response entirely,
// which is why every AI call was failing). openai/gpt-oss-120b is Groq's
// current largest general-purpose instruction-tuned text model — used here
// over the smaller openai/gpt-oss-20b because product copy and the shopping
// assistant are quality-sensitive; Groq's inference speed advantage holds
// at this size too, so there's no meaningful latency trade-off.
// Verify current models periodically: `curl -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models`
const DEFAULT_MODEL = "openai/gpt-oss-120b";

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
      // openai/gpt-oss-* models (the current default and .env value) are
      // reasoning models: they emit a separate `reasoning` (chain-of-thought)
      // field alongside `content`, billed from the same max_tokens budget.
      // Confirmed live against the real API: at the default effort, a
      // moderately complex prompt burned the entire budget on reasoning and
      // never produced any content at all (finish_reason: "length", content:
      // "", reasoning_tokens: 498/500). "low" cut that to 41 reasoning
      // tokens with a clean, complete answer and finish_reason: "stop" on
      // the identical prompt. Every caller of generateText() benefits from
      // this, not just complex ones — a simple prompt just spends fewer of
      // its "low" tokens on reasoning, it doesn't need more effort than that
      // for assistive copy/classification tasks. If GROQ_MODEL is ever
      // switched to a non-reasoning model, this field is expected to be
      // silently ignored (OpenAI-compatible APIs generally don't error on
      // unrecognized parameters) — hasn't been verified against every
      // possible model, so revisit if a future model swap misbehaves.
      reasoning_effort: "low",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq request failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const json = await res.json();
  const choice = json?.choices?.[0];
  const text = choice?.message?.content;
  if (typeof text !== "string" || text.length === 0) {
    // A reasoning model can legitimately return finish_reason: "length"
    // with empty content if it ran out of budget mid-thought (see comment
    // above) — surface that distinctly from a truly malformed response,
    // since the fix differs (raise maxTokens) from a real API-shape change.
    const reason = choice?.finish_reason ?? "unknown";
    throw new Error(
      reason === "length"
        ? "Groq ran out of tokens before producing a response (finish_reason: length) — try raising maxTokens"
        : `Groq returned an unexpected response shape (finish_reason: ${reason})`
    );
  }
  return text.trim();
}

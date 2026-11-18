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

// ─── Chat with tools (the Duka Assistant) ─────────────────────────
export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };
export interface ToolCall { id: string; type: "function"; function: { name: string; arguments: string } }

/** Groq said "too many tokens per minute" and the wait is too long to sit through. */
export class GroqRateLimitError extends Error {
  constructor(public retryAfterSeconds: number) { super(`Groq rate limit (retry in ${retryAfterSeconds}s)`); }
}

/**
 * One chat-completions round with tools. Returns the assistant message
 * (text and/or tool calls). Short rate-limit waits (≤ 8s) and transient
 * server errors are retried; a longer rate limit throws GroqRateLimitError so
 * the caller can switch to a lighter model.
 */
export async function chatWithTools(opts: {
  messages: ChatMessage[];
  tools: unknown[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ content: string | null; toolCalls: ToolCall[]; finishReason: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");
  const body = JSON.stringify({
    model: opts.model || process.env.GROQ_ASSISTANT_MODEL || process.env.GROQ_MODEL || DEFAULT_MODEL,
    messages: opts.messages,
    tools: opts.tools,
    tool_choice: "auto",
    max_tokens: opts.maxTokens ?? 1600,
    temperature: opts.temperature ?? 0.3,
    reasoning_effort: "low",
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body,
      signal: AbortSignal.timeout(45_000),
    });
    if (res.ok) {
      const json = await res.json();
      const choice = json?.choices?.[0];
      return {
        content: typeof choice?.message?.content === "string" ? choice.message.content : null,
        toolCalls: Array.isArray(choice?.message?.tool_calls) ? choice.message.tool_calls : [],
        finishReason: choice?.finish_reason ?? "unknown",
      };
    }
    const detail = await res.text().catch(() => "");
    if (res.status === 429) {
      const hinted = Number(res.headers.get("retry-after")) || Number(detail.match(/try again in ([d.]+)s/i)?.[1]) || 0;
      const wait = Math.ceil(hinted || 2);
      if (wait <= 8 && attempt < 2) { await new Promise((r) => setTimeout(r, wait * 1000 + 250)); continue; }
      throw new GroqRateLimitError(wait);
    }
    if (res.status >= 500 && attempt < 2) { await new Promise((r) => setTimeout(r, 1200)); continue; }
    throw new Error(`Groq request failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  throw new Error("Groq request failed");
}

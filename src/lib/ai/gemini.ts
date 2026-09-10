// ─── Gemini vision analysis ───────────────────────────────────────
// Plain REST call against Gemini's generateContent endpoint. Used for
// analysis/classification (e.g. "which category does this product photo
// belong to") — not for pixel editing. Actual background removal/photo
// cleanup is a Cloudinary AI add-on (`e_background_removal` transform)
// bolted onto the existing /api/upload pipeline, not this.
// gemini-2.0-flash was retired from Google's catalog (confirmed via a live
// GET /v1beta/models call — absent from the response). Using the
// "-latest" alias rather than a dated model name this time: Google keeps
// it pointed at their current recommended stable Flash model, so this
// specific failure mode (a hardcoded model name quietly going away)
// shouldn't recur for this task. Category suggestion from a single photo
// doesn't need Pro-tier reasoning, so Flash is the right tier regardless
// of which dated version "-latest" currently resolves to.
// Verify current models periodically: `curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"`
const DEFAULT_MODEL = "gemini-flash-latest";

export interface AnalyzeImageOptions {
  imageUrl: string;
  prompt: string;
  maxTokens?: number;
}

async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Could not fetch image for analysis (${res.status})`);
  const mimeType = res.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { data: buffer.toString("base64"), mimeType };
}

export async function analyzeImage({
  imageUrl,
  prompt,
  maxTokens = 200,
}: AnalyzeImageOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const { data, mimeType } = await fetchImageAsBase64(imageUrl);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data } }],
        },
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.2,
        // gemini-3.x Flash models "think" before answering by default, and
        // that reasoning is billed from the same maxOutputTokens budget —
        // with a small budget (this is short classification/tagging, not
        // deep reasoning) thinking alone can consume it entirely, leaving
        // zero tokens for the actual answer (finishReason: MAX_TOKENS,
        // empty content — confirmed live against the real API). Disabled
        // outright: it's both wrong for this task and wasted cost/latency.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini request failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const json = await res.json();
  const candidate = json?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error(
      `Gemini returned an unexpected response shape (finishReason: ${candidate?.finishReason ?? "unknown"})`
    );
  }
  return text.trim();
}

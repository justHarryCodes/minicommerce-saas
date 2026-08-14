// ─── Gemini vision analysis ───────────────────────────────────────
// Plain REST call against Gemini's generateContent endpoint. Used for
// analysis/classification (e.g. "which category does this product photo
// belong to") — not for pixel editing. Actual background removal/photo
// cleanup is a Cloudinary AI add-on (`e_background_removal` transform)
// bolted onto the existing /api/upload pipeline, not this.
const DEFAULT_MODEL = "gemini-2.0-flash";

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
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini request failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new Error("Gemini returned an unexpected response shape");
  return text.trim();
}

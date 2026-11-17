// Images the server may download on someone's behalf (e.g. to have AI look at
// a product photo). Only HTTPS URLs on the image hosts Duka itself uploads to:
// never an internal address, the cloud metadata service or an arbitrary site
// (server-side request forgery).

const EXACT_HOSTS = new Set([
  "res.cloudinary.com",
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
]);
const ROOT_DOMAINS = ["dukanigeria.com", "awarizonmall.com"];

/** Biggest image the server will pull into memory. */
export const MAX_REMOTE_IMAGE_BYTES = 10 * 1024 * 1024;

export function isAllowedImageUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;
  const host = url.hostname.toLowerCase();
  return EXACT_HOSTS.has(host) || ROOT_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

/**
 * Download an allowed image: no redirects (a redirect could point anywhere),
 * image content only, and never more than MAX_REMOTE_IMAGE_BYTES.
 */
export async function fetchAllowedImage(raw: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!isAllowedImageUrl(raw)) throw new Error("Image address not allowed");
  const res = await fetch(raw, { redirect: "error", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Could not fetch image (${res.status})`);
  const mimeType = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!mimeType.startsWith("image/")) throw new Error("Not an image");
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared > MAX_REMOTE_IMAGE_BYTES) throw new Error("Image too large");

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Empty image");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REMOTE_IMAGE_BYTES) {
      await reader.cancel().catch(() => {});
      throw new Error("Image too large");
    }
    chunks.push(value);
  }
  return { buffer: Buffer.concat(chunks), mimeType };
}

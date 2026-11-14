// AES-256-GCM for vendors' Meta access tokens at rest. The key is
// META_TOKEN_ENCRYPTION_KEY (64 hex chars). Format: v1.<iv>.<tag>.<data>, base64url.

import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { metaAppSecret, tokenCryptoReady } from "./config";

function key(): Buffer {
  if (!tokenCryptoReady()) throw new Error("META_TOKEN_ENCRYPTION_KEY is not set");
  return Buffer.from(process.env.META_TOKEN_ENCRYPTION_KEY!.trim(), "hex");
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptToken(stored: string): string | null {
  try {
    const [v, iv, tag, data] = stored.split(".");
    if (v !== "v1" || !iv || !tag || !data) return null;
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Meta signs every webhook: X-Hub-Signature-256: sha256=<hmac of the raw body>. */
export function verifyMetaSignature(rawBody: string, header: string | null): boolean {
  const secret = metaAppSecret();
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const given = Buffer.from(header.slice(7), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

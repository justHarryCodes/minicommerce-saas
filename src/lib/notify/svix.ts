import crypto from "crypto";

// Resend signs webhooks the Svix way: HMAC-SHA256 over "id.timestamp.body"
// with the base64 secret after "whsec_", sent as "v1,<base64>" (possibly
// several, space-separated). Rejects anything older than 5 minutes.
export function verifySvix(secret: string, id: string, timestamp: string, body: string, signatureHeader: string, now = Date.now()): boolean {
  if (!secret || !id || !timestamp || !signatureHeader) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signatureHeader.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const got = Buffer.from(sig, "base64");
    return got.length === expected.length && crypto.timingSafeEqual(got, expected);
  });
}

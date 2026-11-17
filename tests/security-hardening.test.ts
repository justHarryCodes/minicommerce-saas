import { describe, expect, it } from "vitest";
import { isAllowedImageUrl } from "@/lib/safe-image-url";
import { getClientIp } from "@/lib/rate-limit";
import { isRecentSignIn, RECENT_SIGN_IN_MS } from "@/lib/session-freshness";

describe("server-side image downloads only reach Duka's image hosts (no SSRF)", () => {
  it.each([
    "https://res.cloudinary.com/demo/image/upload/a.jpg",
    "https://firebasestorage.googleapis.com/v0/b/x/o/a.png",
    "https://storage.googleapis.com/bucket/a.webp",
    "https://shop.dukanigeria.com/a.jpg",
    "https://dukanigeria.com/a.jpg",
  ])("allows %s", (u) => expect(isAllowedImageUrl(u)).toBe(true));

  it.each([
    "http://res.cloudinary.com/a.jpg", // not https
    "https://169.254.169.254/latest/meta-data/", // cloud metadata
    "https://localhost/a.jpg",
    "https://127.0.0.1/a.jpg",
    "https://10.0.0.5/a.jpg",
    "https://evil.com/a.jpg",
    "https://dukanigeria.com.evil.com/a.jpg", // look-alike suffix
    "https://evildukanigeria.com/a.jpg",
    "https://user:pass@res.cloudinary.com/a.jpg",
    "https://res.cloudinary.com:8443/a.jpg",
    "file:///etc/passwd",
    "not a url",
  ])("refuses %s", (u) => expect(isAllowedImageUrl(u)).toBe(false));
});

describe("rate limits key on an IP the visitor cannot forge", () => {
  const req = (h: Record<string, string>) => new Request("https://dukanigeria.com/x", { headers: h });

  it("prefers Cloudflare's CF-Connecting-IP over a forged X-Forwarded-For", () => {
    expect(getClientIp(req({ "cf-connecting-ip": "41.58.1.2", "x-forwarded-for": "1.2.3.4, 41.58.1.2" }))).toBe("41.58.1.2");
  });
  it("never uses the client-written first X-Forwarded-For entry", () => {
    expect(getClientIp(req({ "x-forwarded-for": "6.6.6.6, 41.58.1.2" }))).toBe("41.58.1.2");
  });
  it("uses the proxy's X-Real-IP when there is no Cloudflare header", () => {
    expect(getClientIp(req({ "x-real-ip": "41.58.9.9", "x-forwarded-for": "6.6.6.6" }))).toBe("41.58.9.9");
  });
  it("falls back to a fixed bucket when nothing is known", () => {
    expect(getClientIp(req({}))).toBe("0.0.0.0");
  });
});

describe("sessions are only minted from a fresh sign-in", () => {
  const now = 1_800_000_000_000;
  it("accepts a sign-in from just now", () => expect(isRecentSignIn(now / 1000 - 30, now)).toBe(true));
  it("refuses an old sign-in (a replayed token)", () => expect(isRecentSignIn((now - RECENT_SIGN_IN_MS - 1000) / 1000, now)).toBe(false));
  it("refuses a token without auth_time", () => expect(isRecentSignIn(undefined, now)).toBe(false));
});

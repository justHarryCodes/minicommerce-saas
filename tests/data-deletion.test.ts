import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn() }));
vi.mock("@/lib/paystack", () => ({ getAppUrl: () => "https://dukanigeria.com" }));
vi.mock("@/lib/notify/providers", () => ({ sendEmail: vi.fn(), emailConfigured: () => true, htmlToText: (h: string) => h }));
vi.mock("@/lib/webpush", () => ({ sendWebPushToAllAdmins: vi.fn(async () => {}) }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(async () => null) }));

import { query, queryOne } from "@/lib/db";
import { sendEmail } from "@/lib/notify/providers";
import { newDeletionCode, normaliseCode, parseSignedRequest } from "@/lib/data-deletion";
import { POST as formPOST } from "@/app/api/data-deletion/route";
import { POST as metaPOST } from "@/app/api/meta/data-deletion/route";

const SECRET = "app-secret";
const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function signed(payload: object, secret = SECRET) {
  const p = b64url(JSON.stringify(payload));
  return `${b64url(createHmac("sha256", secret).update(p).digest())}.${p}`;
}

describe("codes", () => {
  it("are DEL- plus 8 unambiguous characters", () => {
    for (let i = 0; i < 50; i++) expect(newDeletionCode()).toMatch(/^DEL-[A-HJKMNP-Z2-9]{8}$/);
  });
  it("accept what people type", () => {
    expect(normaliseCode("del-ab12cd34")).toBe("DEL-AB12CD34");
    expect(normaliseCode(" AB12 CD34 ")).toBe("DEL-AB12CD34");
    expect(normaliseCode("DEL-123")).toBeNull();
    expect(normaliseCode("'; drop table x")).toBeNull();
  });
});

describe("Meta signed_request", () => {
  it("accepts a correctly signed request", () => {
    expect(parseSignedRequest(signed({ algorithm: "HMAC-SHA256", user_id: "123", issued_at: 1 }), SECRET)?.user_id).toBe("123");
  });
  it("rejects a wrong secret, tampering, a bad algorithm and junk", () => {
    expect(parseSignedRequest(signed({ algorithm: "HMAC-SHA256", user_id: "1" }, "other"), SECRET)).toBeNull();
    const [sig] = signed({ algorithm: "HMAC-SHA256", user_id: "1" }).split(".");
    expect(parseSignedRequest(`${sig}.${b64url(JSON.stringify({ algorithm: "HMAC-SHA256", user_id: "2" }))}`, SECRET)).toBeNull();
    expect(parseSignedRequest(signed({ algorithm: "none", user_id: "1" }), SECRET)).toBeNull();
    expect(parseSignedRequest("abc", SECRET)).toBeNull();
    expect(parseSignedRequest(signed({ algorithm: "HMAC-SHA256", user_id: "1" }), "")).toBeNull();
  });
});

describe("routes", () => {
  beforeEach(() => {
    process.env.META_APP_SECRET = SECRET;
    vi.mocked(sendEmail).mockReset().mockResolvedValue({ ok: true });
    vi.mocked(queryOne).mockReset().mockResolvedValue(null);
    vi.mocked(query).mockReset().mockImplementation(async (sql: unknown, params?: unknown[]) =>
      (String(sql).includes("INSERT INTO data_deletion_requests") ? [{ code: params?.[0] }] : []) as never,
    );
  });

  const form = (body: object) => new NextRequest("http://x/api/data-deletion", { method: "POST", body: JSON.stringify(body) });

  it("the form logs the request, emails the team and the person", async () => {
    const res = await formPOST(form({ role: "customer", email: "Ada@Example.com", storeName: "Amaka", details: "<b>hi</b>" }));
    const data = await res.json();
    expect(data.code).toMatch(/^DEL-/);
    const insert = vi.mocked(query).mock.calls.find(([s]) => String(s).includes("INSERT INTO data_deletion_requests"))!;
    expect(insert[1]).toEqual([data.code, "web", "customer", "ada@example.com", null, "Amaka", "<b>hi</b>", null]);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    const [toTeam, toPerson] = vi.mocked(sendEmail).mock.calls;
    expect(toTeam[0]).toBe(process.env.EMAIL_REPLY_TO || "support@dukanigeria.com");
    expect(toTeam[2]).toContain("&lt;b&gt;hi&lt;/b&gt;"); // escaped
    expect(toTeam[3]).toBe("Ada@Example.com"); // reply goes to the person
    expect(toPerson[0]).toBe("Ada@Example.com");
    expect(toPerson[2]).toContain(`https://dukanigeria.com/data-deletion?code=${data.code}`);
  });

  it("the form rejects bad emails and silently drops bots", async () => {
    expect((await formPOST(form({ role: "vendor", email: "nope" }))).status).toBe(422);
    const bot = await (await formPOST(form({ role: "vendor", email: "a@b.co", website: "spam" }))).json();
    expect(bot).toEqual({ ok: true, code: null });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  const meta = (sr: string) => {
    const body = new URLSearchParams({ signed_request: sr });
    return new NextRequest("http://x/api/meta/data-deletion", { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  };

  it("Meta's callback answers with a status URL and confirmation code", async () => {
    const res = await metaPOST(meta(signed({ algorithm: "HMAC-SHA256", user_id: "987" })));
    const data = await res.json();
    expect(data.confirmation_code).toMatch(/^DEL-/);
    expect(data.url).toBe(`https://dukanigeria.com/data-deletion?code=${data.confirmation_code}`);
    const insert = vi.mocked(query).mock.calls.find(([s]) => String(s).includes("INSERT INTO data_deletion_requests"))!;
    expect(insert[1]?.[1]).toBe("meta");
    expect(insert[1]?.[7]).toBe("987");
  });

  it("Meta's callback reuses an open request and refuses forged ones", async () => {
    vi.mocked(queryOne).mockResolvedValue({ code: "DEL-AAAAAAAA" } as never);
    expect((await (await metaPOST(meta(signed({ algorithm: "HMAC-SHA256", user_id: "987" })))).json()).confirmation_code).toBe("DEL-AAAAAAAA");
    expect((await metaPOST(meta(signed({ algorithm: "HMAC-SHA256", user_id: "987" }, "forged")))).status).toBe(400);
  });
});

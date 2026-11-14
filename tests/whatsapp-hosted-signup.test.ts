import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { randomBytes } from "crypto";
import { NextRequest } from "next/server";

vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: () => {} }));
vi.mock("@/lib/db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }));
vi.mock("@/lib/plan", () => ({ hasFeature: vi.fn(async () => true) }));
vi.mock("@/lib/auth", () => ({ verifySession: vi.fn(async () => null), getUserStore: vi.fn(async () => null) }));
vi.mock("@/lib/paystack", () => ({ getAppUrl: () => "https://dukanigeria.com" }));

import { query } from "@/lib/db";
import { readSignupState, signupState } from "@/lib/meta/connect";
import { GET } from "@/app/api/meta/es-callback/route";

// Meta-hosted Embedded Signup: the redirect back to /api/meta/es-callback.

const STORE = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  Object.assign(process.env, {
    META_APP_ID: "123",
    META_APP_SECRET: "app-secret",
    META_WEBHOOK_VERIFY_TOKEN: "v",
    META_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
    META_ES_HOSTED_URL: "https://business.facebook.com/messaging/whatsapp/onboard/?app_id=123&config_id=9",
  });
  vi.mocked(query).mockClear();
});
afterEach(() => {
  delete process.env.META_ES_HOSTED_URL;
  vi.unstubAllGlobals();
});

const call = (qs: string) => GET(new NextRequest(`https://dukanigeria.com/api/meta/es-callback?${qs}`));
const where = (res: Response) => new URL(res.headers.get("location")!);

describe("signup state", () => {
  it("names the store, can't be forged, and expires", () => {
    const s = signupState(STORE, 1_000_000);
    expect(readSignupState(s, 1_000_000 + 60_000)).toBe(STORE);
    expect(readSignupState(s.replace(STORE, "00000000-0000-4000-8000-000000000002"), 1_000_000)).toBeNull();
    expect(readSignupState(s, 1_000_000 + 3 * 60 * 60 * 1000)).toBeNull();
    expect(readSignupState(null)).toBeNull();
  });
});

describe("callback", () => {
  it("doesn't exist without the hosted link configured", async () => {
    delete process.env.META_ES_HOSTED_URL;
    expect((await call("code=abc")).status).toBe(404);
  });

  it("cancelled or missing code goes back to Channels with a message", async () => {
    expect(where(await call("error=access_denied&error_description=User+cancelled")).searchParams.get("whatsapp")).toBe("cancelled");
    expect(where(await call("state=x")).searchParams.get("whatsapp")).toBe("error");
  });

  it("without a valid state or a signed-in owner, nothing is connected", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const r = where(await call("code=abc&state=forged.state.sig"));
    expect(r.searchParams.get("whatsapp")).toBe("error");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("exchanges the code with the same redirect URI, finds the account and number, links and saves them", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        const u = String(url);
        calls.push(u);
        if (u.includes("/oauth/access_token")) return new Response(JSON.stringify({ access_token: "BIZ-TOKEN" }));
        if (u.includes("/debug_token")) return new Response(JSON.stringify({ data: { granular_scopes: [{ scope: "whatsapp_business_management", target_ids: ["WABA9"] }] } }));
        if (u.includes("/WABA9/phone_numbers")) return new Response(JSON.stringify({ data: [{ id: "PH9" }] }));
        if (u.includes("/PH9?")) return new Response(JSON.stringify({ display_phone_number: "+234 801 234 5678", verified_name: "Amaka Styles" }));
        return new Response(JSON.stringify({ success: true }));
      }),
    );
    const res = await call(`code=abc&state=${encodeURIComponent(signupState(STORE))}`);
    expect(where(res).pathname).toBe("/dashboard/channels");
    expect(where(res).searchParams.get("whatsapp")).toBe("connected");
    const exchange = new URL(calls.find((c) => c.includes("oauth/access_token"))!);
    expect(exchange.searchParams.get("redirect_uri")).toBe("https://dukanigeria.com/api/meta/es-callback");
    expect(calls.some((c) => c.includes("/WABA9/subscribed_apps"))).toBe(true);
    expect(calls.some((c) => c.includes("/PH9/register"))).toBe(true);
    const insert = vi.mocked(query).mock.calls.find(([s]) => String(s).includes("INSERT INTO social_connections"))!;
    expect(insert[1]?.slice(0, 5)).toEqual([STORE, "PH9", "WABA9", "Amaka Styles", "+234 801 234 5678"]);
    expect(String(insert[1]?.[5])).toMatch(/^v1\./); // token stored encrypted
    expect(JSON.stringify(insert[1])).not.toContain("BIZ-TOKEN");
  });
});

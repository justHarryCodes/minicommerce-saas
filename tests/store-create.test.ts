import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ verifySession: vi.fn() }));
vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn(), toCamel: (x: unknown) => x }));
vi.mock("@/lib/categories", () => ({ ensureUncategorized: vi.fn() }));

import { POST } from "@/app/api/stores/route";
import { verifySession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

// Opening a store: a rejected form must say which field is wrong (the
// onboarding page shows the message as-is), and nothing optional may block it.

const post = (body: unknown) =>
  POST(new NextRequest("http://x.test/api/stores", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }));

const valid = { name: "Amaka's Boutique", slug: "amaka", paymentMethods: ["paystack"] };

beforeEach(() => {
  vi.mocked(verifySession).mockResolvedValue({ firebaseUid: "uid-1" } as never);
  vi.mocked(queryOne).mockReset().mockResolvedValue(null);
  vi.mocked(query).mockReset().mockResolvedValue([{ id: "store-1", slug: "amaka" }] as never);
});

describe("POST /api/stores", () => {
  it("creates a store", async () => {
    const res = await post(valid);
    expect(res.status).toBe(201);
  });

  it("names the field when validation fails", async () => {
    const res = await post({ ...valid, name: "A" });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
    expect(body.error).toMatch(/Store name/);
  });

  it("accepts long descriptions and formatted phone numbers", async () => {
    const res = await post({ ...valid, description: "x".repeat(900), phone: "+234 (0) 803 123 4567" });
    expect(res.status).toBe(201);
  });

  it("ignores a malformed referral code instead of failing", async () => {
    const res = await post({ ...valid, referralCode: "THIS-IS-WAY-TOO-LONG-FOR-A-CODE" });
    expect(res.status).toBe(201);
  });

  it("turns a double-submit race into a clear message", async () => {
    vi.mocked(query).mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "23505", constraint: "stores_owner_id_key" }));
    const res = await post(valid);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Store already exists");
  });
});

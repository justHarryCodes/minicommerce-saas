import { beforeEach, describe, expect, it, vi } from "vitest";

// The DB is mocked: codes live in a Map keyed by their SHA-256 hash.
const rows = new Map<string, { uid: string; expires: number }>();
vi.mock("@/lib/db", () => ({
  query: vi.fn(async (sql: string, params: unknown[] = []) => {
    if (sql.startsWith("INSERT INTO mobile_auth_codes")) rows.set(params[0] as string, { uid: params[1] as string, expires: Date.now() + (params[2] as number) * 1000 });
    return [];
  }),
  queryOne: vi.fn(async (sql: string, params: unknown[] = []) => {
    if (!sql.startsWith("DELETE FROM mobile_auth_codes WHERE code_hash")) return null;
    const r = rows.get(params[0] as string);
    rows.delete(params[0] as string);
    return r && r.expires > Date.now() ? { firebase_uid: r.uid } : null;
  }),
}));

import { createHandoffCode, isAppRedirect, redeemHandoffCode } from "@/lib/mobile-auth";

describe("app Google sign-in hand-off", () => {
  beforeEach(() => rows.clear());

  it("only sends codes back to the vendor app's own link schemes", () => {
    expect(isAppRedirect("duka-vendors://auth")).toBe(true);
    expect(isAppRedirect("exp+duka-vendors://auth")).toBe(true);
    expect(isAppRedirect("https://evil.example/steal")).toBe(false);
    expect(isAppRedirect("javascript:alert(1)")).toBe(false);
    expect(isAppRedirect("other-app://auth")).toBe(false);
    expect(isAppRedirect("duka-vendors://auth\"><script>")).toBe(false);
    expect(isAppRedirect(null)).toBe(false);
  });

  it("stores only a hash and lets each code be used once", async () => {
    const code = await createHandoffCode("uid-123");
    expect(code).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect([...rows.keys()][0]).not.toBe(code); // hashed at rest
    expect(await redeemHandoffCode(code)).toBe("uid-123");
    expect(await redeemHandoffCode(code)).toBeNull(); // single use
  });

  it("rejects malformed and unknown codes", async () => {
    expect(await redeemHandoffCode("short")).toBeNull();
    expect(await redeemHandoffCode("x".repeat(43))).toBeNull();
    expect(await redeemHandoffCode("bad code with spaces and more characters!!")).toBeNull();
  });
});

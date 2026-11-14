import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn() }));
vi.mock("@/lib/paystack", () => ({ getAppUrl: () => "https://dukanigeria.com" }));
vi.mock("@/lib/notify/providers", () => ({ sendEmail: vi.fn(), emailConfigured: () => true, htmlToText: (h: string) => h }));
vi.mock("@/lib/admin-auth", () => ({ verifyAdminSession: vi.fn(), logAdminAction: vi.fn(async () => {}) }));
vi.mock("@/lib/redis", () => ({ cacheDel: vi.fn(async () => {}) }));
vi.mock("@/lib/firebase-admin", () => ({ adminAuth: { deleteUser: vi.fn(async () => {}) } }));

import { query, queryOne } from "@/lib/db";
import { sendEmail } from "@/lib/notify/providers";
import { verifyAdminSession, logAdminAction } from "@/lib/admin-auth";
import { adminAuth } from "@/lib/firebase-admin";
import { PATCH } from "@/app/api/admin/data-requests/[code]/route";

// Admin -> Data requests: confirming / closing deletion requests.

const STORE = "3f1c2b9e-1111-4222-8333-444455556666";
const call = (code: string, body: object) =>
  PATCH(new NextRequest(`http://x/api/admin/data-requests/${code}`, { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ code }) });

let request: Record<string, unknown> | null;
beforeEach(() => {
  request = { code: "DEL-AB12CD34", status: "received", email: "ada@example.com", source: "web" };
  vi.mocked(verifyAdminSession).mockResolvedValue({ firebaseUid: "a", email: "boss@dukanigeria.com", role: "admin" });
  vi.mocked(sendEmail).mockReset().mockResolvedValue({ ok: true });
  vi.mocked(logAdminAction).mockClear();
  vi.mocked(adminAuth.deleteUser).mockClear();
  vi.mocked(queryOne).mockReset().mockImplementation(async (sql: unknown) => {
    const s = String(sql);
    if (s.includes("FROM data_deletion_requests")) return request as never;
    if (s.includes("FROM stores")) return { id: STORE, slug: "amaka", owner_id: "uid-1" } as never;
    return null as never;
  });
  vi.mocked(query).mockReset().mockImplementation(async (sql: unknown) => (String(sql).includes("UPDATE data_deletion_requests") ? [{ code: "x" }] : []) as never);
});

const updates = () => vi.mocked(query).mock.calls.filter(([s]) => String(s).includes("UPDATE data_deletion_requests"));

describe("admin data requests", () => {
  it("is admin-only", async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue(null);
    expect((await call("DEL-AB12CD34", { action: "complete" })).status).toBe(403);
  });

  it("start moves it to in progress without emailing", async () => {
    expect(await (await call("del-ab12cd34", { action: "start" })).json()).toEqual({ ok: true, status: "in_progress" });
    expect(updates()[0][1]).toEqual(["DEL-AB12CD34", "in_progress", "boss@dukanigeria.com", null]);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("delete_store wipes the vendor's account, completes, logs and emails them", async () => {
    const res = await call("DEL-AB12CD34", { action: "delete_store", storeId: STORE });
    expect(await res.json()).toEqual({ ok: true, status: "completed" });
    const wipe = vi.mocked(query).mock.calls.find(([s]) => String(s).includes("UPDATE stores"))!;
    expect(String(wipe[0])).toContain("bank_account_number = NULL");
    expect(String(wipe[0])).toContain("name = 'Deleted Store'"); // SQL keeps its quotes
    expect(wipe[1]).toEqual([STORE]);
    expect(adminAuth.deleteUser).toHaveBeenCalledWith("uid-1");
    expect(updates()[0][1]?.[3]).toBe("Deleted store amaka");
    expect(logAdminAction).toHaveBeenCalledWith(expect.objectContaining({ action: "data_deletion_delete_store", targetId: STORE }));
    expect(vi.mocked(sendEmail).mock.calls[0][0]).toBe("ada@example.com");
    expect(vi.mocked(sendEmail).mock.calls[0][1]).toContain("deleted");
  });

  it("reject needs a reason, which is escaped into the email", async () => {
    expect((await call("DEL-AB12CD34", { action: "reject" })).status).toBe(422);
    await call("DEL-AB12CD34", { action: "reject", note: "Email us from <your> sign-in email" });
    expect(vi.mocked(sendEmail).mock.calls[0][2]).toContain("Email us from &lt;your&gt; sign-in email");
  });

  it("won't touch a closed request, or one another admin just closed", async () => {
    request = { ...request, status: "completed" };
    expect((await call("DEL-AB12CD34", { action: "complete" })).status).toBe(409);
    request = { ...request, status: "received" };
    vi.mocked(query).mockImplementation(async () => [] as never);
    expect((await call("DEL-AB12CD34", { action: "complete" })).status).toBe(409);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("Meta requests (no email) complete without sending mail", async () => {
    request = { code: "DEL-AB12CD34", status: "received", email: null, source: "meta" };
    expect((await call("DEL-AB12CD34", { action: "complete" })).status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

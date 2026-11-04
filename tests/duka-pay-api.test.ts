import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ verifySession: vi.fn() }));
vi.mock("@/lib/access", () => ({ getStoreFor: vi.fn() }));
vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(async () => null) }));
vi.mock("@/lib/store-cache", () => ({ invalidateStore: vi.fn() }));
vi.mock("@/lib/duka-pay", () => ({
  listBanks: vi.fn(async () => [{ name: "Access Bank", code: "044" }]),
  resolveAccount: vi.fn(async () => ({ ok: true, accountName: "AMAKA STORES" })),
  upsertSubaccount: vi.fn(async () => ({ ok: true, code: "ACCT_amaka" })),
  platformFeePercent: () => 1,
}));

import { GET, POST } from "@/app/api/dashboard/duka-pay/route";
import { verifySession } from "@/lib/auth";
import { getStoreFor } from "@/lib/access";
import { query, queryOne } from "@/lib/db";
import { upsertSubaccount, resolveAccount } from "@/lib/duka-pay";
import { invalidateStore } from "@/lib/store-cache";

// Connecting a Duka Pay payout account: owner only, the bank names the
// account holder, and nothing is created on Paystack until the owner confirms.

const row = {
  id: "store-1", slug: "amaka", name: "Amaka", email: null, phone: null, bank_name: null, bank_account_number: null,
  bank_account_name: null, settlement_bank_code: null, paystack_subaccount_code: null, duka_pay_status: "not_connected", duka_pay_connected_at: null,
};
const post = (body: unknown) => POST(new NextRequest("http://x.test/api/dashboard/duka-pay", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifySession).mockResolvedValue({ firebaseUid: "u1" } as never);
  vi.mocked(getStoreFor).mockResolvedValue({ id: "store-1", slug: "amaka" } as never);
  vi.mocked(queryOne).mockResolvedValue(row as never);
});

describe("Duka Pay payout account API", () => {
  it("only the owner can see or change it", async () => {
    vi.mocked(getStoreFor).mockResolvedValue(null);
    expect((await GET()).status).toBe(403);
    expect((await post({ bankCode: "044", accountNumber: "0123456789" })).status).toBe(403);
    expect(vi.mocked(getStoreFor).mock.calls.every(([, perm]) => perm === "owner")).toBe(true);
  });

  it("step 1 only looks up the name — nothing is created", async () => {
    const res = await post({ bankCode: "044", accountNumber: "0123456789" });
    expect(await res.json()).toEqual({ accountName: "AMAKA STORES", bankName: "Access Bank" });
    expect(upsertSubaccount).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("step 2 creates the subaccount and saves the bank-verified name", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(row as never)
      .mockResolvedValueOnce({ ...row, duka_pay_status: "active", paystack_subaccount_code: "ACCT_amaka", bank_name: "Access Bank", bank_account_number: "0123456789", bank_account_name: "AMAKA STORES" } as never);
    const res = await post({ bankCode: "044", accountNumber: "0123456789", confirm: true });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toMatchObject({ status: "active", accountName: "AMAKA STORES", accountNumber: "••••••6789" });
    const [, params] = vi.mocked(query).mock.calls[0];
    expect(params).toEqual(["store-1", "044", "Access Bank", "0123456789", "AMAKA STORES", "ACCT_amaka"]);
    expect(invalidateStore).toHaveBeenCalledWith("store-1", "amaka");
  });

  it("refuses unknown banks and accounts the bank can't find", async () => {
    expect((await post({ bankCode: "999", accountNumber: "0123456789" })).status).toBe(422);
    vi.mocked(resolveAccount).mockResolvedValueOnce({ ok: false, error: "not found" });
    expect((await post({ bankCode: "044", accountNumber: "0123456789", confirm: true })).status).toBe(422);
    expect(upsertSubaccount).not.toHaveBeenCalled();
  });
});

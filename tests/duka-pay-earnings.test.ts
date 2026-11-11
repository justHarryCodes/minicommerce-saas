import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ query: vi.fn(), queryMany: vi.fn(), queryOne: vi.fn() }));

import { queryMany, queryOne } from "@/lib/db";
import { parseRange, storeEarnings } from "@/lib/duka-pay-earnings";

// Duka Pay earnings: what Paystack split, per store and per payment.

beforeEach(() => vi.clearAllMocks());

describe("earnings", () => {
  it("period defaults to 30 days and ignores junk", () => {
    expect(parseRange("7d")).toBe("7d");
    expect(parseRange("all")).toBe("all");
    expect(parseRange("forever")).toBe("30d");
    expect(parseRange(undefined)).toBe("30d");
  });

  it("a store's totals and rows are scoped to that store and that period", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce({ payments: 2, gross: "20000", paystack_fees: "450", duka_fees: "200", to_stores: "19350" });
    vi.mocked(queryMany).mockResolvedValueOnce([
      { reference: "ORD-1-X", settled_at: "2026-11-10T10:00:00Z", amount: "10000", channel: "card", paystack_fee: "250", duka_fee: "100", store_share: "9650", order_id: "o1", order_number: "ORD-1", customer_name: "Ada" },
    ]);
    const r = await storeEarnings("store-1", "7d");
    expect(r.totals).toEqual({ payments: 2, gross: 20000, paystackFees: 450, dukaFees: 200, toStores: 19350 });
    expect(r.rows[0]).toMatchObject({ orderNumber: "ORD-1", amount: 10000, paystackFee: 250, dukaFee: 100, storeShare: 9650, channel: "card" });
    // both queries bound to this store and 7 days; only settled Duka Pay order payments
    for (const call of [vi.mocked(queryOne).mock.calls[0], vi.mocked(queryMany).mock.calls[0]]) {
      expect(call[1]).toEqual(["store-1", 7]);
      expect(String(call[0])).toMatch(/pa\.kind = 'order' AND pa\.status = 'success' AND pa\.subaccount_code IS NOT NULL/);
    }
  });

  it("all time passes no day limit", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    vi.mocked(queryMany).mockResolvedValueOnce([]);
    const r = await storeEarnings("store-1", "all");
    expect(vi.mocked(queryOne).mock.calls[0][1]).toEqual(["store-1", null]);
    expect(r.totals.payments).toBe(0);
  });
});

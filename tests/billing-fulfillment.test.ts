import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB layer before anything imports it — src/lib/db.ts throws at
// module load if DATABASE_URL isn't set, so it must never actually execute.
vi.mock("@/lib/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));
vi.mock("@/lib/admin-auth", () => ({
  getPlatformSettings: vi.fn(),
}));

import { query, queryOne } from "@/lib/db";
import { getPlatformSettings } from "@/lib/admin-auth";
import { fulfillSubscriptionPayment } from "@/lib/billing-fulfillment";

const mockedQuery = vi.mocked(query);
const mockedQueryOne = vi.mocked(queryOne);
const mockedSettings = vi.mocked(getPlatformSettings);

const DEFAULT_SETTINGS = {
  require_setup_fee: true,
  setup_fee_amount: 10000,
  setup_fee_duration_months: 2,
  require_subscription: false,
  monthly_fee_amount: 5000,
  require_nin_verification: false,
  allow_new_registrations: true,
  require_plan_subscription: false,
  reels_monthly_limit: 20,
};

function callsContaining(text: string) {
  return mockedQuery.mock.calls.filter(([sql]) => (sql as string).includes(text));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedQuery.mockResolvedValue([]);
  mockedSettings.mockResolvedValue(DEFAULT_SETTINGS);
});

describe("fulfillSubscriptionPayment", () => {
  it("returns payment_not_found when no matching payment exists", async () => {
    mockedQueryOne.mockResolvedValueOnce(null);
    const result = await fulfillSubscriptionPayment("ref_missing", "setup_fee");
    expect(result).toEqual({ ok: false, error: "payment_not_found" });
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  it("is idempotent — returns already_paid without re-applying effects", async () => {
    mockedQueryOne.mockResolvedValueOnce({
      id: "p1", store_id: "s1", type: "setup_fee", payment_status: "paid", plan_id: null,
    });
    const result = await fulfillSubscriptionPayment("ref1", "setup_fee");
    expect(result).toEqual({ ok: false, error: "already_paid" });
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  it("blocks a type-swap between what's stored and what was requested", async () => {
    mockedQueryOne.mockResolvedValueOnce({
      id: "p1", store_id: "s1", type: "monthly", payment_status: "pending", plan_id: null,
    });
    const result = await fulfillSubscriptionPayment("ref1", "setup_fee");
    expect(result).toEqual({ ok: false, error: "type_mismatch" });
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  it("applies the setup_fee effect: activates the store and extends expiry", async () => {
    mockedQueryOne
      .mockResolvedValueOnce({ id: "p1", store_id: "s1", type: "setup_fee", payment_status: "pending", plan_id: null })
      .mockResolvedValueOnce({ referred_by_store_id: null, referred_by_affiliate_id: null });

    const result = await fulfillSubscriptionPayment("ref1", "setup_fee");

    expect(result).toEqual({ ok: true });
    expect(callsContaining("SET payment_status = 'paid'")).toHaveLength(1);
    expect(callsContaining("subscription_status = 'setup_fee_paid'")).toHaveLength(1);
    // No referrer on this store → no referral/affiliate reward queries fired.
    expect(callsContaining("referral_credits")).toHaveLength(0);
    expect(callsContaining("payout_balance")).toHaveLength(0);
  });

  it("rewards the referring store and affiliate on a referred setup_fee payment", async () => {
    mockedQueryOne
      .mockResolvedValueOnce({ id: "p1", store_id: "s1", type: "setup_fee", payment_status: "pending", plan_id: null })
      .mockResolvedValueOnce({ referred_by_store_id: "s0", referred_by_affiliate_id: "aff1" });

    const result = await fulfillSubscriptionPayment("ref1", "setup_fee");

    expect(result).toEqual({ ok: true });
    expect(callsContaining("referral_credits")).toHaveLength(1);
    expect(callsContaining("payout_balance")).toHaveLength(1);
  });

  it("applies the monthly effect: marks subscribed and extends expiry by 1 month", async () => {
    mockedQueryOne.mockResolvedValueOnce({
      id: "p1", store_id: "s1", type: "monthly", payment_status: "pending", plan_id: null,
    });
    const result = await fulfillSubscriptionPayment("ref1", "monthly");
    expect(result).toEqual({ ok: true });
    expect(callsContaining("subscription_status = 'subscribed'")).toHaveLength(1);
  });

  it("rejects a plan payment with no plan_id recorded", async () => {
    mockedQueryOne.mockResolvedValueOnce({
      id: "p1", store_id: "s1", type: "plan", payment_status: "pending", plan_id: null,
    });
    const result = await fulfillSubscriptionPayment("ref1", "plan");
    expect(result).toEqual({ ok: false, error: "missing_plan_id" });
    // Payment is still marked paid before the plan_id guard runs — that's
    // existing behaviour, just asserting it doesn't also touch `stores`.
    expect(callsContaining("current_plan_id")).toHaveLength(0);
  });

  it("applies the plan effect: assigns current_plan_id and expiry", async () => {
    mockedQueryOne.mockResolvedValueOnce({
      id: "p1", store_id: "s1", type: "plan", payment_status: "pending", plan_id: "plan_pro",
    });
    const result = await fulfillSubscriptionPayment("ref1", "plan");
    expect(result).toEqual({ ok: true });
    expect(callsContaining("current_plan_id = $1")).toHaveLength(1);
  });
});

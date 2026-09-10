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

/** Routes queryOne calls by a substring of their SQL text — robust against
 *  the exact call order shifting as billing-fulfillment.ts evolves. */
function mockQueryOneByText(routes: Record<string, unknown>) {
  mockedQueryOne.mockImplementation(async (sql: unknown) => {
    const text = sql as string;
    for (const [needle, result] of Object.entries(routes)) {
      if (text.includes(needle)) return result;
    }
    return null;
  });
}

/** Same idea for query() calls whose *return value* the code inspects
 *  (the RETURNING-id rows used for atomic reward idempotency). Calls not
 *  matched here fall back to the blanket [] default from beforeEach. */
function mockQueryByText(routes: Record<string, unknown[]>) {
  mockedQuery.mockImplementation(async (sql: unknown) => {
    const text = sql as string;
    for (const [needle, result] of Object.entries(routes)) {
      if (text.includes(needle)) return result;
    }
    return [];
  });
}

const PAYMENT_LOOKUP = "FROM subscription_payments WHERE payment_reference";
const REFERRER_LOOKUP = "referred_by_store_id FROM stores";
const REFERRER_PLAN_LOOKUP = "current_plan_id, plan_expires_at FROM stores";
const AFFILIATE_LOOKUP = "referred_by_affiliate_id FROM stores";
const PRO_PLAN_LOOKUP = "name = 'Pro'";
const REFERRALS_REWARD_UPDATE = "UPDATE referrals SET status = 'rewarded'";
const AFFILIATE_REFERRAL_ACTIVATE = "UPDATE affiliate_referrals";
const AFFILIATE_BALANCE_CREDIT = "UPDATE affiliates";

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

  it("applies the setup_fee effect: activates the store and extends expiry, with no referral involvement", async () => {
    // setup_fee no longer triggers any referral/affiliate reward — that's
    // been re-pointed to the first successful plan payment (Phase 1).
    mockedQueryOne.mockResolvedValueOnce({
      id: "p1", store_id: "s1", type: "setup_fee", payment_status: "pending", plan_id: null,
    });

    const result = await fulfillSubscriptionPayment("ref1", "setup_fee");

    expect(result).toEqual({ ok: true });
    expect(callsContaining("SET payment_status = 'paid'")).toHaveLength(1);
    expect(callsContaining("subscription_status = 'setup_fee_paid'")).toHaveLength(1);
    expect(callsContaining("referral_credits")).toHaveLength(0);
    expect(callsContaining("payout_balance")).toHaveLength(0);
    // Only one queryOne call (the payment lookup) — setup_fee never queries
    // for a referrer/affiliate at all any more.
    expect(mockedQueryOne).toHaveBeenCalledTimes(1);
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

  it("applies the plan effect: assigns current_plan_id and expiry, with no referrer on this store", async () => {
    mockQueryOneByText({
      [PAYMENT_LOOKUP]: { id: "p1", store_id: "s1", type: "plan", payment_status: "pending", plan_id: "plan_pro" },
      [REFERRER_LOOKUP]: { referred_by_store_id: null },
      [AFFILIATE_LOOKUP]: { referred_by_affiliate_id: null },
    });
    const result = await fulfillSubscriptionPayment("ref1", "plan");
    expect(result).toEqual({ ok: true });
    expect(callsContaining("current_plan_id = $1")).toHaveLength(1);
    expect(callsContaining("referral_credits")).toHaveLength(0);
    expect(callsContaining("payout_balance")).toHaveLength(0);
  });

  describe("referral reward — re-pointed to first plan payment", () => {
    it("grants a Free-tier referrer 1 free month of Pro on the referred store's first plan payment", async () => {
      mockQueryOneByText({
        [PAYMENT_LOOKUP]: { id: "p1", store_id: "s1", type: "plan", payment_status: "pending", plan_id: "plan_pro" },
        [REFERRER_LOOKUP]: { referred_by_store_id: "s0" },
        [REFERRER_PLAN_LOOKUP]: { current_plan_id: null, plan_expires_at: null }, // s0 is on Free
        [PRO_PLAN_LOOKUP]: { id: "plan_pro_id" },
        [AFFILIATE_LOOKUP]: { referred_by_affiliate_id: null },
      });
      mockQueryByText({ [REFERRALS_REWARD_UPDATE]: [{ id: "referral_row_1" }] });

      const result = await fulfillSubscriptionPayment("ref1", "plan");

      expect(result).toEqual({ ok: true });
      const grantCalls = callsContaining("current_plan_id  = $1");
      expect(grantCalls).toHaveLength(1);
      expect(grantCalls[0][1]).toEqual(["plan_pro_id", expect.any(String), "s0"]);
      expect(callsContaining("referral_credits")).toHaveLength(1);
    });

    it("extends the referrer's plan by 30 days when they already have an active paid plan", async () => {
      const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      mockQueryOneByText({
        [PAYMENT_LOOKUP]: { id: "p1", store_id: "s1", type: "plan", payment_status: "pending", plan_id: "plan_pro" },
        [REFERRER_LOOKUP]: { referred_by_store_id: "s0" },
        [REFERRER_PLAN_LOOKUP]: { current_plan_id: "existing_plan", plan_expires_at: future },
        [AFFILIATE_LOOKUP]: { referred_by_affiliate_id: null },
      });
      mockQueryByText({ [REFERRALS_REWARD_UPDATE]: [{ id: "referral_row_1" }] });

      const result = await fulfillSubscriptionPayment("ref1", "plan");

      expect(result).toEqual({ ok: true });
      const extendCalls = callsContaining("plan_expires_at  = plan_expires_at");
      expect(extendCalls).toHaveLength(1);
      expect(extendCalls[0][1]).toEqual([30, "s0"]);
      // Free-grant path (current_plan_id assignment) must NOT also fire.
      expect(callsContaining("current_plan_id  = $1")).toHaveLength(0);
      expect(callsContaining("referral_credits")).toHaveLength(1);
    });

    it("does not re-reward the referrer on a renewal (second plan payment)", async () => {
      // referrals row is already 'rewarded' — the atomic UPDATE matches
      // zero rows, so the reward query itself returns [] (default mock).
      mockQueryOneByText({
        [PAYMENT_LOOKUP]: { id: "p2", store_id: "s1", type: "plan", payment_status: "pending", plan_id: "plan_pro" },
        [REFERRER_LOOKUP]: { referred_by_store_id: "s0" },
        [AFFILIATE_LOOKUP]: { referred_by_affiliate_id: null },
      });
      // REFERRALS_REWARD_UPDATE not overridden → falls back to [] default.

      const result = await fulfillSubscriptionPayment("ref2", "plan");

      expect(result).toEqual({ ok: true });
      // The reward UPDATE was attempted (that's how idempotency is enforced)...
      expect(callsContaining(REFERRALS_REWARD_UPDATE)).toHaveLength(1);
      // ...but since it matched 0 rows, no plan grant/extension or credit followed.
      expect(callsContaining("current_plan_id  = $1")).toHaveLength(0);
      expect(callsContaining("plan_expires_at  = plan_expires_at")).toHaveLength(0);
      expect(callsContaining("referral_credits")).toHaveLength(0);
    });

    it("does not reward a self-referral", async () => {
      mockQueryOneByText({
        [PAYMENT_LOOKUP]: { id: "p1", store_id: "s1", type: "plan", payment_status: "pending", plan_id: "plan_pro" },
        [REFERRER_LOOKUP]: { referred_by_store_id: "s1" }, // same as store_id — shouldn't happen, guarded anyway
        [AFFILIATE_LOOKUP]: { referred_by_affiliate_id: null },
      });

      const result = await fulfillSubscriptionPayment("ref1", "plan");

      expect(result).toEqual({ ok: true });
      expect(callsContaining(REFERRALS_REWARD_UPDATE)).toHaveLength(0);
      expect(callsContaining("referral_credits")).toHaveLength(0);
    });
  });

  describe("affiliate commission — re-pointed to first plan payment", () => {
    it("credits the affiliate on the referred store's first plan payment", async () => {
      mockQueryOneByText({
        [PAYMENT_LOOKUP]: { id: "p1", store_id: "s1", type: "plan", payment_status: "pending", plan_id: "plan_pro" },
        [REFERRER_LOOKUP]: { referred_by_store_id: null },
        [AFFILIATE_LOOKUP]: { referred_by_affiliate_id: "aff1" },
      });
      mockQueryByText({ [AFFILIATE_REFERRAL_ACTIVATE]: [{ id: "affref1" }] });

      const result = await fulfillSubscriptionPayment("ref1", "plan");

      expect(result).toEqual({ ok: true });
      expect(callsContaining(AFFILIATE_BALANCE_CREDIT)).toHaveLength(1);
    });

    it("does not re-credit the affiliate on a renewal (second plan payment)", async () => {
      // affiliate_referrals row is already 'active' — the atomic UPDATE
      // (WHERE status = 'pending') matches zero rows.
      mockQueryOneByText({
        [PAYMENT_LOOKUP]: { id: "p2", store_id: "s1", type: "plan", payment_status: "pending", plan_id: "plan_pro" },
        [REFERRER_LOOKUP]: { referred_by_store_id: null },
        [AFFILIATE_LOOKUP]: { referred_by_affiliate_id: "aff1" },
      });
      // AFFILIATE_REFERRAL_ACTIVATE not overridden → falls back to [] default.

      const result = await fulfillSubscriptionPayment("ref2", "plan");

      expect(result).toEqual({ ok: true });
      expect(callsContaining(AFFILIATE_REFERRAL_ACTIVATE)).toHaveLength(1); // attempted
      expect(callsContaining(AFFILIATE_BALANCE_CREDIT)).toHaveLength(0);   // but not credited again
    });
  });
});

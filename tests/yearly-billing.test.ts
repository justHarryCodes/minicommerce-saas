import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ verifySession: vi.fn() }));
vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ getPlatformSettings: vi.fn() }));
vi.mock("@/lib/payments", () => ({
  startPayment: vi.fn(),
  targets: { plan: (s: string, p: string, c = "monthly") => `plan:${p}:${s}${c === "yearly" ? ":yearly" : ""}` },
}));
vi.mock("@/lib/yearly-billing", () => ({ yearlyBillingReady: vi.fn(), YEARLY_NOT_READY: "not ready" }));

import { verifySession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { getPlatformSettings } from "@/lib/admin-auth";
import { startPayment } from "@/lib/payments";
import { yearlyBillingReady } from "@/lib/yearly-billing";
import { clampDiscount, priceFor, yearlyPerMonth, yearlyPrice, yearlySavings } from "@/lib/plan-pricing";
import { POST } from "@/app/api/billing/subscribe-plan/route";

// Yearly plans: 12 months upfront at the admin's discount (default 20%).

describe("yearly pricing", () => {
  it("is 12 months less the discount", () => {
    expect(yearlyPrice(10000, 20)).toBe(96000); // instead of 120,000
    expect(yearlySavings(10000, 20)).toBe(24000);
    expect(yearlyPerMonth(10000, 20)).toBe(8000);
    expect(priceFor(10000, "monthly", 20)).toBe(10000);
    expect(priceFor(10000, "yearly", 0)).toBe(120000);
  });

  it("keeps the discount sensible whatever is stored", () => {
    expect(clampDiscount(20)).toBe(20);
    expect(clampDiscount(90)).toBe(50);
    expect(clampDiscount(-5)).toBe(0);
    expect(clampDiscount("abc")).toBe(20);
  });
});

describe("paying for a plan by card", () => {
  const PLAN = "6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b";
  const post = (body: unknown) =>
    POST(new NextRequest("http://x.test/api/billing/subscribe-plan", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }));

  beforeEach(() => {
    vi.mocked(verifySession).mockResolvedValue({ firebaseUid: "uid", email: "a@b.co" } as never);
    vi.mocked(queryOne).mockReset().mockImplementation(async (sql: unknown) =>
      String(sql).includes("FROM stores")
        ? ({ id: "store-1", name: "Amaka", status: "active" } as never)
        : ({ id: PLAN, name: "Pro", price_monthly: 10000, is_active: true } as never),
    );
    vi.mocked(getPlatformSettings).mockResolvedValue({ yearly_discount_percent: 20 } as never);
    vi.mocked(startPayment).mockReset().mockResolvedValue({ ok: true, authorizationUrl: "https://paystack/x", reference: "R", reused: false });
    vi.mocked(yearlyBillingReady).mockResolvedValue(true);
  });

  it("monthly charges one month", async () => {
    const res = await post({ plan_id: PLAN });
    expect(res.status).toBe(200);
    expect(vi.mocked(startPayment).mock.calls[0][0]).toMatchObject({ amount: 10000, targetId: `plan:${PLAN}:store-1` });
  });

  it("yearly charges the discounted year, as its own checkout", async () => {
    await post({ plan_id: PLAN, cycle: "yearly" });
    const opts = vi.mocked(startPayment).mock.calls[0][0];
    expect(opts).toMatchObject({ amount: 96000, targetId: `plan:${PLAN}:store-1:yearly` });
    expect(opts.metadata).toMatchObject({ billing_cycle: "yearly" });
  });

  it("ignores a price sent by the browser", async () => {
    await post({ plan_id: PLAN, cycle: "yearly", amount: 1 });
    expect(vi.mocked(startPayment).mock.calls[0][0].amount).toBe(96000);
  });

  it("refuses yearly until the database is ready, monthly still works", async () => {
    vi.mocked(yearlyBillingReady).mockResolvedValue(false);
    expect((await post({ plan_id: PLAN, cycle: "yearly" })).status).toBe(503);
    expect((await post({ plan_id: PLAN })).status).toBe(200);
  });
});

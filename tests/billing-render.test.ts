// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import * as React from "react";
import { createElement } from "react";
// Vitest compiles JSX in classic mode (React.createElement)
(globalThis as unknown as { React: typeof React }).React = React;

vi.mock("react-hot-toast", () => ({ default: Object.assign(() => {}, { success: () => {}, error: () => {} }) }));

import BillingClient from "@/app/dashboard/billing/BillingClient";

// The Billing page must render for every kind of store: never subscribed,
// subscribed (monthly or yearly), lapsed — including rows straight from
// Postgres (NUMERIC prices arrive as strings, dates as Date objects).

const settings = { yearly_discount_percent: 20 } as never;
const pro = { id: "pro", name: "Pro", description: "Grow", price_monthly: "5000.00" as unknown as number, max_products: 100, max_reels: 10, is_active: true, features: null };
const biz = { id: "biz", name: "Business", description: "Big", price_monthly: "17000.00" as unknown as number, max_products: 1000, max_reels: 20, is_active: true, features: null };
const free = { id: "free", name: "Free", description: "Start", price_monthly: "0.00" as unknown as number, max_products: 15, max_reels: 0, is_active: true, features: [] };
const future = new Date(Date.now() + 20 * 86_400_000);

const base = {
  settings,
  plans: [pro, biz],
  freePlan: free,
  bankAccounts: [],
  yearlyDiscount: 20,
  yearlyReady: true,
};

function render(extra: Record<string, unknown>) {
  return renderToString(createElement(BillingClient as never, { ...base, ...extra }));
}

const store = (planId: string | null, expires: Date | null) => ({
  id: "s1", name: "Amaka", status: "active", subscriptionStatus: "none", subscriptionExpiresAt: null, setupFeePaidAt: null,
  currentPlanId: planId, planExpiresAt: expires, registrationConfirmed: true,
});

const paidPayment = (cycle: string | null) => ({
  id: "p1", type: "plan", amount: "5000.00", payment_status: "paid", payment_method: "paystack",
  period_start: new Date(), period_end: future, created_at: new Date(), billing_cycle: cycle, plan_name: "Pro",
});

describe("Billing page renders", () => {
  it("for a store that never subscribed (pricing layout)", () => {
    const html = render({ store: store(null, null), payments: [], currentPlan: null, hasEverPaid: false, currentCycle: null });
    expect(html).toMatch(/Grow (<!-- -->)?Amaka/);
  });

  it("for a store on a monthly plan", () => {
    const html = render({ store: store("pro", future), payments: [paidPayment("monthly")], currentPlan: pro, hasEverPaid: true, currentCycle: "monthly" });
    expect(html).toContain("Pro");
  });

  it("for a store on a yearly plan", () => {
    const html = render({ store: store("pro", future), payments: [paidPayment("yearly")], currentPlan: pro, hasEverPaid: true, currentCycle: "yearly" });
    expect(html).toContain("billed");
  });

  it("for a store whose plan lapsed", () => {
    const html = render({ store: store("pro", new Date(Date.now() - 86_400_000)), payments: [paidPayment(null)], currentPlan: pro, hasEverPaid: true, currentCycle: "monthly" });
    expect(html).toContain("ended");
  });

  it("for a store gifted a plan by an admin (never paid)", () => {
    const html = render({ store: store("pro", future), payments: [], currentPlan: pro, hasEverPaid: false, currentCycle: null });
    expect(html).toContain("Pro");
  });
});

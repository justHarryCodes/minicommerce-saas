// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as React from "react";
import { renderToString } from "react-dom/server";

(globalThis as unknown as { React: typeof React }).React = React;

vi.mock("react-hot-toast", () => ({ default: Object.assign(() => {}, { success: () => {}, error: () => {} }) }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error("redirect " + u); } }));
vi.mock("@/lib/auth", () => ({ verifySession: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ getPlatformSettings: vi.fn() }));
vi.mock("@/lib/yearly-billing", () => ({ yearlyBillingReady: vi.fn() }));
vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn() }));

import { verifySession } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/admin-auth";
import { yearlyBillingReady } from "@/lib/yearly-billing";
import { query, queryOne } from "@/lib/db";
import BillingPage from "@/app/dashboard/billing/page";

// The Billing page's server half for a store with a subscription, fed rows
// shaped like real Postgres results (NUMERIC as strings, Dates, arrays).

const future = new Date(Date.now() + 20 * 86_400_000);
const planRows = [
  { id: "free", name: "Free", description: "Start", price_monthly: "0.00", max_products: 15, max_reels: 0, is_active: true, features: [], sort_order: 0 },
  { id: "pro", name: "Pro", description: "Grow", price_monthly: "5000.00", max_products: 100, max_reels: 10, is_active: true, features: null, sort_order: 1 },
  { id: "biz", name: "Business", description: "Big", price_monthly: "17000.00", max_products: 1000, max_reels: 20, is_active: true, features: ["custom_domain", "analytics"], sort_order: 2 },
];

beforeEach(() => {
  vi.mocked(verifySession).mockResolvedValue({ firebaseUid: "u1", email: "a@b.co" } as never);
  vi.mocked(getPlatformSettings).mockResolvedValue({ yearly_discount_percent: 20 } as never);
  vi.mocked(yearlyBillingReady).mockResolvedValue(false);
  vi.mocked(queryOne).mockReset().mockImplementation(async (sql: unknown) => {
    const s = String(sql);
    if (s.includes("FROM stores WHERE owner_id")) {
      return {
        id: "s1", name: "Amaka", status: "active", subscription_status: "none", setup_fee_paid_at: null, subscription_expires_at: null,
        current_plan_id: "pro", plan_expires_at: future, registration_confirmed: true,
      } as never;
    }
    if (s.includes("FROM plans WHERE id")) return planRows[1] as never;
    if (s.includes("FROM subscription_payments WHERE store_id")) return { "?column?": 1 } as never;
    return null;
  });
  vi.mocked(query).mockReset().mockImplementation(async (sql: unknown) => {
    const s = String(sql);
    if (s.includes("FROM subscription_payments sp")) {
      return [
        { id: "p1", type: "plan", amount: "5000.00", payment_status: "paid", payment_method: "paystack", period_start: new Date(), period_end: future, created_at: new Date(), billing_cycle: null, plan_name: "Pro" },
        { id: "p0", type: "monthly", amount: "5000.00", payment_status: "paid", payment_method: null, period_start: null, period_end: null, created_at: new Date(), billing_cycle: null, plan_name: null },
      ] as never;
    }
    if (s.includes("FROM plans")) return planRows as never;
    return [] as never;
  });
});

describe("Billing page (server) for a subscribed store", () => {
  it("loads and renders", async () => {
    const el = await BillingPage({ searchParams: Promise.resolve({}) });
    const html = renderToString(el as React.ReactElement);
    expect(html).toContain("Pro");
  });

  it("sends SQL with its text values quoted", async () => {
    // A shell edit once stripped the quotes ('billing_cycle', 'plan', 'paid'),
    // turning them into unknown columns and crashing Billing for everyone.
    await BillingPage({ searchParams: Promise.resolve({}) });
    const sql = [...vi.mocked(query).mock.calls, ...vi.mocked(queryOne).mock.calls].map(([s]) => String(s));
    for (const s of sql) {
      expect(s, s).not.toMatch(/->>\s*[a-z_]/i);
      expect(s, s).not.toMatch(/=\s*(plan|paid|pending|yearly|monthly)\b/);
    }
    expect(sql.some((s) => s.includes("->> 'billing_cycle'"))).toBe(true);
    expect(sql.some((s) => s.includes("type = 'plan' AND payment_status = 'paid'"))).toBe(true);
  });
});

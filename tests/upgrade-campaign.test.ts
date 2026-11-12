import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn() }));
vi.mock("@/lib/paystack", () => ({ getAppUrl: () => "https://dukanigeria.com" }));
vi.mock("@/lib/notify/providers", () => ({ sendEmail: vi.fn(), emailConfigured: vi.fn(() => true), htmlToText: (h: string) => h }));
vi.mock("@/lib/firebase-admin", () => ({ adminAuth: { getUser: vi.fn() } }));
vi.mock("@/lib/admin-auth", () => ({ verifyAdminSession: vi.fn(), getPlatformSettings: vi.fn(), logAdminAction: vi.fn() }));

import { query } from "@/lib/db";
import { sendEmail } from "@/lib/notify/providers";
import { adminAuth } from "@/lib/firebase-admin";
import { getPlatformSettings, verifyAdminSession } from "@/lib/admin-auth";
import { buildUpgradeEmail, sendUpgradeCampaign } from "@/lib/notify/upgrade-campaign";
import { GET, POST } from "@/app/api/admin/campaigns/upgrade/route";

// The "upgrade to Pro / Business" marketing email.

const plans = [
  { id: "free", name: "Free", price_monthly: "0.00", max_products: 15, max_reels: 0, features: [] },
  { id: "pro", name: "Pro", price_monthly: "5000.00", max_products: 100, max_reels: 10, features: ["custom_domain", "analytics", "coupons", "abandoned_carts", "ai_tools", "customers"] },
  { id: "biz", name: "Business", price_monthly: "17000.00", max_products: 1000, max_reels: 20, features: null },
];

describe("the email", () => {
  const m = buildUpgradeEmail({ storeName: "Amaka <Boutique>", ownerName: "Amaka Obi", plans, yearlyDiscount: 20, appUrl: "https://dukanigeria.com", unsubscribeUrl: "https://u/x" });

  it("sells what Pro gives, from the plan's real features", () => {
    for (const t of ["Your own web address", "See what sells", "Win back lost sales", "Discount codes", "AI writes for you"]) expect(m.html).toContain(t);
    expect(m.subject).toContain("Pro");
  });

  it("shows both paid plans with monthly and yearly prices and savings", () => {
    expect(m.html).toContain("₦5,000");
    expect(m.html).toContain("₦48,000/year: save ₦12,000");
    expect(m.html).toContain("₦17,000");
    expect(m.html).toContain("₦163,200/year: save ₦40,800");
    expect(m.html).toContain("Everything in Pro, plus");
    expect(m.html).not.toContain(">Free<");
  });

  it("links to Billing, escapes names and has an unsubscribe link", () => {
    expect(m.html).toContain("https://dukanigeria.com/dashboard/billing");
    expect(m.html).toContain("Amaka &lt;Boutique&gt;");
    expect(m.html).toContain("Hi Amaka");
    expect(m.html).toContain('href="https://u/x"');
  });
});

describe("sending", () => {
  beforeEach(() => {
    vi.mocked(sendEmail).mockReset().mockResolvedValue({ ok: true });
    vi.mocked(adminAuth.getUser).mockResolvedValue({ email: "owner@example.com", displayName: "Owner" } as never);
    vi.mocked(query).mockReset().mockImplementation(async (sql: unknown) => {
      const s = String(sql);
      if (s.includes("COUNT(*)::int AS n")) return [{ n: 0 }] as never;
      if (s.includes("SELECT s.id, s.name")) return [{ id: "s1", name: "Amaka", owner_id: "u1", owner_email: null }] as never;
      if (s.includes("FROM plans")) return plans as never;
      if (s.includes("INSERT INTO setup_reminders")) return [{ subject: "x" }] as never;
      return [] as never;
    });
  });

  it("emails each store once, skipping ones another send already claimed", async () => {
    vi.mocked(query).mockImplementation(async (sql: unknown, params?: unknown[]) => {
      const s = String(sql);
      if (s.includes("COUNT(*)::int AS n")) return [{ n: 0 }] as never;
      if (s.includes("SELECT s.id, s.name")) return [{ id: "s1", name: "Amaka", owner_id: "u1", owner_email: null }, { id: "s2", name: "Bola", owner_id: "u2", owner_email: "bola@example.com" }] as never;
      if (s.includes("FROM plans")) return plans as never;
      if (s.includes("INSERT INTO setup_reminders")) return (params?.[0] === "upgrade:s2" ? [] : [{ subject: "x" }]) as never;
      return [] as never;
    });
    const res = await sendUpgradeCampaign({ yearlyDiscount: 20 });
    expect(res).toEqual({ sent: 1, failed: 0, remaining: 0 });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith("owner@example.com", expect.stringContaining("Amaka"), expect.any(String), undefined, {
      unsubscribeUrl: expect.stringContaining("s=upgrade%3As1"),
    });
  });

  it("targets only Free / lapsed stores, respects opt-outs and the 30-day gap (SQL keeps its quotes)", async () => {
    await sendUpgradeCampaign({ yearlyDiscount: 20 });
    const audience = vi.mocked(query).mock.calls.map(([s]) => String(s)).find((s) => s.includes("SELECT s.id, s.name"))!;
    expect(audience).toContain("'upgrade:' || s.id::text");
    expect(audience).toContain("'store:' || s.id::text");
    expect(audience).toContain("s.plan_expires_at > NOW() AND COALESCE(pl.price_monthly, 0) > 0");
    expect(audience).toContain("INTERVAL '30 days'");
    expect(audience).toContain("COALESCE(up.opted_out, false) = false");
    expect(audience).toContain("COALESCE(sr.opted_out, false) = false");
  });
});

describe("admin API", () => {
  beforeEach(() => {
    vi.mocked(getPlatformSettings).mockResolvedValue({ yearly_discount_percent: 20 } as never);
    vi.mocked(query).mockReset().mockImplementation(async (sql: unknown) => (String(sql).includes("FROM plans") ? plans : String(sql).includes("COUNT") ? [{ n: 7 }] : []) as never);
    vi.mocked(sendEmail).mockReset().mockResolvedValue({ ok: true });
  });

  it("is admin-only", async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue(null);
    expect((await GET()).status).toBe(403);
    expect((await POST(new NextRequest("http://x/api", { method: "POST", body: JSON.stringify({ mode: "send" }) }))).status).toBe(403);
  });

  it("previews with the audience size and sends a test to the admin", async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue({ firebaseUid: "a", email: "boss@dukanigeria.com", name: "Harry", role: "admin" });
    const g = await (await GET()).json();
    expect(g.audience).toBe(7);
    expect(g.preview.html).toContain("Pro");
    const t = await POST(new NextRequest("http://x/api", { method: "POST", body: JSON.stringify({ mode: "test" }) }));
    expect(await t.json()).toEqual({ ok: true, to: "boss@dukanigeria.com" });
    expect(vi.mocked(sendEmail).mock.calls[0][1]).toMatch(/^\[Test\]/);
  });
});

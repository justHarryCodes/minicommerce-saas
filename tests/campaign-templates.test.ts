import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: vi.fn() }));
vi.mock("@/lib/db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async (sql: string) => (String(sql).includes("COUNT(*)") ? { n: 5 } : { id: "c1" })) }));
vi.mock("@/lib/admin-auth", () => ({ verifyAdminSession: vi.fn(async () => ({ firebaseUid: "a", email: "boss@dukanigeria.com", role: "admin" })), logAdminAction: vi.fn(async () => {}) }));
vi.mock("@/lib/notify/providers", () => ({ emailConfigured: () => true, sendEmail: vi.fn(async () => ({ ok: true })), htmlToText: (h: string) => h }));
vi.mock("@/lib/paystack", () => ({ getAppUrl: () => "https://dukanigeria.com" }));

import { CAMPAIGN_TEMPLATES, TEMPLATE_GROUPS, templateById } from "@/lib/admin/campaign-templates";
import { ACTIVITIES } from "@/lib/admin/campaigns-shared";
import { audienceWhere } from "@/lib/admin/campaigns";
import { POST } from "@/app/api/admin/campaigns/builder/route";

// The 15 ready-made vendor campaigns.

const DASHBOARD_PAGES = ["/dashboard", "/dashboard/products/new", "/dashboard/products", "/dashboard/settings", "/dashboard/themes", "/dashboard/whatsapp", "/dashboard/billing"];

describe("template library", () => {
  it("has 15 templates, 5 per group, unique ids", () => {
    expect(CAMPAIGN_TEMPLATES).toHaveLength(15);
    expect(new Set(CAMPAIGN_TEMPLATES.map((t) => t.id)).size).toBe(15);
    for (const g of TEMPLATE_GROUPS) expect(CAMPAIGN_TEMPLATES.filter((t) => t.group === g.id)).toHaveLength(5);
    expect(templateById("welcome")?.group).toBe("onboarding");
    expect(templateById("nope")).toBeNull();
  });

  it.each(CAMPAIGN_TEMPLATES.map((t) => [t.id, t] as const))("%s is complete and points at a real page", (_id, t) => {
    expect(t.subject.length).toBeLessThanOrEqual(150);
    expect(t.headline.length).toBeLessThanOrEqual(150);
    expect(t.body.length).toBeGreaterThan(40);
    expect(t.channels.length).toBeGreaterThan(0);
    expect(DASHBOARD_PAGES).toContain(t.ctaUrl.split("#")[0]);
    // Only the supported placeholders
    for (const m of `${t.subject} ${t.headline} ${t.body}`.matchAll(/\{(\w+)\}/g)) expect(["store", "name"]).toContain(m[1]);
    for (const act of t.audience.activity ?? []) expect(ACTIVITIES.map((a) => a.id)).toContain(act);
    for (const p of t.audience.plans ?? []) expect(["free", "paid", "lapsed"]).toContain(p);
  });

  it.each(CAMPAIGN_TEMPLATES.map((t) => [t.id, t] as const))("%s is accepted by the builder as-is", async (_id, t) => {
    const res = await POST(
      new NextRequest("http://x", {
        method: "POST",
        body: JSON.stringify({ action: "send", content: { name: t.name, subject: t.subject, headline: t.headline, body: t.body, ctaLabel: t.ctaLabel, ctaUrl: t.ctaUrl, channels: t.channels }, audience: t.audience }),
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe("new audience filters", () => {
  it("no payout account / near the product limit", () => {
    expect(audienceWhere({ activity: ["no_payout"] }).sql).toContain("NOT (s.duka_pay_status = 'active' OR COALESCE(s.bank_account_number, '') <> '')");
    const near = audienceWhere({ activity: ["near_limit"] }).sql;
    expect(near).toContain(">= 0.8 * COALESCE(");
    expect(near).toContain("max_products");
  });
});

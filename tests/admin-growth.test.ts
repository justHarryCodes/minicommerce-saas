import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: vi.fn() }));
vi.mock("@/lib/db", () => ({ query: vi.fn(async () => []), queryOne: vi.fn(async () => null) }));
vi.mock("@/lib/admin-auth", () => ({ verifyAdminSession: vi.fn(), logAdminAction: vi.fn(async () => {}) }));
vi.mock("@/lib/notify/providers", () => ({ emailConfigured: () => true, sendEmail: vi.fn(async () => ({ ok: true })), htmlToText: (h: string) => h }));
vi.mock("@/lib/paystack", () => ({ getAppUrl: () => "https://dukanigeria.com" }));

import { query, queryOne } from "@/lib/db";
import { verifyAdminSession } from "@/lib/admin-auth";
import { sendEmail } from "@/lib/notify/providers";
import { audienceWhere, bodyHtml, campaignEmail, personalise } from "@/lib/admin/campaigns";
import { missingFor, upgradeScore } from "@/lib/admin/leads";
import { POST as builderPOST } from "@/app/api/admin/campaigns/builder/route";
import { PATCH as leadsPATCH } from "@/app/api/admin/leads/route";
import { adminTitle } from "@/app/admin/nav";

// Admin: leads, campaign targeting, and the builder API.

const ADMIN = { firebaseUid: "a1", email: "boss@dukanigeria.com", name: "Harry", role: "admin" };
const post = (body: object) => builderPOST(new NextRequest("http://x", { method: "POST", body: JSON.stringify(body) }));
const STORE = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.mocked(query).mockReset().mockResolvedValue([] as never);
  vi.mocked(queryOne).mockReset().mockResolvedValue(null as never);
  vi.mocked(sendEmail).mockClear();
});

describe("audience targeting", () => {
  it("everyone active by default", () => {
    const { sql, params } = audienceWhere({});
    expect(sql).toContain("s.is_active = true");
    expect(sql).toContain("s.deleted_at IS NULL");
    expect(params).toEqual([]);
  });

  it("category + plan + activity + location, all as bound parameters", () => {
    const { sql, params } = audienceWhere({ categories: ["Fashion and Clothing"], plans: ["free", "lapsed"], activity: ["selling_30d", "new_7d"], states: ["Lagos"] });
    expect(params).toEqual([["Fashion and Clothing"], ["Lagos"]]);
    expect(sql).toContain("s.primary_category = ANY($1::text[])");
    expect(sql).toContain("delivery_state");
    expect(sql).toContain("ILIKE ANY($2::text[])");
    expect(sql).toMatch(/created_at > NOW\(\) - INTERVAL '7 days' OR|OR s\.created_at > NOW\(\) - INTERVAL '7 days'/);
    expect(sql).not.toContain("Fashion"); // never pasted into SQL
  });

  it("hand-picked stores, ignoring anything that isn't a store id", () => {
    const { sql, params } = audienceWhere({ storeIds: [STORE, "'; DROP TABLE stores;--"] });
    expect(sql).toContain("s.id = ANY($1::uuid[])");
    expect(params).toEqual([[STORE]]);
  });
});

describe("messages", () => {
  it("personalise {store} and {name}", () => {
    expect(personalise("Hi {name}, {store} is live", { store: "Amaka Styles", name: "Ada Obi" })).toBe("Hi Ada, Amaka Styles is live");
    expect(personalise("Hi {name}", { store: "X" })).toBe("Hi there");
  });
  it("body is escaped, with **bold**, links and paragraphs", () => {
    const h = bodyHtml("Hello <script>x</script> **now**\n\nSee https://dukanigeria.com/pricing");
    expect(h).not.toContain("<script>");
    expect(h).toContain("&lt;script&gt;");
    expect(h).toContain("<strong>now</strong>");
    expect(h).toContain('<a href="https://dukanigeria.com/pricing"');
    expect(h.match(/<p /g)).toHaveLength(2);
  });
  it("email has the button and an unsubscribe link", () => {
    const m = campaignEmail({ subject: "{store} news", headline: "Hi {name}", body: "Text", ctaLabel: "Go", ctaUrl: "https://dukanigeria.com/dashboard" }, { store: "Amaka", name: "Ada", unsubscribe: "https://u/x" });
    expect(m.subject).toBe("Amaka news");
    expect(m.html).toContain(">Go</a>");
    expect(m.html).toContain('href="https://u/x"');
  });
});

describe("leads", () => {
  it("what an unfinished store is missing", () => {
    expect(missingFor({ products: 0, hasPayout: false, hasLogo: false })).toEqual(["No products", "No payout account", "No logo"]);
    expect(missingFor({ products: 1, hasPayout: true, hasLogo: true })).toEqual(["Only 1 product"]);
  });
  it("upgrade score rises with sales, orders and use of the product limit", () => {
    const low = upgradeScore({ revenue30: 5000, orders30: 1, products: 2, productLimit: 15 });
    const high = upgradeScore({ revenue30: 300000, orders30: 12, products: 15, productLimit: 15 });
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(100);
    expect(upgradeScore({ revenue30: 0, orders30: 0, products: 0, productLimit: 0 })).toBe(0);
  });
});

describe("admin APIs", () => {
  it("are admin-only", async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue(null);
    expect((await post({ action: "preview", audience: {} })).status).toBe(403);
    expect((await leadsPATCH(new NextRequest("http://x", { method: "PATCH", body: JSON.stringify({ key: `store:${STORE}`, status: "contacted" }) }))).status).toBe(403);
  });

  it("preview counts the audience", async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue(ADMIN as never);
    vi.mocked(queryOne).mockResolvedValue({ n: 42 } as never);
    vi.mocked(query).mockResolvedValue([{ id: STORE, name: "Amaka", primary_category: "Fashion" }] as never);
    expect(await (await post({ action: "preview", audience: { categories: ["Fashion"] } })).json()).toEqual({ count: 42, sample: [{ id: STORE, name: "Amaka", primary_category: "Fashion" }] });
  });

  const content = { name: "Black Friday", subject: "{store}: Black Friday", headline: "Get ready", body: "Stock up now please", ctaLabel: "Add products", ctaUrl: "/dashboard/products/new", channels: ["email", "inapp"] };

  it("test sends to the admin with absolute links", async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue(ADMIN as never);
    expect(await (await post({ action: "test", content })).json()).toEqual({ ok: true, to: ADMIN.email });
    const [to, subject, html] = vi.mocked(sendEmail).mock.calls[0];
    expect(to).toBe(ADMIN.email);
    expect(subject).toBe("[Test] Your Store: Black Friday");
    expect(html).toContain('href="https://dukanigeria.com/dashboard/products/new"');
  });

  it("send creates the campaign and refuses an empty audience or bad links", async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue(ADMIN as never);
    vi.mocked(queryOne).mockImplementation(async (sql: unknown) => (String(sql).includes("COUNT(*)") ? { n: 3 } : String(sql).includes("INSERT INTO admin_campaigns") ? { id: "c1" } : null) as never);
    expect(await (await post({ action: "send", content, audience: { plans: ["free"] } })).json()).toEqual({ ok: true, id: "c1", size: 3 });
    vi.mocked(queryOne).mockImplementation(async (sql: unknown) => (String(sql).includes("COUNT(*)") ? { n: 0 } : { id: "c2" }) as never);
    expect((await post({ action: "send", content, audience: {} })).status).toBe(422);
    expect((await post({ action: "send", content: { ...content, ctaUrl: "javascript:alert(1)" }, audience: {} })).status).toBe(422);
  });

  it("lead status updates are saved and audited", async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue(ADMIN as never);
    const res = await leadsPATCH(new NextRequest("http://x", { method: "PATCH", body: JSON.stringify({ key: `upgrade:${STORE}`, status: "contacted", note: "Called, will pay Friday" }) }));
    expect(res.status).toBe(200);
    const ins = vi.mocked(query).mock.calls.find(([s]) => String(s).includes("INSERT INTO admin_leads"))!;
    expect(ins[1]).toEqual([`upgrade:${STORE}`, "contacted", "Called, will pay Friday", ADMIN.email, true]);
  });
});

it("admin top bar titles", () => {
  expect(adminTitle("/admin")).toBe("Overview");
  expect(adminTitle("/admin/leads")).toBe("Leads");
  expect(adminTitle("/admin/campaigns/new")).toBe("New campaign");
  expect(adminTitle("/admin/vendors/abc")).toBe("Vendor");
});

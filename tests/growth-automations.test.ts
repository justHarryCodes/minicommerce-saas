import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  features: new Set<string>(["automations", "coupons"]),
  sent: [] as { to: string; subject: string; html: string; opts: Record<string, unknown> }[],
  claimed: new Set<string>(),
  rows: {} as Record<string, unknown[]>,
}));

vi.mock("@/lib/plan", () => ({ getStoreFeatures: vi.fn(async () => new Set(h.features)) }));
vi.mock("@/lib/store-brand", () => ({ storeAccent: vi.fn(async () => "#7c3aed") }));
vi.mock("@/lib/notify/providers", () => ({
  emailConfigured: () => true,
  sendEmail: vi.fn(async (to: string, subject: string, html: string, _reply: string | undefined, opts: Record<string, unknown>) => {
    h.sent.push({ to, subject, html, opts });
    return { ok: true };
  }),
}));
// A tiny fake database: answers by what the SQL asks for
vi.mock("@/lib/db", () => {
  const answer = async (sql: string, params: unknown[] = []) => {
    if (/INSERT INTO growth_messages/.test(sql)) {
      const key = `${params[1]}:${params[2]}`;
      if (h.claimed.has(key)) return [];
      h.claimed.add(key);
      return [{ id: h.claimed.size }];
    }
    if (/INSERT INTO coupons/.test(sql)) return [{ id: "cp" }];
    if (/FROM stores s/.test(sql)) return h.rows.stores ?? [];
    if (/kind = 'welcome' ORDER BY created_at DESC LIMIT 1\) cp ON true/.test(sql)) return h.rows.welcome ?? [];
    if (/o.order_status = 'delivered'/.test(sql)) return h.rows.review ?? [];
    if (/WITH last AS/.test(sql)) return h.rows.winback ?? [];
    if (/FROM order_items/.test(sql)) return [{ product_name: "Ankara dress", product_image: null, product_id: "p1", slug: "ankara-dress" }];
    if (/FROM products/.test(sql)) return [];
    return [];
  };
  return {
    query: vi.fn(async (sql: string, p?: unknown[]) => answer(sql, p)),
    queryOne: vi.fn(async (sql: string, p?: unknown[]) => (await answer(sql, p))[0] ?? null),
  };
});

import { sendDueGrowthMessages, parseAutomations } from "@/lib/growth-automations";
import { emailLink, esc, growthUnsubToken, growthUnsubUrl, onAccent, verifyGrowthUnsub, welcomeCodeEmail, winBackEmail } from "@/lib/growth-emails";
import { classifySource } from "@/lib/traffic-source";

const STORE = { id: "11111111-1111-1111-1111-111111111111", slug: "kemi", name: "Kemi's Closet", logo_url: null, custom_domain: null, email: "kemi@shop.ng", owner_email: null, growth_automations: { winBack: true } };
const brand = { name: "Kemi's <Closet>", accent: "#7c3aed", logo: null, url: "https://kemi.dukanigeria.com" };

beforeEach(() => {
  process.env.CRON_SECRET = "test-secret";
  h.features = new Set(["automations", "coupons"]);
  h.sent = [];
  h.claimed = new Set();
  h.rows = {
    stores: [STORE],
    welcome: [{ id: "c1", name: "Ada Obi", email: "ada@mail.com", code: "WELCOMEAB2CD", discount_value: "10", expires_at: new Date(Date.now() + 20 * 86400000).toISOString() }],
    review: [{ id: "o1", order_number: "ORD-1", customer_name: "Tunde", email: "tunde@mail.com" }],
    winback: [{ id: "c2", name: "Zainab", email: "zainab@mail.com", last_at: "2026-09-01" }],
  };
});

describe("settings", () => {
  it("defaults: code reminder and review on, win-back off; bad values fall back", () => {
    expect(parseAutomations(null)).toEqual({ welcomeReminder: true, reviewRequest: true, winBack: false, winBackPercent: 10 });
    expect(parseAutomations({ winBack: true, winBackPercent: 90, reviewRequest: "yes" })).toEqual({ welcomeReminder: true, reviewRequest: true, winBack: true, winBackPercent: 10 });
    expect(parseAutomations({ winBackPercent: 15, welcomeReminder: false }).winBackPercent).toBe(15);
  });
});

describe("the follow-up run", () => {
  it("Pro: sends each follow-up once, in the store's name, with a stop link", async () => {
    const r = await sendDueGrowthMessages();
    expect(r).toEqual({ stores: 1, sent: 3, failed: 0 });
    expect(h.sent.map((m) => m.to).sort()).toEqual(["ada@mail.com", "tunde@mail.com", "zainab@mail.com"]);
    for (const m of h.sent) {
      expect(m.opts.fromName).toBe("Kemi's Closet via Duka");
      expect(String(m.opts.unsubscribeUrl)).toContain("/api/growth/unsubscribe?s=");
      expect(m.html).toContain("Stop emails from Kemi&#39;s Closet".replace("&#39;", "'"));
    }
    const winback = h.sent.find((m) => m.to === "zainab@mail.com")!;
    expect(winback.subject).toContain("We miss you");
    expect(winback.html).toMatch(/BACK[A-Z0-9]{5}/);
    expect(h.sent.find((m) => m.to === "ada@mail.com")!.html).toContain("WELCOMEAB2CD");

    // A second run (or an overlapping one) sends nothing new
    h.sent = [];
    expect(await sendDueGrowthMessages()).toEqual({ stores: 1, sent: 0, failed: 0 });
    expect(h.sent).toEqual([]);
  });

  it("Free: nothing is sent", async () => {
    h.features = new Set(["coupons"]);
    expect(await sendDueGrowthMessages()).toEqual({ stores: 0, sent: 0, failed: 0 });
    expect(h.sent).toEqual([]);
  });

  it("only the follow-ups a store switched on", async () => {
    h.rows.stores = [{ ...STORE, growth_automations: { welcomeReminder: false, reviewRequest: true, winBack: false } }];
    await sendDueGrowthMessages();
    expect(h.sent.map((m) => m.to)).toEqual(["tunde@mail.com"]);
  });

  it("respects the per-run cap", async () => {
    expect((await sendDueGrowthMessages({ maxPerRun: 1 })).sent).toBe(1);
  });
});

describe("unsubscribe links", () => {
  it("are signed per store and address, case-insensitively", () => {
    const t = growthUnsubToken(STORE.id, "Ada@Mail.com")!;
    expect(verifyGrowthUnsub(STORE.id, "ada@mail.com", t)).toBe(true);
    expect(verifyGrowthUnsub(STORE.id, "someone@else.com", t)).toBe(false);
    expect(verifyGrowthUnsub("22222222-2222-2222-2222-222222222222", "ada@mail.com", t)).toBe(false);
    expect(growthUnsubUrl(STORE.id, "Ada@Mail.com")).toContain("e=ada%40mail.com");
  });
});

describe("emails", () => {
  it("escape what shoppers and vendors typed", () => {
    const { html } = welcomeCodeEmail(brand, { name: "<script>x</script>", code: "WELCOMEAB2CD", percent: 10, unsubscribeUrl: null });
    expect(html).not.toContain("<script>");
    expect(html).toContain(esc("Kemi's <Closet>"));
  });
  it("tag their links so orders count on the Growth page", () => {
    expect(emailLink("https://kemi.dukanigeria.com/products/x")).toBe("https://kemi.dukanigeria.com/products/x?utm_source=email");
    expect(classifySource({ utmSource: "email" })).toBe("email");
    const { html } = winBackEmail(brand, { name: "Zee", code: "BACKAB2CD", percent: 15, days: 14, products: [], unsubscribeUrl: "https://x/u" });
    expect(html).toContain("utm_source=email");
    expect(html).toContain("15% off");
  });
  it("pick readable button text for the store's colour", () => {
    expect(onAccent("#f59e0b")).toBe("#111111");
    expect(onAccent("#7c3aed")).toBe("#ffffff");
  });
  it("send under the store's name without breaking the address", async () => {
    const { withFromName } = await vi.importActual<typeof import("@/lib/notify/providers")>("@/lib/notify/providers");
    expect(withFromName("Duka <hello@dukanigeria.com>", 'Kemi\'s "Closet"')).toBe("Kemi's Closet <hello@dukanigeria.com>");
    expect(withFromName("hello@dukanigeria.com", "Ade <evil>")).toBe("Ade evil <hello@dukanigeria.com>");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  features: new Set<string>(["shopper_referrals", "broadcasts", "gift_cards"]),
  one: [] as unknown[], // queued queryOne results
  many: [] as unknown[][], // queued query results
  tx: [] as unknown[][], // queued transaction client results
  sql: [] as string[],
}));

vi.mock("@/lib/plan", () => ({ hasFeature: vi.fn(async (_s: string, f: string) => h.features.has(f)) }));
vi.mock("@/lib/store-brand", () => ({ storeAccent: vi.fn(async () => "#7c3aed") }));
vi.mock("@/lib/notify/providers", () => ({ emailConfigured: () => false, sendEmail: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/db", () => ({
  queryOne: vi.fn(async (sql: string) => {
    h.sql.push(sql);
    return h.one.length ? h.one.shift() : null;
  }),
  query: vi.fn(async (sql: string) => {
    h.sql.push(sql);
    return h.many.length ? h.many.shift() : [];
  }),
  withTransaction: vi.fn(async (fn: (c: unknown) => unknown) =>
    fn({ query: vi.fn(async (sql: string) => { h.sql.push(sql); return { rows: h.tx.length ? h.tx.shift() : [] }; }) }),
  ),
}));

import { checkReferralUse, parseReferralSettings, referralCode, referralLink, rewardReferral } from "@/lib/growth-referrals";
import { createBroadcast } from "@/lib/growth-broadcasts";
import { broadcastEmail } from "@/lib/growth-emails";
import { classifySource } from "@/lib/traffic-source";

const S = "11111111-1111-1111-1111-111111111111";
beforeEach(() => {
  h.features = new Set(["shopper_referrals", "broadcasts", "gift_cards"]);
  h.one = [];
  h.many = [];
  h.tx = [];
  h.sql = [];
});

describe("referral codes and links", () => {
  it("are friendly and shareable", () => {
    expect(referralCode("Adaeze Okafor")).toMatch(/^ADAEZE-[A-HJ-NP-Z2-9]{4}$/);
    expect(referralCode(null)).toMatch(/^FRIEND-/);
    const link = referralLink("https://kemi.dukanigeria.com", "ADA-K7P2");
    expect(link).toBe("https://kemi.dukanigeria.com/?ref=ADA-K7P2&utm_source=referral");
    expect(classifySource({ utmSource: "referral" })).toBe("referral");
  });
  it("settings: off by default, sensible limits", () => {
    expect(parseReferralSettings(null)).toEqual({ enabled: false, friendPercent: 10, reward: 1000 });
    expect(parseReferralSettings({ enabled: true, friendPercent: 80, reward: 50 })).toEqual({ enabled: true, friendPercent: 10, reward: 1000 });
  });
});

describe("using a friend code at checkout", () => {
  it("isn't a referral code: nothing to check", async () => {
    h.one = [null];
    expect(await checkReferralUse(S, "SUMMER10", "08031234567")).toBeNull();
  });
  it("your own code is refused", async () => {
    h.one = [{ id: "r1", phone_key: "2348031234567" }];
    expect(await checkReferralUse(S, "ada-k7p2", "0803 123 4567")).toMatchObject({ ok: false, error: expect.stringMatching(/own friend code/) });
  });
  it("first orders only", async () => {
    h.one = [{ id: "r1", phone_key: "2348030000000" }, { "?column?": 1 }];
    expect(await checkReferralUse(S, "ADA-K7P2", "08031234567")).toMatchObject({ ok: false, error: expect.stringMatching(/first orders/) });
  });
  it("a new friend is welcome", async () => {
    h.one = [{ id: "r1", phone_key: "2348030000000" }, null];
    expect(await checkReferralUse(S, "ADA-K7P2", "08031234567")).toEqual({ ok: true, referrerId: "r1", friendPhoneKey: "2348031234567" });
  });
  it("stops working if the store's plan no longer includes referrals", async () => {
    h.features = new Set();
    h.one = [{ id: "r1", phone_key: "2348030000000" }];
    expect(await checkReferralUse(S, "ADA-K7P2", "08031234567")).toMatchObject({ ok: false });
  });
});

describe("rewarding the referrer", () => {
  it("credits a new store-credit card once the friend's order is delivered", async () => {
    h.one = [{ referral_settings: { enabled: true, reward: 2000 } }];
    h.tx = [
      [{ id: "ref1", referrer_id: "r1" }], // pending -> rewarded
      [{ id: "r1", name: "Ada", email: null, phone_key: "2348030000000", credit_card_id: null }],
      [{ id: "card1" }], // new store credit card
      [], // link card to referrer
      [], // ledger
      [{ customer_name: "Bola" }],
    ];
    expect(await rewardReferral("o1", S)).toEqual({ reward: 2000 });
    expect(h.sql.some((q) => /INSERT INTO gift_cards/.test(q) && /'store_credit'/.test(q))).toBe(true);
    expect(h.sql.some((q) => /INSERT INTO gift_card_ledger/.test(q))).toBe(true);
  });
  it("never pays twice (or for a cancelled order)", async () => {
    h.one = [{ referral_settings: { enabled: true } }];
    h.tx = [[]]; // no pending referral for this order
    expect(await rewardReferral("o1", S)).toBeNull();
    expect(h.sql.some((q) => /INSERT INTO gift_cards/.test(q))).toBe(false);
  });
  it("nothing when the store turned referrals off", async () => {
    h.one = [{ referral_settings: { enabled: false } }];
    expect(await rewardReferral("o1", S)).toBeNull();
  });
});

describe("broadcasts", () => {
  const input = { subject: "New arrivals", body: "Fresh stock is in, come see!", productIds: [], audience: "all" as const };
  it("one a day: refuses another within 20 hours", async () => {
    h.one = [{ created_at: new Date(Date.now() - 3600_000).toISOString() }];
    expect(await createBroadcast(S, input)).toMatchObject({ ok: false, error: expect.stringMatching(/one a day/) });
  });
  it("only active discount codes can be attached", async () => {
    h.one = [null, { n: 0 }, null];
    expect(await createBroadcast(S, { ...input, couponId: "22222222-2222-2222-2222-222222222222" })).toMatchObject({ ok: false, error: expect.stringMatching(/isn't active/) });
  });
  it("queues everyone in the audience, capped by what's left this month", async () => {
    h.one = [null, { n: 4990 }, { id: "b1" }];
    h.many = [[{ email: "a@x.com" }, { email: "b@x.com" }]];
    expect(await createBroadcast(S, input)).toEqual({ ok: true, id: "b1", recipients: 2 });
    const insert = h.sql.find((q) => /INSERT INTO broadcast_recipients/.test(q))!;
    expect(insert).toMatch(/marketing_consent/);
    expect(insert).toMatch(/growth_unsubscribes/);
  });
  it("nobody to send to: cancelled with a clear reason", async () => {
    h.one = [null, { n: 0 }, { id: "b2" }];
    h.many = [[]];
    expect(await createBroadcast(S, input)).toMatchObject({ ok: false, error: expect.stringMatching(/No one/) });
  });
  it("the email escapes the vendor's words and keeps their paragraphs", () => {
    const { html, subject } = broadcastEmail(
      { name: "Kemi", accent: "#7c3aed", logo: null, url: "https://kemi.dukanigeria.com" },
      { name: "Ada", subject: "Sale!", body: "Hello <b>all</b>\n\nSecond para", products: [], coupon: { code: "SALE10", note: "10% off" }, unsubscribeUrl: "https://x/u" },
    );
    expect(subject).toBe("Sale!");
    expect(html).not.toContain("<b>all</b>");
    expect(html).toContain("Second para");
    expect(html).toContain("SALE10");
    expect(html).toContain("utm_source=email");
  });
});

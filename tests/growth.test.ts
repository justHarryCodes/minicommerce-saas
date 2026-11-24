import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn() }));
import { GROWTH_STATEMENTS } from "@/lib/growth-schema";
import { SHARE_CHANNELS, trackedLink, welcomeHeadline } from "@/lib/growth-shared";
import { classifySource } from "@/lib/traffic-source";

const squash = (s: string) => s.replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim().toLowerCase();

describe("growth engine schema", () => {
  it("the first-use setup matches the growth migrations", () => {
    const migration = ["growth_engine.sql", "growth_automations.sql", "growth_phase3.sql"].map((f) => squash(readFileSync(join(__dirname, "../migrations", f), "utf8"))).join(" ");
    for (const st of GROWTH_STATEMENTS) expect(migration).toContain(squash(st));
  });
});

describe("tracked share links", () => {
  it("each channel's link is counted as that channel by the storefront", () => {
    for (const c of SHARE_CHANNELS) {
      const url = new URL(trackedLink("https://kemi.dukanigeria.com", c.source));
      expect(classifySource({ utmSource: url.searchParams.get("utm_source"), referrer: "" })).toBe(c.source);
    }
  });
  it("keeps the store's own path and query", () => {
    expect(trackedLink("https://shop.kemi.com/?ref=bio", "instagram")).toBe("https://shop.kemi.com/?ref=bio&utm_source=instagram");
  });
});

describe("welcome headline", () => {
  it("defaults to the discount, or uses the vendor's own words", () => {
    expect(welcomeHeadline(15)).toBe("Get 15% off your first order");
    expect(welcomeHeadline(15, "  Free delivery on your first order ")).toBe("Free delivery on your first order");
  });
});

describe("welcome offer", () => {
  it("a new shopper becomes a contact and gets their own one-time code", async () => {
    const { queryOne } = await import("@/lib/db");
    const q = vi.mocked(queryOne);
    q.mockReset();
    q.mockResolvedValueOnce({ id: "contact-1" }) // saved as a contact
      .mockResolvedValueOnce(null) // hasn't bought here before
      .mockResolvedValueOnce(null) // no code yet
      .mockResolvedValueOnce({ expires_at: "2026-12-24T00:00:00Z" }); // code created
    const { claimWelcome } = await import("@/lib/growth");
    const r = await claimWelcome({ id: "s1", welcome_offer_percent: 15 }, { phone: "0803 123 4567", name: "Ada" });
    expect(r.status).toBe("code");
    if (r.status === "code") {
      expect(r.code).toMatch(/^WELCOME[A-HJ-NP-Z2-9]{5}$/);
      expect(r.percent).toBe(15);
    }
    // consent and the normalised phone are stored
    const [sql, params] = q.mock.calls[0];
    expect(sql).toMatch(/marketing_consent/);
    expect(params).toContain("2348031234567");
    // the code is single-use, made for this contact
    const [codeSql, codeParams] = q.mock.calls[3];
    expect(codeSql).toMatch(/'welcome'/);
    expect(codeParams).toEqual(["s1", expect.stringMatching(/^WELCOME/), 15, "30", "contact-1"]);
  });

  it("someone who already bought here is kept on the list but gets no first-order code", async () => {
    const { queryOne } = await import("@/lib/db");
    const q = vi.mocked(queryOne);
    q.mockReset();
    q.mockResolvedValueOnce({ id: "contact-2" }).mockResolvedValueOnce({ "?column?": 1 });
    const { claimWelcome } = await import("@/lib/growth");
    expect(await claimWelcome({ id: "s1", welcome_offer_percent: 10 }, { phone: "08031234567" })).toEqual({ status: "customer" });
  });

  it("asking again returns the same unused code instead of a new one", async () => {
    const { queryOne } = await import("@/lib/db");
    const q = vi.mocked(queryOne);
    q.mockReset();
    q.mockResolvedValueOnce({ id: "contact-3" }).mockResolvedValueOnce(null).mockResolvedValueOnce({ code: "WELCOMEABCDE", uses_count: 0, expires_at: "2099-01-01T00:00:00Z", discount_value: 10 });
    const { claimWelcome } = await import("@/lib/growth");
    const r = await claimWelcome({ id: "s1", welcome_offer_percent: 10 }, { phone: "08031234567" });
    expect(r).toMatchObject({ status: "code", code: "WELCOMEABCDE" });
    expect(q).toHaveBeenCalledTimes(3);
  });

  it("refuses a number that isn't a Nigerian mobile", async () => {
    const { claimWelcome } = await import("@/lib/growth");
    expect(await claimWelcome({ id: "s1", welcome_offer_percent: 10 }, { phone: "12345" })).toEqual({ status: "invalid_phone" });
  });
});

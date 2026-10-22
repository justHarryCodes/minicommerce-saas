import { describe, it, expect, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────
// Plan resolution: which paid features a store actually has. This is the
// real lib/plan against a mocked database (no plan mock here).
// ─────────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn(), withTransaction: vi.fn() }));

import { queryOne } from "@/lib/db";
import { getStoreFeatures, hasFeature, invalidatePlanCache, requireFeature } from "@/lib/plan";
import { ALL_FEATURES, featureForPath, featuresForPlan, FREE_THEME_IDS } from "@/lib/features-shared";
import { resolveStoreTheme } from "@/lib/themes/resolve";
import { THEMES } from "@/lib/themes/catalog";

const mockedQueryOne = vi.mocked(queryOne);
beforeEach(() => {
  vi.clearAllMocks();
  invalidatePlanCache(); // each test sets up its own plan rows
});

const FREE = { id: "free", name: "Free", price_monthly: 0, max_products: 10, max_reels: 0, features: null };
const PRO = { id: "pro", name: "Pro", price_monthly: 5000, max_products: 1000, max_reels: 50, features: null };
const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

describe("featuresForPlan", () => {
  it("defaults: paid plans get everything, Free gets nothing", () => {
    expect(featuresForPlan({ isPro: true })).toEqual(ALL_FEATURES);
    expect(featuresForPlan({ isPro: false })).toEqual([]);
    expect(featuresForPlan({ isPro: false, features: null })).toEqual([]);
  });

  it("an admin list wins, and unknown names are ignored", () => {
    expect(featuresForPlan({ isPro: true, features: ["pos", "nonsense", "team"] })).toEqual(["pos", "team"]);
    expect(featuresForPlan({ isPro: false, features: ["coupons"] })).toEqual(["coupons"]);
    expect(featuresForPlan({ isPro: true, features: [] })).toEqual([]);
  });
});

describe("getStoreFeatures", () => {
  it("an active paid plan unlocks its features", async () => {
    mockedQueryOne.mockResolvedValueOnce({ current_plan_id: "pro", plan_expires_at: future }).mockResolvedValueOnce(PRO);
    expect((await getStoreFeatures("s1")).has("pos")).toBe(true);
  });

  it("an expired paid plan falls back to Free — nothing paid keeps working", async () => {
    mockedQueryOne.mockResolvedValueOnce({ current_plan_id: "pro", plan_expires_at: past }).mockResolvedValueOnce(FREE);
    expect([...(await getStoreFeatures("s1"))]).toEqual([]);
  });

  it("no plan at all is Free", async () => {
    mockedQueryOne.mockResolvedValueOnce({ current_plan_id: null, plan_expires_at: null }).mockResolvedValueOnce(FREE);
    expect(await hasFeature("s1", "team")).toBe(false);
  });

  it("a deactivated paid plan falls back to Free", async () => {
    mockedQueryOne
      .mockResolvedValueOnce({ current_plan_id: "pro", plan_expires_at: future })
      .mockResolvedValueOnce(null) // plan row inactive / gone
      .mockResolvedValueOnce(FREE);
    expect(await hasFeature("s1", "coupons")).toBe(false);
  });

  it("honours a plan's custom feature list", async () => {
    mockedQueryOne
      .mockResolvedValueOnce({ current_plan_id: "starter", plan_expires_at: future })
      .mockResolvedValueOnce({ ...PRO, id: "starter", features: ["coupons", "analytics"] });
    const f = await getStoreFeatures("s1");
    expect(f.has("coupons")).toBe(true);
    expect(f.has("pos")).toBe(false);
  });

  it("requireFeature answers 403 with a machine-readable code", async () => {
    mockedQueryOne.mockResolvedValueOnce({ current_plan_id: null, plan_expires_at: null }).mockResolvedValueOnce(FREE);
    const res = await requireFeature("s1", "gift_cards");
    expect(res?.status).toBe(403);
    expect(await res!.json()).toMatchObject({ code: "plan_required", feature: "gift_cards" });
  });
});

describe("paid dashboard pages", () => {
  it("map to their feature, and core pages stay free", () => {
    expect(featureForPath("/dashboard/pos")).toBe("pos");
    expect(featureForPath("/dashboard/customers/123")).toBe("customers");
    expect(featureForPath("/dashboard/team")).toBe("team");
    expect(featureForPath("/dashboard/products")).toBeNull();
    expect(featureForPath("/dashboard/orders")).toBeNull();
    expect(featureForPath("/dashboard/settings")).toBeNull();
    expect(featureForPath("/dashboard/possible")).toBeNull();
  });
});

describe("premium themes", () => {
  it("one free theme per category", () => {
    const cats = new Set(THEMES.filter((t) => FREE_THEME_IDS.has(t.id)).map((t) => t.category));
    expect(cats.size).toBe(FREE_THEME_IDS.size);
    expect(cats).toEqual(new Set(THEMES.map((t) => t.category)));
  });

  it("a saved premium theme renders as the free theme of its category once the plan lapses", () => {
    const premiumFood = THEMES.find((t) => t.category === "food" && !FREE_THEME_IDS.has(t.id))!;
    const store = { storefront_theme_id: premiumFood.id, storefront_customization: null };
    expect(resolveStoreTheme(store, null, { premiumOk: true }).id).toBe(premiumFood.id);
    expect(resolveStoreTheme(store, null, { premiumOk: false }).id).toBe("quick-bites");
  });

  it("free themes are never touched", () => {
    const store = { storefront_theme_id: "atelier", storefront_customization: null };
    expect(resolveStoreTheme(store, null, { premiumOk: false }).id).toBe("atelier");
  });
});

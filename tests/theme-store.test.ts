import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────
// Buying a single premium theme (₦2,500, one time, no Pro needed) and the
// expanded catalogue (41 themes across 9 categories).
// ─────────────────────────────────────────────────────────────────────────

vi.mock("@/lib/plan", async () => (await import("./helpers/plan-mock")).planMock.module());
vi.mock("@/lib/db", () => ({ query: vi.fn().mockResolvedValue([]), queryOne: vi.fn(), withTransaction: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifySession: vi.fn(), getUserStore: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/redis", () => ({
  getOrSet: vi.fn(async (_k: string, fn: () => unknown) => fn()),
  cacheDel: vi.fn(),
  cacheKey: { storeMeta: (s: string) => `store:${s}` },
}));
vi.mock("@/lib/store-cache", () => ({ invalidateStore: vi.fn(), invalidateStoreSoon: vi.fn() }));
vi.mock("@/lib/payments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/payments")>()),
  startPayment: vi.fn(),
}));

import { planMock } from "./helpers/plan-mock";
import { query } from "@/lib/db";
import { verifySession, getUserStore } from "@/lib/auth";
import { startPayment } from "@/lib/payments";
import { canUseTheme } from "@/lib/theme-access";
import { THEMES, THEME_CATEGORIES } from "@/lib/themes/catalog";
import { FREE_THEME_IDS, THEME_PRICE_NGN } from "@/lib/features-shared";
import { getDemoStore } from "@/lib/themes/demo";

const mockedQuery = vi.mocked(query);
const mockedStart = vi.mocked(startPayment);
const owner = { firebaseUid: "uid-1", email: "owner@x.com" };
const store = { id: "store-1", name: "Scents", slug: "scents" } as never;
const req = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  planMock.set([]); // Free plan
  mockedQuery.mockResolvedValue([]);
  vi.mocked(verifySession).mockResolvedValue(owner);
  vi.mocked(getUserStore).mockResolvedValue(store);
  mockedStart.mockResolvedValue({ ok: true, authorizationUrl: "https://checkout.paystack.com/x", reference: "THEME-1", reused: false });
});

describe("buying a theme", () => {
  it("opens a ₦2,500 checkout scoped to this store and theme", async () => {
    const { POST } = await import("@/app/api/dashboard/themes/purchase/route");
    const res = await POST(req({ themeId: "oud-house" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ authorization_url: "https://checkout.paystack.com/x" });
    expect(mockedStart).toHaveBeenCalledWith(expect.objectContaining({ kind: "theme", storeId: "store-1", targetId: "store-1:oud-house", amount: 2500 }));
    expect(THEME_PRICE_NGN).toBe(2500);
  });

  it("isn't needed on a plan with every theme", async () => {
    planMock.set(["premium_themes"]);
    const { POST } = await import("@/app/api/dashboard/themes/purchase/route");
    expect((await POST(req({ themeId: "oud-house" }))).status).toBe(400);
    expect(mockedStart).not.toHaveBeenCalled();
  });

  it("can't buy a free theme, an unknown theme, or one you already own", async () => {
    const { POST } = await import("@/app/api/dashboard/themes/purchase/route");
    expect((await POST(req({ themeId: "classic" }))).status).toBe(400);
    expect((await POST(req({ themeId: "nope" }))).status).toBe(404);
    mockedQuery.mockResolvedValueOnce([{ theme_id: "oud-house" }]);
    expect((await POST(req({ themeId: "oud-house" }))).status).toBe(409);
    expect(mockedStart).not.toHaveBeenCalled();
  });

  it("is owner-only", async () => {
    vi.mocked(getUserStore).mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/dashboard/themes/purchase/route");
    expect((await POST(req({ themeId: "oud-house" }))).status).toBe(403);
  });
});

describe("who can use a theme", () => {
  it("free themes always, premium with Pro or after buying", async () => {
    expect(await canUseTheme("store-1", "noir-essence")).toBe(true); // free in its category
    expect(await canUseTheme("store-1", "oud-house")).toBe(false);
    mockedQuery.mockResolvedValueOnce([{ theme_id: "oud-house" }]);
    expect(await canUseTheme("store-1", "oud-house")).toBe(true);
    planMock.set(["premium_themes"]);
    expect(await canUseTheme("store-1", "wig-vault")).toBe(true);
  });

  it("applying a bought premium theme is allowed; an unbought one isn't", async () => {
    const { PUT } = await import("@/app/api/stores/theme/route");
    expect((await PUT(req({ themeId: "oud-house" }))).status).toBe(403);
    mockedQuery.mockResolvedValueOnce([{ theme_id: "oud-house" }]); // owned
    expect((await PUT(req({ themeId: "oud-house" }))).status).toBe(200);
  });
});

describe("the catalogue", () => {
  it("has the new verticals with the agreed counts, one free theme each", () => {
    const want: Record<string, number> = { perfume: 5, market: 5, gadgets: 5, hair: 5, interior: 3 };
    for (const [cat, n] of Object.entries(want)) {
      expect(THEMES.filter((t) => t.category === cat)).toHaveLength(n);
      expect(THEMES.filter((t) => t.category === cat && FREE_THEME_IDS.has(t.id))).toHaveLength(1);
      expect(THEME_CATEGORIES.find((c) => c.id === cat)?.limit).toBe(n);
    }
    expect(THEMES).toHaveLength(41);
  });

  it("every new theme has a demo store that fits its vertical", () => {
    for (const t of THEMES.filter((x) => ["perfume", "market", "gadgets", "hair", "interior"].includes(x.category))) {
      const demo = getDemoStore(t);
      expect(demo.products.length).toBeGreaterThanOrEqual(8);
      for (const tile of demo.categoryTiles) expect(tile.product_count).toBeGreaterThan(0);
    }
    expect(getDemoStore(THEMES.find((t) => t.id === "noir-essence")!).store.name).toBe("Maison Ọ̀rí");
    expect(getDemoStore(THEMES.find((t) => t.id === "mama-market")!).store.name).toBe("Mama Nkechi's Market");
  });
});

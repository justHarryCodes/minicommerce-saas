import { describe, it, expect, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────
// Speed work: Redis can never slow a page down, repeat lookups are shared,
// storefront caches refresh the moment a store changes, and the browser
// only receives the data it renders.
// ─────────────────────────────────────────────────────────────────────────

const { store, state, fakeRedis } = vi.hoisted(() => {
  const store = new Map<string, string>();
  const state = { delayMs: 0, fails: false };
  const fakeRedis = {
    get: vi.fn(async (k: string) => {
      if (state.fails) throw new Error("down");
      if (state.delayMs) await new Promise((r) => setTimeout(r, state.delayMs));
      return store.get(k) ?? null;
    }),
    set: vi.fn(async (k: string, v: string) => { store.set(k, v); return "OK"; }),
    del: vi.fn(async (k: string) => { store.delete(k); return 1; }),
    incr: vi.fn(async (k: string) => { const n = Number(store.get(k) ?? 0) + 1; store.set(k, String(n)); return n; }),
    expire: vi.fn(async () => 1),
    on: vi.fn(),
  };
  return { store, state, fakeRedis };
});
vi.mock("ioredis", () => ({ default: vi.fn(() => fakeRedis) }));
vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn(), withTransaction: vi.fn() }));

import { queryOne } from "@/lib/db";
import { cacheDel, getOrSet, resetRedisBreaker, safeRedis } from "@/lib/redis";
import { invalidateStore, storeCached } from "@/lib/store-cache";
import { getEffectivePlan, invalidatePlanCache } from "@/lib/plan";
import { toCardProduct, toPublicStore } from "@/lib/public-store";
import imageLoader from "@/lib/image-loader";

const mockedQueryOne = vi.mocked(queryOne);

beforeEach(() => {
  vi.clearAllMocks();
  store.clear();
  state.delayMs = 0;
  state.fails = false;
  resetRedisBreaker();
  invalidatePlanCache();
});

describe("Redis never slows a page down", () => {
  it("a hung Redis call gives up after a quarter second", async () => {
    state.delayMs = 5_000;
    const t = Date.now();
    expect(await safeRedis((r) => r.get("k"), "fallback")).toBe("fallback");
    expect(Date.now() - t).toBeLessThan(1_000);
  });

  it("after repeated failures Redis is skipped entirely for a while", async () => {
    state.fails = true;
    for (let i = 0; i < 3; i++) await safeRedis((r) => r.get("k"), null);
    fakeRedis.get.mockClear();
    state.fails = false;
    expect(await safeRedis((r) => r.get("k"), "skipped")).toBe("skipped");
    expect(fakeRedis.get).not.toHaveBeenCalled();
  });
});

describe("getOrSet", () => {
  it("concurrent callers share one lookup (layout + page + metadata)", async () => {
    const fetcher = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return { id: "s1" };
    });
    const [a, b, c] = await Promise.all([getOrSet("k1", fetcher), getOrSet("k1", fetcher), getOrSet("k1", fetcher)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ id: "s1" });
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("repeat reads are served from memory, and cacheDel refreshes at once", async () => {
    const fetcher = vi.fn(async () => ({ v: fetcher.mock.calls.length }));
    await getOrSet("k2", fetcher);
    fakeRedis.get.mockClear();
    expect(await getOrSet("k2", fetcher)).toEqual({ v: 1 });
    expect(fakeRedis.get).not.toHaveBeenCalled(); // no network for a hot key
    await cacheDel("k2");
    expect(await getOrSet("k2", fetcher)).toEqual({ v: 2 });
  });
});

describe("storefront cache", () => {
  it("serves repeats from cache and refreshes after the store changes", async () => {
    const fetcher = vi.fn(async () => ({ products: fetcher.mock.calls.length }));
    expect(await storeCached("store-a", "home", fetcher)).toEqual({ products: 1 });
    expect(await storeCached("store-a", "home", fetcher)).toEqual({ products: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);

    await invalidateStore("store-a", "shop-a");
    expect(await storeCached("store-a", "home", fetcher)).toEqual({ products: 2 });
  });

  it("one store's change never touches another store's cache", async () => {
    const a = vi.fn(async () => "A");
    const b = vi.fn(async () => "B");
    await storeCached("store-a", "home", a);
    await storeCached("store-b", "home", b);
    await invalidateStore("store-a", "shop-a");
    expect(await storeCached("store-b", "home", b)).toBe("B");
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("keeps working (straight from the database) when Redis is down", async () => {
    state.fails = true;
    const fetcher = vi.fn(async () => "fresh");
    expect(await storeCached("store-c", "home", fetcher)).toBe("fresh");
  });
});

describe("plan lookups", () => {
  it("are remembered briefly and refreshed on invalidation", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const pro = { id: "pro", name: "Pro", price_monthly: 5000, max_products: 100, max_reels: 5, features: null };
    mockedQueryOne.mockResolvedValueOnce({ current_plan_id: "pro", plan_expires_at: future }).mockResolvedValueOnce(pro);
    expect((await getEffectivePlan("s1")).isPro).toBe(true);
    expect((await getEffectivePlan("s1")).isPro).toBe(true);
    expect(mockedQueryOne).toHaveBeenCalledTimes(2); // second call: no queries

    invalidatePlanCache("s1");
    mockedQueryOne
      .mockResolvedValueOnce({ current_plan_id: null, plan_expires_at: null })
      .mockResolvedValueOnce({ ...pro, id: "free", name: "Free", price_monthly: 0 });
    expect((await getEffectivePlan("s1")).isPro).toBe(false);
  });
});

describe("the browser only gets what it renders", () => {
  it("store: private fields never reach the page", () => {
    const row = {
      id: "s1", name: "Bukka", slug: "bukka", logo_url: "https://x/l.png", phone: "080",
      owner_id: "firebase-uid", owner_email: "owner@x.com", nin_number: "12345678901",
      bank_account_number: "0123456789", paystack_public_key: "pk_live", subscription_status: "subscribed",
      referral_code: "ABC", current_plan_id: "pro",
    };
    const pub = toPublicStore(row as never) as unknown as Record<string, unknown>;
    expect(pub).toMatchObject({ id: "s1", name: "Bukka", slug: "bukka", logo_url: "https://x/l.png", phone: "080" });
    for (const k of ["owner_id", "owner_email", "nin_number", "bank_account_number", "paystack_public_key", "subscription_status", "referral_code", "current_plan_id"]) {
      expect(pub).not.toHaveProperty(k);
    }
  });

  it("product cards: two images and a short description, nothing else heavy", () => {
    const card = toCardProduct({
      id: "p1", slug: "shoe", name: "Shoe", price: 5000, images: ["a", "b", "c", "d"],
      description: "x".repeat(5000), size_guide: { columns: [], rows: [] }, option_names: ["Size"], low_stock_threshold: 3,
    });
    expect(card.images).toEqual(["a", "b"]);
    expect(String(card.description).length).toBe(300);
    expect(card).not.toHaveProperty("size_guide");
    expect(card).not.toHaveProperty("low_stock_threshold");
  });
});

describe("image loader", () => {
  it("lets Cloudinary resize and convert its own images", () => {
    expect(imageLoader({ src: "https://res.cloudinary.com/demo/image/upload/v123/shoe.jpg", width: 640 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_640,c_limit/v123/shoe.jpg"
    );
    expect(imageLoader({ src: "https://res.cloudinary.com/demo/image/upload/v1/a.png", width: 96, quality: 80 })).toContain("q_80,w_96");
  });

  it("loads other images directly (the /_next/image optimiser is off with a custom loader)", () => {
    expect(imageLoader({ src: "/logo.png", width: 96 })).toBe("/logo.png#w=96");
    expect(imageLoader({ src: "https://images.unsplash.com/photo-1?x=1", width: 640 })).toContain("w=640");
    expect(imageLoader({ src: "https://firebasestorage.googleapis.com/a.jpg", width: 320 })).toBe("https://firebasestorage.googleapis.com/a.jpg#w=320");
  });
});

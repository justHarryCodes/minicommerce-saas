import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { FREE_FEATURES, FREE_LIMITS, featuresForPlan } from "@/lib/features-shared";

// The Free plan's taste of Pro: what it includes, and the limits holding.
const limits = vi.hoisted(() => ({ value: null as null | { analyticsDays: number; activeCoupons: number; posSalesPerMonth: number }, active: 0 }));

vi.mock("@/lib/db", () => ({ query: vi.fn().mockResolvedValue([{ id: "c-new" }]), queryOne: vi.fn(), queryMany: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifySession: vi.fn(async () => ({ firebaseUid: "u1", email: "a@b.c" })) }));
vi.mock("@/lib/plan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/plan")>();
  return {
    ...actual,
    requireFeature: vi.fn(async () => null),
    hasFeature: vi.fn(async () => true),
    freeLimitsFor: vi.fn(async () => limits.value),
    activeCouponCount: vi.fn(async () => limits.active),
  };
});

import { queryOne } from "@/lib/db";
import { POST as createCoupon } from "@/app/api/stores/coupons/route";
import { PATCH as patchCoupon } from "@/app/api/stores/coupons/[id]/route";
import { checkCoupon } from "@/lib/coupons";

const mockedQueryOne = vi.mocked(queryOne);
const req = (body: unknown) => new NextRequest("http://x/api", { method: "POST", body: JSON.stringify(body) });
const FREE = { analyticsDays: 7, activeCoupons: 1, posSalesPerMonth: 10 };

beforeEach(() => {
  mockedQueryOne.mockReset();
  limits.value = null;
  limits.active = 0;
});

describe("what Free includes", () => {
  it("gets analytics, customers, coupons, back-in-stock alerts, POS and reels, but not the big Pro tools", () => {
    const f = featuresForPlan({ isPro: false });
    expect(f).toEqual(FREE_FEATURES);
    for (const pro of ["custom_domain", "ai_tools", "team", "abandoned_carts", "customer_messages", "inventory_tools"] as const) expect(f).not.toContain(pro);
    expect(FREE_LIMITS).toEqual(FREE);
  });
});

describe("Free: one active discount code", () => {
  it("refuses a second code on Free, with a plain explanation", async () => {
    limits.value = FREE;
    limits.active = 1;
    mockedQueryOne.mockResolvedValueOnce({ id: "s1" }); // the store
    const res = await createCoupon(req({ code: "WEEKEND", discount_type: "percentage", discount_value: 10 }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("plan_limit");
    expect(body.error).toMatch(/1 active discount code/);
  });

  it("allows the first code on Free, and any number on Pro", async () => {
    limits.value = FREE;
    mockedQueryOne.mockResolvedValueOnce({ id: "s1" }).mockResolvedValueOnce(null); // store, no clash
    expect((await createCoupon(req({ code: "FIRST", discount_type: "percentage", discount_value: 10 }))).status).toBe(201);

    limits.value = null;
    limits.active = 7;
    mockedQueryOne.mockResolvedValueOnce({ id: "s1" }).mockResolvedValueOnce(null);
    expect((await createCoupon(req({ code: "EIGHTH", discount_type: "fixed", discount_value: 500 }))).status).toBe(201);
  });

  it("won't switch a second code on, but switching one off is always fine", async () => {
    limits.value = FREE;
    limits.active = 1;
    mockedQueryOne.mockResolvedValueOnce({ id: "s1" }).mockResolvedValueOnce(null); // store, code isn't on yet
    const on = await patchCoupon(new NextRequest("http://x", { method: "PATCH", body: JSON.stringify({ is_active: true }) }), { params: Promise.resolve({ id: "c2" }) });
    expect(on.status).toBe(403);

    mockedQueryOne.mockResolvedValueOnce({ id: "s1" });
    const off = await patchCoupon(new NextRequest("http://x", { method: "PATCH", body: JSON.stringify({ is_active: false }) }), { params: Promise.resolve({ id: "c1" }) });
    expect(off.status).toBe(200);
  });

  it("at checkout, Free honours only its newest active code (codes left on from a Pro period stop working)", async () => {
    limits.value = FREE;
    mockedQueryOne.mockResolvedValueOnce(null);
    await checkCoupon("s1", "old10", 10000);
    const [sql, params] = mockedQueryOne.mock.calls[0];
    expect(sql).toMatch(/ORDER BY created_at DESC LIMIT \$3/);
    expect(params).toEqual(["s1", "OLD10", 1]);

    limits.value = null;
    mockedQueryOne.mockResolvedValueOnce(null);
    await checkCoupon("s1", "old10", 10000);
    expect(mockedQueryOne.mock.calls[1][1]).toEqual(["s1", "OLD10", null]);
  });
});

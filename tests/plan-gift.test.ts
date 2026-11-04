import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/admin-auth", () => ({ verifyAdminSession: vi.fn(), logAdminAction: vi.fn() }));
vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn() }));
vi.mock("@/lib/store-cache", () => ({ invalidateStore: vi.fn() }));
vi.mock("@/lib/plan", () => ({ invalidatePlanCache: vi.fn() }));

import { PATCH } from "@/app/api/admin/vendors/[id]/route";
import { verifyAdminSession, logAdminAction } from "@/lib/admin-auth";
import { query, queryOne } from "@/lib/db";
import { invalidatePlanCache } from "@/lib/plan";
import { addMonths, giftPeriod } from "@/lib/plan-gift";

// Duka admins gifting Pro / Business for 1, 3, 6 or 12 months.

const PRO = "6d39434c-73e4-4632-9f58-8e0268ca8ace";
const BUSINESS = "67c320d1-3ec0-4a68-be79-d04729b3e4e1";
const now = new Date("2026-11-04T10:00:00Z");

describe("gift dates", () => {
  it("adds calendar months, clamping to the month's last day", () => {
    expect(addMonths(new Date(2026, 0, 31), 1)).toEqual(new Date(2026, 1, 28));
    expect(addMonths(new Date(2026, 10, 4), 12)).toEqual(new Date(2027, 10, 4));
  });

  it("the same plan, still running: adds on top of the time left", () => {
    const end = new Date("2026-12-01T00:00:00Z");
    const p = giftPeriod({ planId: PRO, expiresAt: end }, PRO, 3, now);
    expect(p.extended).toBe(true);
    expect(p.startsAt).toEqual(end);
    expect(p.expiresAt).toEqual(addMonths(end, 3));
  });

  it("a different plan, or an expired one, starts today", () => {
    expect(giftPeriod({ planId: PRO, expiresAt: "2026-12-01" }, BUSINESS, 6, now)).toMatchObject({ extended: false, startsAt: now });
    expect(giftPeriod({ planId: PRO, expiresAt: "2026-01-01" }, PRO, 1, now)).toMatchObject({ extended: false, startsAt: now });
  });
});

const req = (body: unknown) => new NextRequest("http://x.test/api/admin/vendors/s1", { method: "PATCH", body: JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id: "s1" }) };

describe("admin vendor API: gift_plan / end_plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdminSession).mockResolvedValue({ firebaseUid: "admin", email: "admin@duka.ng" } as never);
  });

  it("only Duka admins can gift", async () => {
    vi.mocked(verifyAdminSession).mockResolvedValue(null as never);
    const res = await PATCH(req({ action: "gift_plan", planId: PRO, months: 3 }), ctx);
    expect(res.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it("gifts Business for a year: sets the plan and end date, and logs it", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce({ id: "s1", name: "Amaka", current_plan_id: null, plan_expires_at: null } as never)
      .mockResolvedValueOnce({ id: BUSINESS, name: "Business", price_monthly: 17000 } as never);
    const res = await PATCH(req({ action: "gift_plan", planId: BUSINESS, months: 12 }), ctx);
    expect(res.status).toBe(200);
    const [sql, params] = vi.mocked(query).mock.calls[0];
    expect(String(sql)).toMatch(/UPDATE stores SET current_plan_id/);
    expect(params![0]).toBe(BUSINESS);
    const days = (new Date(params![1] as string).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(363);
    expect(days).toBeLessThan(367);
    expect(invalidatePlanCache).toHaveBeenCalledWith("s1");
    expect(vi.mocked(logAdminAction).mock.calls[0][0]).toMatchObject({ action: "gift_plan:business:12m", targetId: "s1" });
  });

  it("refuses odd lengths and the Free plan", async () => {
    vi.mocked(queryOne).mockResolvedValue({ id: "s1", name: "Amaka", current_plan_id: null, plan_expires_at: null } as never);
    expect((await PATCH(req({ action: "gift_plan", planId: PRO, months: 2 }), ctx)).status).toBe(422);

    vi.mocked(queryOne)
      .mockResolvedValueOnce({ id: "s1", name: "Amaka", current_plan_id: null, plan_expires_at: null } as never)
      .mockResolvedValueOnce({ id: "free", name: "Free", price_monthly: 0 } as never);
    expect((await PATCH(req({ action: "gift_plan", planId: PRO, months: 1 }), ctx)).status).toBe(422);
    expect(query).not.toHaveBeenCalled();
  });

  it("end_plan moves the store back to Free", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce({ id: "s1", name: "Amaka", current_plan_id: PRO, plan_expires_at: "2027-01-01" } as never)
      .mockResolvedValueOnce({ id: "free-plan" } as never);
    const res = await PATCH(req({ action: "end_plan" }), ctx);
    expect(res.status).toBe(200);
    expect(vi.mocked(query).mock.calls[0][1]).toEqual(["free-plan", "s1"]);
    expect(vi.mocked(logAdminAction).mock.calls[0][0]).toMatchObject({ action: "end_plan" });
  });
});

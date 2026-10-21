import { vi } from "vitest";
import { ALL_FEATURES, type Feature } from "@/lib/features-shared";

/**
 * A stand-in for @/lib/plan where the store's plan includes every paid
 * feature. Tests about other behaviour use it so plan lookups don't eat
 * their mocked database rows. `planMock.set([...])` narrows it per test.
 */
let enabled = new Set<Feature>(ALL_FEATURES);

export const planMock = {
  set(features: Feature[]) {
    enabled = new Set(features);
  },
  reset() {
    enabled = new Set(ALL_FEATURES);
  },
  module() {
    return {
      getEffectivePlan: vi.fn(async () => ({
        id: "plan-pro", name: "Pro", price_monthly: 5000, max_products: 1000, max_reels: 100, isPro: true, isFallback: false,
      })),
      getStoreFeatures: vi.fn(async () => new Set(enabled)),
      hasFeature: vi.fn(async (_storeId: string, f: Feature) => enabled.has(f)),
      requireFeature: vi.fn(async (_storeId: string, f: Feature) => {
        if (enabled.has(f)) return null;
        const { NextResponse } = await import("next/server");
        return NextResponse.json({ error: "plan", code: "plan_required", feature: f }, { status: 403 });
      }),
      requirePro: vi.fn(async () => null),
      planRequiredResponse: vi.fn(),
    };
  },
};

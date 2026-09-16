import { describe, it, expect, vi, beforeEach } from "vitest";

// /api/ai/status used to be a pure key-presence check, with no idea whether
// the calling merchant's plan actually allows the Pro-gated AI features
// (product-description, suggest-category both call requirePro()). A Free
// merchant would see a live-looking "AI-assist" button that always 403'd —
// see ProductForm.tsx for the matching fix on the error-message side. These
// tests guard the isPro field this route now returns.

vi.mock("@/lib/auth", () => ({
  verifySession: vi.fn(),
  getUserStore: vi.fn(),
}));
vi.mock("@/lib/plan", () => ({
  getEffectivePlan: vi.fn(),
}));
vi.mock("@/lib/ai", () => ({
  isAiEnabled: vi.fn(),
}));

import { verifySession, getUserStore } from "@/lib/auth";
import { getEffectivePlan } from "@/lib/plan";
import { isAiEnabled } from "@/lib/ai";

const mockedVerifySession = vi.mocked(verifySession);
const mockedGetUserStore = vi.mocked(getUserStore);
const mockedGetEffectivePlan = vi.mocked(getEffectivePlan);
const mockedIsAiEnabled = vi.mocked(isAiEnabled);

beforeEach(() => {
  vi.clearAllMocks();
  mockedIsAiEnabled.mockReturnValue({ groq: true, gemini: true });
});

describe("GET /api/ai/status", () => {
  it("returns 401 when not signed in", async () => {
    const { GET } = await import("@/app/api/ai/status/route");
    mockedVerifySession.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("isPro is false during onboarding, before a store exists", async () => {
    const { GET } = await import("@/app/api/ai/status/route");
    mockedVerifySession.mockResolvedValue({ firebaseUid: "uid-1" } as never);
    mockedGetUserStore.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(body).toEqual({ groq: true, gemini: true, isPro: false });
    expect(mockedGetEffectivePlan).not.toHaveBeenCalled();
  });

  it("isPro is false for a store on the Free plan", async () => {
    const { GET } = await import("@/app/api/ai/status/route");
    mockedVerifySession.mockResolvedValue({ firebaseUid: "uid-1" } as never);
    mockedGetUserStore.mockResolvedValue({ id: "store-1" } as never);
    mockedGetEffectivePlan.mockResolvedValue({ isPro: false } as never);

    const res = await GET();
    const body = await res.json();

    expect(body.isPro).toBe(false);
  });

  it("isPro is true for a store on a Pro-tier plan", async () => {
    const { GET } = await import("@/app/api/ai/status/route");
    mockedVerifySession.mockResolvedValue({ firebaseUid: "uid-1" } as never);
    mockedGetUserStore.mockResolvedValue({ id: "store-1" } as never);
    mockedGetEffectivePlan.mockResolvedValue({ isPro: true } as never);

    const res = await GET();
    const body = await res.json();

    expect(body.isPro).toBe(true);
  });

  it("still reports groq/gemini key presence independent of plan", async () => {
    const { GET } = await import("@/app/api/ai/status/route");
    mockedIsAiEnabled.mockReturnValue({ groq: true, gemini: false });
    mockedVerifySession.mockResolvedValue({ firebaseUid: "uid-1" } as never);
    mockedGetUserStore.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(body.groq).toBe(true);
    expect(body.gemini).toBe(false);
  });
});

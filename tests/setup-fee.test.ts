import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ verifySession: vi.fn() }));
vi.mock("@/lib/db", () => ({ queryOne: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ getPlatformSettings: vi.fn() }));
vi.mock("@/lib/payments", () => ({
  startPayment: vi.fn(),
  // same keys as lib/payments (the webhook maps "setup_fee:<store>" back to the setup-fee branch)
  targets: { setupFee: (id: string) => `setup_fee:${id}` },
  subscriptionTypeOf: (t: string) => (t.startsWith("plan:") ? "plan" : t.startsWith("setup_fee:") ? "setup_fee" : "monthly"),
}));

import { POST } from "@/app/api/billing/setup-fee/route";
import { verifySession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { getPlatformSettings } from "@/lib/admin-auth";
import { startPayment, subscriptionTypeOf } from "@/lib/payments";

// The setup fee is off today, but an admin can switch it on — and the
// dashboard then sends unpaid stores to Billing. Paying it must work.

const call = () => POST(new NextRequest("http://x.test/api/billing/setup-fee", { method: "POST" }));
const store = (status: string | null = "none") => ({ id: "store-1", name: "Amaka", subscription_status: status });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifySession).mockResolvedValue({ firebaseUid: "u1", email: "amaka@example.com" } as never);
  vi.mocked(getPlatformSettings).mockResolvedValue({ require_setup_fee: true, setup_fee_amount: 10000 } as never);
  vi.mocked(startPayment).mockResolvedValue({ ok: true, authorizationUrl: "https://checkout.paystack.com/x", reference: "SETUP-1", reused: false });
});

describe("POST /api/billing/setup-fee", () => {
  it("opens a Paystack checkout for the configured fee, tied to this store", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(store()).mockResolvedValueOnce(null);
    const res = await call();
    expect(await res.json()).toEqual({ authorization_url: "https://checkout.paystack.com/x", reference: "SETUP-1" });
    const opts = vi.mocked(startPayment).mock.calls[0][0];
    expect(opts).toMatchObject({ kind: "subscription", storeId: "store-1", amount: 10000, email: "amaka@example.com", targetId: "setup_fee:store-1" });
    // the webhook settles it through the setup-fee branch
    expect(subscriptionTypeOf(opts.targetId)).toBe("setup_fee");
  });

  it("records the pending setup-fee payment when the checkout is created", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(store()).mockResolvedValueOnce(null);
    await call();
    const client = { query: vi.fn() };
    await vi.mocked(startPayment).mock.calls[0][0].onCreated!(client as never, "SETUP-1");
    expect(client.query.mock.calls[0][0]).toMatch(/INSERT INTO subscription_payments/);
    expect(client.query.mock.calls[0][1]).toEqual(["store-1", 10000, "SETUP-1"]);
  });

  it("doesn't charge when the fee is off, already paid, or a bank transfer is waiting", async () => {
    vi.mocked(getPlatformSettings).mockResolvedValueOnce({ require_setup_fee: false, setup_fee_amount: 10000 } as never);
    vi.mocked(queryOne).mockResolvedValueOnce(store());
    expect((await call()).status).toBe(400);

    vi.mocked(queryOne).mockResolvedValueOnce(store("setup_fee_paid"));
    expect(await (await call()).json()).toEqual({ alreadyPaid: true });

    vi.mocked(queryOne).mockResolvedValueOnce(store("setup_fee_pending")).mockResolvedValueOnce({ "?column?": 1 });
    expect((await call()).status).toBe(409);

    expect(startPayment).not.toHaveBeenCalled();
  });

  it("needs a signed-in store owner", async () => {
    vi.mocked(verifySession).mockResolvedValueOnce(null as never);
    expect((await call()).status).toBe(401);
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    expect((await call()).status).toBe(404);
  });
});

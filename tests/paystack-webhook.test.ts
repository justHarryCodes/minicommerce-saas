import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import crypto from "crypto";
import { NextRequest } from "next/server";

const SECRET = "test_paystack_secret";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));
vi.mock("@/lib/billing-fulfillment", () => ({
  fulfillSubscriptionPayment: vi.fn(),
}));
// These tests cover checkouts opened before payment attempts existed (the
// legacy path); the new path has its own tests in payments.test.ts.
vi.mock("@/lib/payments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/payments")>()),
  settlePayment: vi.fn().mockResolvedValue({ state: "unknown_reference" }),
}));

import { query, queryOne } from "@/lib/db";
import { fulfillSubscriptionPayment } from "@/lib/billing-fulfillment";

const mockedQuery = vi.mocked(query);
const mockedQueryOne = vi.mocked(queryOne);
const mockedFulfill = vi.mocked(fulfillSubscriptionPayment);

// The route reads PAYSTACK_SECRET_KEY into a module-level const at import
// time, so the env var must be set *before* the module is first imported.
// Dynamic import (after setting env) guarantees that ordering regardless of
// vitest's static-import hoisting.
process.env.PAYSTACK_SECRET_KEY = SECRET;
let POST: typeof import("@/app/api/paystack/webhook/route").POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/paystack/webhook/route"));
});

beforeEach(() => {
  vi.clearAllMocks();
  mockedQuery.mockResolvedValue([]);
});

function sign(body: string, secret = SECRET) {
  return crypto.createHmac("sha512", secret).update(body).digest("hex");
}

function makeRequest(body: string, signature?: string) {
  const headers: Record<string, string> = {};
  if (signature !== undefined) headers["x-paystack-signature"] = signature;
  return new NextRequest("http://localhost/api/paystack/webhook", {
    method: "POST",
    body,
    headers,
  });
}

describe("POST /api/paystack/webhook", () => {
  it("rejects a request with no signature header", async () => {
    const res = await POST(makeRequest(JSON.stringify({ event: "charge.success", data: {} })));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/missing signature/i);
  });

  it("rejects a request with an invalid signature", async () => {
    const body = JSON.stringify({ event: "charge.success", data: {} });
    const res = await POST(makeRequest(body, "0".repeat(128)));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/invalid signature/i);
  });

  it("no-ops on events other than charge.success", async () => {
    const body = JSON.stringify({ event: "transfer.success", data: {} });
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(mockedQueryOne).not.toHaveBeenCalled();
  });

  it("marks a pending order paid exactly once (idempotent)", async () => {
    mockedQueryOne.mockResolvedValueOnce({
      id: "order1",
      payment_reference: "ref_order_1",
      payment_status: "pending",
      payment_method: "paystack", total: 5000, total_amount: 5000, deposit_amount: 0,
    });
    const body = JSON.stringify({
      event: "charge.success",
      data: { status: "success", amount: 500000, currency: "NGN", reference: "ref_order_1", metadata: { orderId: "order1" } },
    });
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    // Pay-on-delivery orders become 'deposit_paid', everything else 'paid' —
    // one guarded UPDATE either way.
    const paidCalls = mockedQuery.mock.calls.filter(([sql]) =>
      (sql as string).includes("SET payment_status = CASE WHEN payment_method = 'pay_on_delivery' THEN 'deposit_paid' ELSE 'paid' END")
    );
    expect(paidCalls).toHaveLength(1);
    expect(paidCalls[0][0]).toContain("AND payment_status = 'pending'");
  });

  it("does not re-mark an order already paid", async () => {
    mockedQueryOne.mockResolvedValueOnce({
      id: "order1",
      payment_reference: "ref_order_1",
      payment_status: "paid",
      payment_method: "paystack", total: 5000, total_amount: 5000, deposit_amount: 0,
    });
    const body = JSON.stringify({
      event: "charge.success",
      data: { status: "success", amount: 500000, currency: "NGN", reference: "ref_order_1", metadata: { orderId: "order1" } },
    });
    await POST(makeRequest(body, sign(body)));
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  it("never marks an order paid when the amount doesn't match", async () => {
    mockedQueryOne.mockResolvedValueOnce({
      id: "order1",
      payment_reference: "ref_order_1",
      payment_status: "pending",
      payment_method: "paystack", total: 5000, total_amount: 5000, deposit_amount: 0,
    });
    const body = JSON.stringify({
      event: "charge.success",
      data: { status: "success", amount: 100, currency: "NGN", reference: "ref_order_1", metadata: { orderId: "order1" } },
    });
    await POST(makeRequest(body, sign(body)));
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  it("fulfills a pending subscription payment for a valid type", async () => {
    mockedQueryOne.mockResolvedValueOnce({ type: "setup_fee", payment_status: "pending", amount: 10000 });
    const body = JSON.stringify({
      event: "charge.success",
      data: { status: "success", amount: 1000000, currency: "NGN", reference: "ref_sub_1", metadata: {} },
    });
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(mockedFulfill).toHaveBeenCalledWith("ref_sub_1", "setup_fee");
  });

  it("does not re-fulfill an already-paid subscription payment", async () => {
    mockedQueryOne.mockResolvedValueOnce({ type: "setup_fee", payment_status: "paid", amount: 10000 });
    const body = JSON.stringify({
      event: "charge.success",
      data: { status: "success", amount: 1000000, currency: "NGN", reference: "ref_sub_1", metadata: {} },
    });
    await POST(makeRequest(body, sign(body)));
    expect(mockedFulfill).not.toHaveBeenCalled();
  });

  it("returns a generic 500 without leaking details on malformed payloads", async () => {
    const body = "{not valid json";
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Webhook error");
  });
});

describe("POST /api/paystack/webhook — misconfiguration", () => {
  it("hard-fails with 500 if PAYSTACK_SECRET_KEY is unset, rather than falling back to an empty secret", async () => {
    vi.resetModules();
    const original = process.env.PAYSTACK_SECRET_KEY;
    delete process.env.PAYSTACK_SECRET_KEY;
    try {
      const { POST: POSTUnconfigured } = await import("@/app/api/paystack/webhook/route");
      const res = await POSTUnconfigured(makeRequest("{}", "irrelevant"));
      expect(res.status).toBe(500);
      expect((await res.json()).error).toMatch(/misconfiguration/i);
    } finally {
      process.env.PAYSTACK_SECRET_KEY = original;
      vi.resetModules();
    }
  });
});

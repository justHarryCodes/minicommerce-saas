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
    });
    const body = JSON.stringify({
      event: "charge.success",
      data: { reference: "ref_order_1", metadata: { orderId: "order1" } },
    });
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    const paidCalls = mockedQuery.mock.calls.filter(([sql]) =>
      (sql as string).includes("payment_status = 'paid'")
    );
    expect(paidCalls).toHaveLength(1);
  });

  it("does not re-mark an order already paid", async () => {
    mockedQueryOne.mockResolvedValueOnce({
      id: "order1",
      payment_reference: "ref_order_1",
      payment_status: "paid",
    });
    const body = JSON.stringify({
      event: "charge.success",
      data: { reference: "ref_order_1", metadata: { orderId: "order1" } },
    });
    await POST(makeRequest(body, sign(body)));
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  it("fulfills a pending subscription payment for a valid type", async () => {
    mockedQueryOne.mockResolvedValueOnce({ type: "setup_fee", payment_status: "pending" });
    const body = JSON.stringify({
      event: "charge.success",
      data: { reference: "ref_sub_1", metadata: {} },
    });
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(mockedFulfill).toHaveBeenCalledWith("ref_sub_1", "setup_fee");
  });

  it("does not re-fulfill an already-paid subscription payment", async () => {
    mockedQueryOne.mockResolvedValueOnce({ type: "setup_fee", payment_status: "paid" });
    const body = JSON.stringify({
      event: "charge.success",
      data: { reference: "ref_sub_1", metadata: {} },
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

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────
// Payments: nothing is applied unless Paystack confirms the exact amount,
// nothing is applied twice, re-clicking "Pay" never opens a second charge,
// and abandoned checkouts never complete on Duka.
// An in-memory stand-in for payment_attempts / theme_purchases lets the real
// SQL-guarded logic run.
// ─────────────────────────────────────────────────────────────────────────

const db = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const attempts = new Map<string, Row>();
  const purchases = new Set<string>();
  let seq = 0;
  const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

  async function run(sql: string, p: unknown[] = []): Promise<Row[]> {
    const s = sql.replace(/\s+/g, " ");
    const byRef = () => [...attempts.values()].find((a) => a.reference === p[0]);
    if (s.startsWith("SELECT * FROM payment_attempts WHERE reference")) return byRef() ? [{ ...byRef() }] : [];
    if (s.startsWith("UPDATE payment_attempts SET paystack_status")) {
      const a = [...attempts.values()].find((x) => x.id === p[0]);
      if (a) a.paystack_status = p[1];
      return [];
    }
    if (s.startsWith("UPDATE payment_attempts SET status = 'success'")) {
      const a = [...attempts.values()].find((x) => x.id === p[0]);
      if (a && (a.status === "pending" || a.status === "failed")) {
        a.status = "success";
        a.settled_via = p[1];
        return [{ id: a.id }];
      }
      return [];
    }
    if (s.startsWith("UPDATE payment_attempts SET status = 'duplicate'")) {
      const a = [...attempts.values()].find((x) => x.id === p[0]);
      if (a) a.status = "duplicate";
      return [];
    }
    if (s.startsWith("UPDATE payment_attempts SET status = 'failed'")) {
      const a = byRef();
      if (a && a.status === "pending") a.status = "failed";
      return [];
    }
    if (s.startsWith("SELECT reference FROM payment_attempts WHERE kind = $1 AND target_id = $2 AND status = 'success'")) {
      return [...attempts.values()].filter((a) => a.kind === p[0] && a.target_id === p[1] && a.status === "success").map((a) => ({ reference: a.reference }));
    }
    if (s.startsWith("SELECT * FROM payment_attempts WHERE kind = $1 AND target_id = $2 AND status = 'pending'")) {
      const windowSecs = s.includes("make_interval(secs => 60)") ? 60 : Number(p[3]);
      return [...attempts.values()]
        .filter((a) => a.kind === p[0] && a.target_id === p[1] && a.status === "pending" && Number(a.amount) === Number(p[2]) && a.authorization_url)
        .filter((a) => Date.now() - (a.created_at as Date).getTime() < windowSecs * 1000)
        .map((a) => ({ ...a }));
    }
    if (s.startsWith("SELECT reference, created_at FROM payment_attempts WHERE status = 'pending'")) {
      return [...attempts.values()]
        .filter((a) => a.status === "pending" && Date.now() - (a.created_at as Date).getTime() > 5 * 60_000)
        .map((a) => ({ reference: a.reference, created_at: a.created_at }));
    }
    if (s.startsWith("INSERT INTO payment_attempts")) {
      const row = { id: `a${++seq}`, reference: p[0], kind: p[1], store_id: p[2], target_id: p[3], amount: p[4], currency: "NGN", email: p[5], authorization_url: p[6], status: "pending", created_at: new Date() };
      attempts.set(row.id, row);
      return [];
    }
    if (s.startsWith("INSERT INTO theme_purchases")) {
      const key = `${p[0]}:${p[1]}`;
      if (purchases.has(key)) return [];
      purchases.add(key);
      return [{ id: key }];
    }
    if (s.startsWith("SELECT pg_advisory_xact_lock")) return [];
    if (s.startsWith("INSERT INTO subscription_payments")) return [];
    throw new Error("unexpected SQL in test: " + s.slice(0, 80));
  }

  function add(row: Partial<Row> & { reference: string; kind: string; target_id: string; amount: number }) {
    const full = { id: `a${++seq}`, store_id: "store-1", currency: "NGN", email: "x@y.com", authorization_url: `https://checkout.paystack.com/${row.reference}`, status: "pending", created_at: new Date(), ...row };
    attempts.set(full.id as string, full);
    return full;
  }
  return { attempts, purchases, run, add, minutesAgo, reset: () => { attempts.clear(); purchases.clear(); } };
});

vi.mock("@/lib/db", () => ({
  query: vi.fn((sql: string, p?: unknown[]) => db.run(sql, p)),
  queryOne: vi.fn(async (sql: string, p?: unknown[]) => (await db.run(sql, p))[0] ?? null),
  withTransaction: vi.fn(async (fn: (c: unknown) => unknown) => fn({ query: async (sql: string, p?: unknown[]) => ({ rows: await db.run(sql, p) }) })),
}));
vi.mock("@/lib/paystack", () => ({
  getAppUrl: () => "https://dukanigeria.com",
  initializeTransaction: vi.fn(),
  verifyTransaction: vi.fn(),
}));
vi.mock("@/lib/order-payments", () => ({ markOrderPaidOnline: vi.fn() }));
vi.mock("@/lib/billing-fulfillment", () => ({ fulfillSubscriptionPayment: vi.fn() }));
vi.mock("@/lib/theme-access", () => ({ clearOwnedThemes: vi.fn() }));

import { initializeTransaction, verifyTransaction } from "@/lib/paystack";
import { markOrderPaidOnline } from "@/lib/order-payments";
import { fulfillSubscriptionPayment } from "@/lib/billing-fulfillment";
import { chargeMatches, reconcilePendingPayments, settlePayment, startPayment, subscriptionTypeOf, targets } from "@/lib/payments";

const mockedInit = vi.mocked(initializeTransaction);
const mockedVerify = vi.mocked(verifyTransaction);
const mockedMarkPaid = vi.mocked(markOrderPaidOnline);
const mockedFulfill = vi.mocked(fulfillSubscriptionPayment);
const paid = (reference: string, amount: number) => ({ status: "success", reference, amount: amount * 100, currency: "NGN" });
const verifyAs = (data: Record<string, unknown> | null) => mockedVerify.mockResolvedValue({ status: true, message: "", data } as never);

beforeEach(() => {
  vi.clearAllMocks();
  db.reset();
  mockedMarkPaid.mockResolvedValue(true);
  mockedFulfill.mockResolvedValue({ ok: true });
  mockedInit.mockImplementation(async (o) => ({ status: true, message: "", data: { authorization_url: `https://checkout.paystack.com/${o.reference}`, access_code: "x", reference: o.reference } }) as never);
});

describe("chargeMatches", () => {
  const attempt = { reference: "R1", amount: 2500, currency: "NGN" };
  it("needs a successful charge of the exact amount, in naira, for that reference", () => {
    expect(chargeMatches(paid("R1", 2500), attempt)).toBe(true);
    expect(chargeMatches({ ...paid("R1", 2500), amount: 249_900 }, attempt)).toBe(false);
    expect(chargeMatches({ ...paid("R1", 2500), currency: "USD" }, attempt)).toBe(false);
    expect(chargeMatches({ ...paid("R1", 2500), status: "abandoned" }, attempt)).toBe(false);
    expect(chargeMatches(paid("R2", 2500), attempt)).toBe(false);
    expect(chargeMatches(null, attempt)).toBe(false);
  });
});

describe("settlePayment", () => {
  it("applies a confirmed payment exactly once, however many times it's reported", async () => {
    db.add({ reference: "ORD-1", kind: "order", target_id: "order-1", amount: 5000 });
    const first = await settlePayment("ORD-1", "webhook", paid("ORD-1", 5000));
    const again = await settlePayment("ORD-1", "webhook", paid("ORD-1", 5000));
    verifyAs(paid("ORD-1", 5000));
    const fromReturnPage = await settlePayment("ORD-1", "callback");
    expect(first.state).toBe("applied");
    expect(again.state).toBe("already_settled");
    expect(fromReturnPage.state).toBe("already_settled");
    expect(mockedMarkPaid).toHaveBeenCalledTimes(1);
  });

  it("webhook and return page racing: only one applies it", async () => {
    db.add({ reference: "ORD-2", kind: "order", target_id: "order-2", amount: 5000 });
    verifyAs(paid("ORD-2", 5000));
    const results = await Promise.all([settlePayment("ORD-2", "webhook", paid("ORD-2", 5000)), settlePayment("ORD-2", "callback")]);
    expect(results.filter((r) => r.state === "applied")).toHaveLength(1);
    expect(mockedMarkPaid).toHaveBeenCalledTimes(1);
  });

  it("an unfinished or abandoned Paystack checkout never completes on Duka", async () => {
    db.add({ reference: "ORD-3", kind: "order", target_id: "order-3", amount: 5000 });
    verifyAs({ status: "abandoned", reference: "ORD-3", amount: 500000, currency: "NGN" });
    expect((await settlePayment("ORD-3", "callback")).state).toBe("not_paid");
    verifyAs({ status: "ongoing", reference: "ORD-3", amount: 500000, currency: "NGN" });
    expect((await settlePayment("ORD-3", "callback")).state).toBe("not_paid");
    expect(mockedMarkPaid).not.toHaveBeenCalled();
  });

  it("refuses a 'successful' charge for the wrong amount", async () => {
    db.add({ reference: "ORD-4", kind: "order", target_id: "order-4", amount: 5000 });
    expect((await settlePayment("ORD-4", "webhook", paid("ORD-4", 50))).state).toBe("not_paid");
    expect(mockedMarkPaid).not.toHaveBeenCalled();
  });

  it("a second payment for something already paid is flagged for refund, not applied", async () => {
    db.add({ reference: "ORD-5a", kind: "order", target_id: "order-5", amount: 5000 });
    db.add({ reference: "ORD-5b", kind: "order", target_id: "order-5", amount: 5000 });
    await settlePayment("ORD-5a", "webhook", paid("ORD-5a", 5000));
    mockedMarkPaid.mockResolvedValueOnce(false); // order no longer pending
    const second = await settlePayment("ORD-5b", "webhook", paid("ORD-5b", 5000));
    expect(second.state).toBe("duplicate");
    expect([...db.attempts.values()].find((a) => a.reference === "ORD-5b")!.status).toBe("duplicate");
  });

  it("a checkout closed as failed still completes if Paystack later confirms it", async () => {
    db.add({ reference: "SUB-1", kind: "subscription", target_id: targets.monthly("store-1"), amount: 5000, status: "failed" });
    expect((await settlePayment("SUB-1", "webhook", paid("SUB-1", 5000))).state).toBe("applied");
    expect(mockedFulfill).toHaveBeenCalledWith("SUB-1", "monthly");
  });

  it("unlocks a bought theme once, for that store only", async () => {
    db.add({ reference: "THEME-1", kind: "theme", store_id: "store-1", target_id: targets.theme("store-1", "oud-house"), amount: 2500 });
    expect((await settlePayment("THEME-1", "webhook", paid("THEME-1", 2500))).state).toBe("applied");
    expect(db.purchases.has("store-1:oud-house")).toBe(true);
    expect(db.purchases.has("store-2:oud-house")).toBe(false);
  });

  it("ignores references it didn't create", async () => {
    expect((await settlePayment("NOT-OURS", "webhook", paid("NOT-OURS", 100))).state).toBe("unknown_reference");
  });
});

describe("startPayment", () => {
  const base = { kind: "order" as const, storeId: "store-1", targetId: "order-9", amount: 5000, email: "a@b.com", referencePrefix: "ORD-9" };

  it("clicking Pay again reopens the same checkout instead of a second charge", async () => {
    verifyAs({ status: "ongoing" });
    const first = await startPayment(base);
    const second = await startPayment(base);
    expect(first.ok && "authorizationUrl" in first).toBe(true);
    expect(second).toMatchObject({ ok: true, reused: true });
    expect(mockedInit).toHaveBeenCalledTimes(1);
    expect(db.attempts.size).toBe(1);
  });

  it("if that checkout was already paid, it settles it rather than charging again", async () => {
    const first = await startPayment(base);
    const ref = (first as { reference: string }).reference;
    verifyAs(paid(ref, 5000));
    const second = await startPayment(base);
    expect(second).toMatchObject({ ok: true, alreadyPaid: true });
    expect(mockedInit).toHaveBeenCalledTimes(1);
    expect(mockedMarkPaid).toHaveBeenCalledTimes(1);
  });

  it("starts fresh once the old checkout failed", async () => {
    await startPayment(base);
    verifyAs({ status: "failed" });
    const second = await startPayment(base);
    expect(second).toMatchObject({ ok: true, reused: false });
    expect(mockedInit).toHaveBeenCalledTimes(2);
  });

  it("won't start a checkout for a theme that's already been paid for", async () => {
    db.add({ reference: "THEME-2", kind: "theme", target_id: targets.theme("store-1", "wig-vault"), amount: 2500, status: "success" });
    const r = await startPayment({ ...base, kind: "theme", targetId: targets.theme("store-1", "wig-vault"), amount: 2500 });
    expect(r).toMatchObject({ ok: true, alreadyPaid: true });
    expect(mockedInit).not.toHaveBeenCalled();
  });

  it("another store buying the same theme is unaffected", async () => {
    db.add({ reference: "THEME-3", kind: "theme", target_id: targets.theme("store-1", "wig-vault"), amount: 2500, status: "success" });
    const r = await startPayment({ ...base, storeId: "store-2", kind: "theme", targetId: targets.theme("store-2", "wig-vault"), amount: 2500 });
    expect(r).toMatchObject({ ok: true, reused: false });
  });

  it("targets and types are per store", () => {
    expect(targets.plan("s1", "p1")).toBe("plan:p1:s1");
    expect(subscriptionTypeOf(targets.plan("s1", "p1"))).toBe("plan");
    expect(subscriptionTypeOf(targets.monthly("s1"))).toBe("monthly");
    expect(subscriptionTypeOf(targets.setupFee("s1"))).toBe("setup_fee");
  });
});

describe("reconcilePendingPayments (missed webhooks)", () => {
  it("settles paid checkouts, closes long-abandoned ones, never closes on a network error", async () => {
    db.add({ reference: "PAID", kind: "order", target_id: "o1", amount: 1000, created_at: db.minutesAgo(30) });
    db.add({ reference: "ABANDONED", kind: "order", target_id: "o2", amount: 1000, created_at: db.minutesAgo(180) });
    db.add({ reference: "UNREACHABLE", kind: "order", target_id: "o3", amount: 1000, created_at: db.minutesAgo(180) });
    db.add({ reference: "RECENT", kind: "order", target_id: "o4", amount: 1000, created_at: db.minutesAgo(1) });
    mockedVerify.mockImplementation(async (ref: string) => {
      if (ref === "PAID") return { status: true, message: "", data: paid("PAID", 1000) } as never;
      if (ref === "ABANDONED") return { status: true, message: "", data: { status: "abandoned", reference: ref } } as never;
      throw new Error("network");
    });
    const r = await reconcilePendingPayments();
    expect(r).toEqual({ checked: 3, settled: 1, closed: 1 });
    const status = (ref: string) => [...db.attempts.values()].find((a) => a.reference === ref)!.status;
    expect(status("PAID")).toBe("success");
    expect(status("ABANDONED")).toBe("failed");
    expect(status("UNREACHABLE")).toBe("pending");
    expect(status("RECENT")).toBe("pending");
  });
});

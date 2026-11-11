import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/redis", () => ({ getOrSet: vi.fn(async (_k: string, fn: () => unknown) => fn()) }));

import { checkoutMethods, paymentSwitches, dukaPayActive, feesFromCharge, listBanks, platformFeeKobo, platformFeePercent, resolveAccount, splitFor, upsertSubaccount } from "@/lib/duka-pay";

// Duka Pay: fee maths, which stores can take online payments, and the
// Paystack calls behind connecting a payout account.

describe("platform fee", () => {
  it("is 1% of the charge, in kobo", () => {
    expect(platformFeeKobo(1_000_000)).toBe(10_000); // ₦10,000 → ₦100
    expect(platformFeeKobo(250_050)).toBe(2_501); // rounds
    expect(platformFeeKobo(100)).toBe(1);
    expect(platformFeeKobo(0)).toBe(0);
  });

  it("never takes the whole amount, and honours DUKA_PAY_FEE_PERCENT within bounds", () => {
    expect(platformFeeKobo(1, 100)).toBe(0);
    vi.stubEnv("DUKA_PAY_FEE_PERCENT", "1.5");
    expect(platformFeePercent()).toBe(1.5);
    vi.stubEnv("DUKA_PAY_FEE_PERCENT", "80");
    expect(platformFeePercent()).toBe(1); // out of range → default
    vi.unstubAllEnvs();
  });

  it("split puts Paystack's fee on the store's share", () => {
    expect(splitFor("ACCT_x", 500_000)).toEqual({ subaccount: "ACCT_x", bearer: "subaccount", transaction_charge: 5_000 });
  });

  it("reads Paystack's fees_split in naira", () => {
    expect(feesFromCharge({ fees_split: { paystack: 16_000, integration: 10_000, subaccount: 974_000 } })).toEqual({ paystackFee: 160, platformShare: 100, storeShare: 9_740 });
    expect(feesFromCharge({ fees: 2_500 })).toEqual({ paystackFee: 25, platformShare: null, storeShare: null });
  });
});

describe("which payment options a checkout offers", () => {
  const connected = { duka_pay_status: "active", paystack_subaccount_code: "ACCT_1", bank_account_number: "0123456789" };

  it("Duka Pay comes first (the default) once a payout account is connected", () => {
    expect(checkoutMethods({ ...connected, payment_preference: "both" }, true)).toEqual(["paystack", "transfer", "pay_on_delivery"]);
    expect(checkoutMethods({ ...connected, payment_preference: "paystack" }, false)).toEqual(["paystack"]);
  });

  it("no payout account → no online payments, and an online-only store falls back to transfer", () => {
    const off = { ...connected, duka_pay_status: "not_connected" };
    expect(dukaPayActive(off)).toBe(false);
    expect(checkoutMethods({ ...off, payment_preference: "paystack" }, false)).toEqual(["transfer"]);
    expect(checkoutMethods({ ...off, payment_preference: "paystack", bank_account_number: null }, true)).toEqual(["pay_on_delivery"]);
  });

  it("paused or half-set-up accounts don't count as connected", () => {
    expect(dukaPayActive({ duka_pay_status: "disabled", paystack_subaccount_code: "ACCT_1" })).toBe(false);
    expect(dukaPayActive({ duka_pay_status: "active", paystack_subaccount_code: null })).toBe(false);
  });
});

describe("checkout switches (Duka Pay · Bank transfer · Pay on delivery)", () => {
  const connected = { duka_pay_status: "active", paystack_subaccount_code: "ACCT_1", bank_account_number: "0123456789" };

  it("each switch controls its own method, in Duka Pay-first order", () => {
    expect(checkoutMethods({ ...connected, duka_pay_enabled: true, bank_transfer_enabled: true }, true)).toEqual(["paystack", "transfer", "pay_on_delivery"]);
    expect(checkoutMethods({ ...connected, duka_pay_enabled: false, bank_transfer_enabled: true }, false)).toEqual(["transfer"]);
    expect(checkoutMethods({ ...connected, duka_pay_enabled: false, bank_transfer_enabled: false }, true)).toEqual(["pay_on_delivery"]);
  });

  it("the switches win over the old single choice; without them the old choice still works", () => {
    expect(paymentSwitches({ duka_pay_enabled: false, bank_transfer_enabled: true, payment_preference: "paystack" })).toEqual({ dukaPay: false, bankTransfer: true });
    expect(paymentSwitches({ duka_pay_enabled: null, bank_transfer_enabled: undefined, payment_preference: "both" })).toEqual({ dukaPay: true, bankTransfer: true });
    expect(paymentSwitches({ payment_preference: "bank_transfer" })).toEqual({ dukaPay: false, bankTransfer: true });
  });

  it("Duka can retire manual transfers everywhere — including the not-yet-connected fallback", () => {
    const off = { allowTransfers: false };
    expect(checkoutMethods({ ...connected, duka_pay_enabled: true, bank_transfer_enabled: true }, true, off)).toEqual(["paystack", "pay_on_delivery"]);
    const notConnected = { ...connected, duka_pay_status: "not_connected", duka_pay_enabled: true, bank_transfer_enabled: false };
    expect(checkoutMethods(notConnected, false)).toEqual(["transfer"]); // fallback while allowed
    expect(checkoutMethods(notConnected, false, off)).toEqual([]);
  });
});

describe("Paystack calls", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_x");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  const reply = (status: number, body: unknown) => fetchMock.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body });

  it("lists active banks once each, sorted", async () => {
    reply(200, { status: true, data: [{ name: "Zenith", code: "057" }, { name: "Access", code: "044" }, { name: "Access", code: "044" }, { name: "Old", code: "1", is_deleted: true }] });
    expect(await listBanks()).toEqual([{ name: "Access", code: "044" }, { name: "Zenith", code: "057" }]);
  });

  it("looks up the account name, and rejects bad input without calling Paystack", async () => {
    expect(await resolveAccount("123", "044")).toMatchObject({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
    reply(200, { status: true, data: { account_name: "AMAKA STORES" } });
    expect(await resolveAccount("0123456789", "044")).toEqual({ ok: true, accountName: "AMAKA STORES" });
    reply(422, { status: false, message: "Could not resolve account name" });
    expect(await resolveAccount("0123456789", "044")).toMatchObject({ ok: false });
  });

  it("creates a subaccount with Duka's 1% as percentage_charge, or updates the existing one", async () => {
    reply(200, { status: true, data: { subaccount_code: "ACCT_new" } });
    const created = await upsertSubaccount({ businessName: "Amaka", bankCode: "044", accountNumber: "0123456789", storeId: "s1" });
    expect(created).toEqual({ ok: true, code: "ACCT_new" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.paystack.co/subaccount");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toMatchObject({ settlement_bank: "044", account_number: "0123456789", percentage_charge: 1, metadata: { store_id: "s1" } });

    reply(200, { status: true, data: { subaccount_code: "ACCT_new" } });
    await upsertSubaccount({ existingCode: "ACCT_new", businessName: "Amaka", bankCode: "058", accountNumber: "9876543210", storeId: "s1" });
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.paystack.co/subaccount/ACCT_new");
    expect(fetchMock.mock.calls[1][1].method).toBe("PUT");
  });
});

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/auth";
import { getStoreFor } from "@/lib/access";
import { query, queryOne } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { invalidateStore } from "@/lib/store-cache";
import { listBanks, platformFeePercent, resolveAccount, upsertSubaccount } from "@/lib/duka-pay";

// Duka Pay payout account (owner only): where Paystack settles this store's
// online sales. Connecting creates/updates the store's Paystack subaccount.

type PayoutRow = {
  id: string;
  slug: string;
  name: string;
  email: string | null;
  phone: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  settlement_bank_code: string | null;
  paystack_subaccount_code: string | null;
  duka_pay_status: string | null;
  duka_pay_connected_at: string | null;
};

const mask = (n: string | null) => (n ? `••••••${n.slice(-4)}` : null);

async function payoutRow(storeId: string) {
  return queryOne<PayoutRow>(
    `SELECT id, slug, name, email, phone, bank_name, bank_account_number, bank_account_name, settlement_bank_code,
            paystack_subaccount_code, duka_pay_status, duka_pay_connected_at
     FROM stores WHERE id = $1`,
    [storeId]
  );
}

function view(s: PayoutRow) {
  return {
    status: s.duka_pay_status === "active" && s.paystack_subaccount_code ? "active" : s.duka_pay_status === "disabled" ? "disabled" : "not_connected",
    bankCode: s.settlement_bank_code,
    bankName: s.bank_name,
    accountNumber: mask(s.bank_account_number),
    accountName: s.bank_account_name,
    connectedAt: s.duka_pay_connected_at,
    feePercent: platformFeePercent(),
  };
}

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "owner");
  if (!store) return NextResponse.json({ error: "Only the store owner can manage payouts" }, { status: 403 });

  const [row, banks] = await Promise.all([payoutRow(store.id), listBanks()]);
  if (!row) return NextResponse.json({ error: "No store" }, { status: 404 });
  return NextResponse.json({ data: view(row), banks });
}

const ConnectSchema = z.object({
  bankCode: z.string().trim().min(2).max(20),
  accountNumber: z.string().trim().regex(/^\d{10}$/, "Account number must be 10 digits"),
  /** false: look up the account name only · true: connect it */
  confirm: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, { key: "rl:duka-pay", max: 12, window: 600 });
  if (limited) return limited;
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "owner");
  if (!store) return NextResponse.json({ error: "Only the store owner can manage payouts" }, { status: 403 });

  const parsed = ConnectSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details" }, { status: 422 });
  const { bankCode, accountNumber, confirm } = parsed.data;

  const bank = (await listBanks()).find((b) => b.code === bankCode);
  if (!bank) return NextResponse.json({ error: "Choose your bank from the list" }, { status: 422 });

  // Always ask the bank whose account this is — never trust a typed name
  const resolved = await resolveAccount(accountNumber, bankCode);
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 422 });
  if (!confirm) return NextResponse.json({ accountName: resolved.accountName, bankName: bank.name });

  const row = await payoutRow(store.id);
  if (!row) return NextResponse.json({ error: "No store" }, { status: 404 });

  const sub = await upsertSubaccount({
    existingCode: row.paystack_subaccount_code,
    businessName: row.name,
    bankCode,
    accountNumber,
    email: row.email,
    phone: row.phone,
    storeId: row.id,
  });
  if (!sub.ok) return NextResponse.json({ error: sub.error }, { status: 502 });

  // The same verified account is shown to shoppers paying by manual transfer
  await query(
    `UPDATE stores SET settlement_bank_code = $2, bank_name = $3, bank_account_number = $4, bank_account_name = $5,
            paystack_subaccount_code = $6, duka_pay_status = 'active', duka_pay_connected_at = NOW()
     WHERE id = $1`,
    [row.id, bankCode, bank.name, accountNumber, resolved.accountName, sub.code]
  );
  await invalidateStore(row.id, row.slug);

  const fresh = await payoutRow(row.id);
  return NextResponse.json({ data: fresh ? view(fresh) : null });
}

/** Pause online payments (the subaccount is kept, so reconnecting is instant). */
export async function DELETE() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "owner");
  if (!store) return NextResponse.json({ error: "Only the store owner can manage payouts" }, { status: 403 });

  await query(`UPDATE stores SET duka_pay_status = 'disabled' WHERE id = $1`, [store.id]);
  await invalidateStore(store.id, store.slug);
  const row = await payoutRow(store.id);
  return NextResponse.json({ data: row ? view(row) : null });
}

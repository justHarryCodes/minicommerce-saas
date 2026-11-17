import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getStoreFor } from "@/lib/access";
import { queryOne } from "@/lib/db";
import { platformFeePercent } from "@/lib/duka-pay";
import { parseRange, storeEarnings } from "@/lib/duka-pay-earnings";

export const dynamic = "force-dynamic";

// Vendor app: Duka Pay earnings (same as Dashboard -> Earnings). Owner only.
//   ?range=7d | 30d | 90d | all
export async function GET(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "owner");
  if (!store) return NextResponse.json({ error: "Only the store owner can see earnings" }, { status: 403 });

  const range = parseRange(req.nextUrl.searchParams.get("range"));
  const [{ totals, rows }, payout] = await Promise.all([
    storeEarnings(store.id, range),
    queryOne<{ duka_pay_status: string | null; bank_name: string | null; bank_account_number: string | null; bank_account_name: string | null }>(
      "SELECT duka_pay_status, bank_name, bank_account_number, bank_account_name FROM stores WHERE id = $1",
      [store.id]
    ),
  ]);

  return NextResponse.json({
    range,
    feePercent: platformFeePercent(),
    totals,
    payments: rows,
    payout: {
      connected: payout?.duka_pay_status === "active",
      bankName: payout?.bank_name ?? null,
      accountName: payout?.bank_account_name ?? null,
      // last 4 digits only
      accountLast4: payout?.bank_account_number ? payout.bank_account_number.slice(-4) : null,
    },
  });
}

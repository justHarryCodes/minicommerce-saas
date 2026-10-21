import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/plan";
import { z } from "zod";
import { verifySession } from "@/lib/auth";
import { getStoreFor } from "@/lib/access";
import { query, queryOne, withTransaction } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Balance history for one card. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "giftcards");
  if (!store) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const denied = await requireFeature(store.id, "gift_cards");
  if (denied) return denied;
  const { id } = await params;
  const card = await queryOne("SELECT id FROM gift_cards WHERE id = $1 AND store_id = $2", [id, store.id]);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ledger = await query(
    `SELECT l.id, l.change, l.balance_after, l.reason, l.created_at, o.order_number
     FROM gift_card_ledger l LEFT JOIN orders o ON o.id = l.order_id
     WHERE l.gift_card_id = $1 ORDER BY l.created_at DESC LIMIT 100`,
    [id]
  );
  return NextResponse.json({ ledger });
}

const PatchSchema = z.union([
  z.object({ isActive: z.boolean() }),
  // Set a new balance, e.g. after a manual in-store redemption
  z.object({ balance: z.number().int().min(0).max(10_000_000) }),
]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "giftcards");
  if (!store) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const denied = await requireFeature(store.id, "gift_cards");
  if (denied) return denied;
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });

  if ("isActive" in parsed.data) {
    const row = await queryOne(
      "UPDATE gift_cards SET is_active = $3 WHERE id = $1 AND store_id = $2 RETURNING id",
      [id, store.id, parsed.data.isActive]
    );
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const balance = parsed.data.balance;
  const ok = await withTransaction(async (client) => {
    const cur = await client.query<{ balance: string }>(
      "SELECT balance FROM gift_cards WHERE id = $1 AND store_id = $2 FOR UPDATE",
      [id, store.id]
    );
    if (!cur.rows.length) return false;
    const change = balance - Number(cur.rows[0].balance);
    if (change === 0) return true;
    await client.query("UPDATE gift_cards SET balance = $2 WHERE id = $1", [id, balance]);
    await client.query(
      `INSERT INTO gift_card_ledger (gift_card_id, change, balance_after, reason) VALUES ($1, $2, $3, 'adjusted')`,
      [id, change, balance]
    );
    return true;
  });
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifyAdminSession } from "@/lib/admin-auth";
import { query, queryOne } from "@/lib/db";
import { ensureGrantTables } from "@/lib/grants";

export const dynamic = "force-dynamic";

// Change a round: open/close it, the amount, the countdown, the product minimum.
const Body = z.object({
  title: z.string().trim().min(2).max(80).optional(),
  amount: z.number().min(1000).max(100_000_000).optional(),
  minProducts: z.number().int().min(1).max(10_000).optional(),
  closesAt: z.string().datetime().nullable().optional(),
  isOpen: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: parsed.success ? "Unknown round" : parsed.error.issues[0]?.message }, { status: 422 });
  await ensureGrantTables();
  const d = parsed.data;
  if (d.isOpen) await query("UPDATE grant_rounds SET is_open = false, updated_at = NOW() WHERE is_open AND id <> $1", [id]);
  const row = await queryOne(
    `UPDATE grant_rounds SET
       title = COALESCE($2, title),
       amount = COALESCE($3, amount),
       min_products = COALESCE($4, min_products),
       closes_at = CASE WHEN $5::boolean THEN $6::timestamptz ELSE closes_at END,
       is_open = COALESCE($7, is_open),
       updated_at = NOW()
     WHERE id = $1 RETURNING id`,
    [id, d.title ?? null, d.amount ?? null, d.minProducts ?? null, d.closesAt !== undefined, d.closesAt ?? null, d.isOpen ?? null],
  );
  if (!row) return NextResponse.json({ error: "Round not found" }, { status: 404 });
  revalidatePath("/grant");
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifyAdminSession } from "@/lib/admin-auth";
import { query, queryOne } from "@/lib/db";
import { ensureGrantTables } from "@/lib/grants";

export const dynamic = "force-dynamic";

// Start a new funding round (it becomes the one shown on /grant).
const Body = z.object({
  title: z.string().trim().min(2).max(80),
  amount: z.number().min(1000).max(100_000_000),
  minProducts: z.number().int().min(1).max(10_000),
  closesAt: z.string().datetime().nullable().optional(),
  isOpen: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the round details" }, { status: 422 });
  await ensureGrantTables();
  const d = parsed.data;
  // Only one round takes applications at a time
  if (d.isOpen) await query("UPDATE grant_rounds SET is_open = false, updated_at = NOW() WHERE is_open");
  const row = await queryOne<{ id: string }>(
    `INSERT INTO grant_rounds (title, amount, min_products, closes_at, is_open) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [d.title, d.amount, d.minProducts, d.closesAt ?? null, d.isOpen],
  );
  revalidatePath("/grant");
  revalidatePath("/");
  return NextResponse.json({ id: row!.id }, { status: 201 });
}

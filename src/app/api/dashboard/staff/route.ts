import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/plan";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { query } from "@/lib/db";

const StaffSchema = z.object({
  name: z.string().trim().min(1).max(60),
  role: z.string().trim().max(60).optional().nullable(),
  // services they offer — empty = all
  productIds: z.array(z.string().uuid()).max(200).optional().default([]),
});

async function ctx() {
  const user = await verifySession();
  if (!user) return null;
  return getUserStore(user.firebaseUid);
}

export async function GET() {
  const store = await ctx();
  if (!store) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await query(
    "SELECT id, name, role, product_ids, is_active FROM staff_members WHERE store_id = $1 AND is_active = true ORDER BY sort_order, created_at",
    [store.id]
  );
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const store = await ctx();
  if (!store) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requireFeature(store.id, "bookings");
  if (denied) return denied;
  const parsed = StaffSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter a name" }, { status: 422 });
  const count = await query<{ n: number }>("SELECT COUNT(*)::int AS n FROM staff_members WHERE store_id = $1 AND is_active = true", [store.id]);
  if ((count[0]?.n ?? 0) >= 50) return NextResponse.json({ error: "You can have up to 50 team members" }, { status: 400 });
  // Only keep services that belong to this store
  const ids = parsed.data.productIds.length
    ? (await query<{ id: string }>("SELECT id FROM products WHERE store_id = $1 AND id = ANY($2::uuid[])", [store.id, parsed.data.productIds])).map((r) => r.id)
    : [];
  const rows = await query(
    `INSERT INTO staff_members (store_id, name, role, product_ids, sort_order)
     VALUES ($1, $2, $3, $4::uuid[], $5) RETURNING id, name, role, product_ids, is_active`,
    [store.id, parsed.data.name, parsed.data.role || null, ids, count[0]?.n ?? 0]
  );
  return NextResponse.json({ data: rows[0] }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { query } from "@/lib/db";

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  role: z.string().trim().max(60).nullable().optional(),
  productIds: z.array(z.string().uuid()).max(200).optional(),
});

async function ctx(params: Promise<{ id: string }>) {
  const user = await verifySession();
  if (!user) return null;
  const store = await getUserStore(user.firebaseUid);
  const { id } = await params;
  if (!store || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return { store, id };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const c = await ctx(params);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 422 });
  const d = parsed.data;
  const ids = d.productIds
    ? d.productIds.length
      ? (await query<{ id: string }>("SELECT id FROM products WHERE store_id = $1 AND id = ANY($2::uuid[])", [c.store.id, d.productIds])).map((r) => r.id)
      : []
    : null;
  const rows = await query(
    `UPDATE staff_members SET
       name = COALESCE($3, name),
       role = CASE WHEN $4::boolean THEN $5 ELSE role END,
       product_ids = COALESCE($6::uuid[], product_ids)
     WHERE id = $1 AND store_id = $2 AND is_active = true
     RETURNING id, name, role, product_ids, is_active`,
    [c.id, c.store.id, d.name ?? null, d.role !== undefined, d.role ?? null, ids]
  );
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: rows[0] });
}

/** Remove from the team (kept for past bookings, hidden from new ones). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const c = await ctx(params);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await query("UPDATE staff_members SET is_active = false WHERE id = $1 AND store_id = $2", [c.id, c.store.id]);
  return NextResponse.json({ ok: true });
}

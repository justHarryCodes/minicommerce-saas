import { NextRequest, NextResponse } from "next/server";
import { invalidateStore } from "@/lib/store-cache";
import { ownProductIds } from "@/lib/tenant";
import { verifySession, getUserStore } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  product_ids: z.array(z.string().uuid()).max(10),
});

export async function PUT(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "No store" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  await query(
    "UPDATE stores SET featured_product_ids = $1 WHERE id = $2",
    [await ownProductIds(store.id, parsed.data.product_ids), store.id]
  );
  await invalidateStore(store.id, store.slug);

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { verifySession, getUserStore } from "@/lib/auth";
import { query } from "@/lib/db";

/** Dismiss an abandoned checkout (hides it and stops its reminder). */
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "No store" }, { status: 404 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await query(
    "UPDATE checkout_sessions SET status = 'dismissed', updated_at = NOW() WHERE id = $1 AND store_id = $2 AND status = 'open' RETURNING id",
    [id, store.id]
  );
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { query } from "@/lib/db";

const Schema = z.object({ status: z.enum(["confirmed", "completed", "cancelled", "no_show"]) });

/** Mark an appointment completed / no-show / cancelled (cancelling frees the slot). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "No store" }, { status: 404 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 422 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await query(
    "UPDATE bookings SET status = $3 WHERE id = $1 AND store_id = $2 RETURNING id, status",
    [id, store.id, parsed.data.status]
  );
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: rows[0] });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminSession } from "@/lib/admin-auth";
import { queryOne } from "@/lib/db";
import { ensureGrantTables } from "@/lib/grants";

export const dynamic = "force-dynamic";

// Review an application: shortlist, select or reject it, with a private note.
const Body = z.object({
  status: z.enum(["submitted", "shortlisted", "selected", "rejected"]).optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  await ensureGrantTables();
  const d = parsed.data;
  // Unconfirmed applications can't be moved: the email (and store) were never verified
  const row = await queryOne(
    `UPDATE grant_applications SET
       status = COALESCE($2, status),
       admin_note = CASE WHEN $3::boolean THEN $4 ELSE admin_note END,
       updated_at = NOW()
     WHERE id = $1 AND (status <> 'unverified' OR $2::text IS NULL) RETURNING id`,
    [id, d.status ?? null, d.note !== undefined, d.note ?? null],
  );
  if (!row) return NextResponse.json({ error: "Application not found, or its email isn't confirmed yet" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

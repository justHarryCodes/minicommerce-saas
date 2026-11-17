import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAdminAction, verifyAdminSession } from "@/lib/admin-auth";
import { LEAD_STATUSES, setLeadStatus } from "@/lib/admin/leads";

export const dynamic = "force-dynamic";

// PATCH { key, status?, note? }: move a lead along the pipeline / leave a note.
const Schema = z.object({
  key: z.string().regex(/^(store|user|upgrade):[A-Za-z0-9-]{6,128}$/),
  status: z.enum(LEAD_STATUSES as [string, ...string[]]).optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  const { key, status, note } = parsed.data;
  await setLeadStatus(key, { status: status as never, note: note === undefined ? undefined : note || null }, admin.email);
  await logAdminAction({ adminUid: admin.firebaseUid, adminEmail: admin.email, action: "lead_update", targetType: "lead", targetId: key, details: { status, note } }).catch(() => {});
  return NextResponse.json({ ok: true });
}

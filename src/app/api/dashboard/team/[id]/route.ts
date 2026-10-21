import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/plan";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { inviteUrl, newInviteToken, sendInviteEmail } from "@/lib/team";

export const dynamic = "force-dynamic";

const PatchSchema = z.union([
  z.object({ role: z.enum(["manager", "staff"]) }),
  z.object({ resend: z.literal(true) }),
]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "Only the store owner can manage the team" }, { status: 403 });
  const denied = await requireFeature(store.id, "team");
  if (denied) return denied;
  const { id } = await params;

  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });

  if ("role" in parsed.data) {
    const row = await queryOne(
      "UPDATE store_members SET role = $3 WHERE id = $1 AND store_id = $2 AND status <> 'removed' RETURNING id",
      [id, store.id, parsed.data.role]
    );
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  // Resend: a fresh token (the old link stops working) and a fresh 14 days
  const token = newInviteToken();
  const row = await queryOne<{ email: string; role: "manager" | "staff" }>(
    `UPDATE store_members SET invite_token = $3, invited_at = NOW()
     WHERE id = $1 AND store_id = $2 AND status = 'invited' RETURNING email, role`,
    [id, store.id, token]
  );
  if (!row) return NextResponse.json({ error: "Only pending invitations can be resent" }, { status: 404 });
  const sent = await sendInviteEmail({ to: row.email, storeName: store.name, role: row.role, token });
  return NextResponse.json({ ok: true, inviteUrl: inviteUrl(token), emailed: sent.ok });
}

// Removing takes effect on the member's very next request — access is
// looked up from the database every time, never cached in their session.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "Only the store owner can manage the team" }, { status: 403 });
  const { id } = await params;
  const row = await queryOne(
    "UPDATE store_members SET status = 'removed', invite_token = NULL WHERE id = $1 AND store_id = $2 AND status <> 'removed' RETURNING id",
    [id, store.id]
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

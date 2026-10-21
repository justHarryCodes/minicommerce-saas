import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/plan";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { inviteUrl, listTeam, newInviteToken, normaliseEmail, sendInviteEmail } from "@/lib/team";

export const dynamic = "force-dynamic";

const MAX_MEMBERS = 20;

// Team management is owner-only (getUserStore never returns a store to a member).
export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "Only the store owner can manage the team" }, { status: 403 });
  const denied = await requireFeature(store.id, "team");
  if (denied) return denied;
  return NextResponse.json({ members: await listTeam(store.id) });
}

const InviteSchema = z.object({
  email: z.string().trim().email().max(200),
  name: z.string().trim().max(80).optional().nullable(),
  role: z.enum(["manager", "staff"]),
});

export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "Only the store owner can manage the team" }, { status: 403 });
  const denied = await requireFeature(store.id, "team");
  if (denied) return denied;

  const parsed = InviteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and role" }, { status: 422 });
  const email = normaliseEmail(parsed.data.email);
  if (user.email && normaliseEmail(user.email) === email) {
    return NextResponse.json({ error: "That's your own email — you're already the owner" }, { status: 400 });
  }

  const count = await queryOne<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM store_members WHERE store_id = $1 AND status <> 'removed'",
    [store.id]
  );
  if ((count?.n ?? 0) >= MAX_MEMBERS) {
    return NextResponse.json({ error: `A store can have up to ${MAX_MEMBERS} team members` }, { status: 400 });
  }

  const existing = await queryOne<{ id: string }>(
    "SELECT id FROM store_members WHERE store_id = $1 AND lower(email) = $2 AND status <> 'removed'",
    [store.id, email]
  );
  if (existing) return NextResponse.json({ error: "That person is already on your team or invited" }, { status: 409 });

  const token = newInviteToken();
  const member = await queryOne<{ id: string }>(
    `INSERT INTO store_members (store_id, email, name, role, invite_token)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [store.id, email, parsed.data.name || null, parsed.data.role, token]
  );

  const sent = await sendInviteEmail({ to: email, storeName: store.name, role: parsed.data.role, token });
  return NextResponse.json(
    { id: member?.id, inviteUrl: inviteUrl(token), emailed: sent.ok },
    { status: 201 }
  );
}

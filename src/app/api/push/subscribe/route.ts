import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { verifyAdminSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";

const Schema = z.object({
  subjectType: z.enum(["vendor", "admin"]),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
});

// Registers a browser's Web Push subscription for the calling vendor or
// admin. Which subject_type is expected is determined by which context the
// UI prompt was shown in (dashboard vs admin panel) — this route just
// verifies the matching session actually backs that claim, it doesn't infer
// role from the subscription itself.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { subjectType, subscription } = parsed.data;

  let subjectId: string;
  if (subjectType === "vendor") {
    const user = await verifySession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const store = await getUserStore(user.firebaseUid);
    if (!store) return NextResponse.json({ error: "No store" }, { status: 404 });
    subjectId = store.id;
  } else {
    const admin = await verifyAdminSession();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    subjectId = admin.firebaseUid;
  }

  const userAgent = req.headers.get("user-agent") ?? null;

  await query(
    `INSERT INTO web_push_subscriptions (subject_type, subject_id, endpoint, p256dh, auth, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (endpoint) DO UPDATE SET
       subject_type = EXCLUDED.subject_type,
       subject_id   = EXCLUDED.subject_id,
       p256dh       = EXCLUDED.p256dh,
       auth         = EXCLUDED.auth,
       user_agent   = EXCLUDED.user_agent,
       last_seen_at = NOW()`,
    [subjectType, subjectId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, userAgent]
  );

  return NextResponse.json({ success: true });
}

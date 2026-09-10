import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { verifyAdminSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";

const Schema = z.object({ endpoint: z.string().url() });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  // Either a vendor or an admin session is enough to unsubscribe — a
  // subscription is deleted by its own endpoint (an opaque, unguessable URL
  // scoped to one browser instance), so the meaningful check is just "is
  // this someone we recognise at all," not which specific store/admin row
  // it maps to.
  const [user, admin] = await Promise.all([verifySession(), verifyAdminSession()]);
  if (!user && !admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await query("DELETE FROM web_push_subscriptions WHERE endpoint = $1", [parsed.data.endpoint]);

  return NextResponse.json({ success: true });
}

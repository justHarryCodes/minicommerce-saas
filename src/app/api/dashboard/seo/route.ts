import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { query } from "@/lib/db";
import { invalidateStore } from "@/lib/store-cache";
import { ensureVerificationColumn, parseVerification } from "@/lib/google-verification";

export const dynamic = "force-dynamic";

// Owner-only: save (or remove) the store's Google Search Console verification code.
export async function PATCH(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "Only the store owner can change this" }, { status: 403 });

  const parsed = z.object({ code: z.string().max(400) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  const value = parseVerification(parsed.data.code);
  if (value === null) {
    return NextResponse.json({ error: "That doesn't look like a Google verification tag. Copy the whole tag from Search Console (HTML tag option)." }, { status: 422 });
  }

  await ensureVerificationColumn();
  await query("UPDATE stores SET google_site_verification = $2, updated_at = NOW() WHERE id = $1", [store.id, value || null]);
  await invalidateStore(store.id, store.slug);
  return NextResponse.json({ ok: true, code: value || null });
}

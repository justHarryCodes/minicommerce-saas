import { NextRequest, NextResponse } from "next/server";
import { verifySession, getUserStore } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  images: z.array(z.string().url()).max(5),
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
    "UPDATE stores SET banner_images = $1 WHERE id = $2",
    [parsed.data.images, store.id]
  );

  return NextResponse.json({ ok: true });
}

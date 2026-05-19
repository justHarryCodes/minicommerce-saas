import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { cacheDel, reelKey } from "@/lib/redis";
import cloudinary from "@/lib/cloudinary-server";
import type { Reel } from "@/types";

type Ctx = { params: Promise<{ reelId: string }> };

// ── GET /api/reels/[reelId] ───────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { reelId } = await params;
  const reel = await queryOne<Reel>(
    `SELECT r.*,
       COALESCE(
         json_agg(
           json_build_object('product_id', p.id,'name',p.name,'price',p.price,
             'image_url',p.image_url,'slug',p.slug,'stock_quantity',p.stock_quantity)
           ORDER BY rp.sort_order
         ) FILTER (WHERE p.id IS NOT NULL), '[]'
       ) AS products,
       s.name AS store_name, s.slug AS store_slug, s.logo_url AS store_logo
     FROM reels r
     JOIN stores s ON s.id = r.store_id
     LEFT JOIN reel_products rp ON rp.reel_id = r.id
     LEFT JOIN products p ON p.id = rp.product_id
     WHERE r.id = $1 AND r.is_active = true
     GROUP BY r.id, s.name, s.slug, s.logo_url`,
    [reelId]
  );
  if (!reel) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(reel);
}

// ── PATCH /api/reels/[reelId] — update title / description / products ─────────

const PatchSchema = z.object({
  title:       z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  isActive:    z.boolean().optional(),
  productIds:  z.array(z.string().uuid()).max(5).optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reelId } = await params;

  const reel = await queryOne<{ id: string; store_id: string }>(
    `SELECT r.id, r.store_id FROM reels r
     JOIN stores s ON s.id = r.store_id
     WHERE r.id = $1 AND s.owner_id = $2`,
    [reelId, user.firebaseUid]
  );
  if (!reel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;

  await queryOne(
    `UPDATE reels SET
       title       = COALESCE($1, title),
       description = COALESCE($2, description),
       is_active   = COALESCE($3, is_active),
       updated_at  = NOW()
     WHERE id = $4`,
    [d.title ?? null, d.description ?? null, d.isActive ?? null, reelId]
  );

  if (d.productIds !== undefined) {
    await queryOne("DELETE FROM reel_products WHERE reel_id = $1", [reelId]);
    for (let i = 0; i < d.productIds.length; i++) {
      await queryOne(
        "INSERT INTO reel_products (reel_id, product_id, sort_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
        [reelId, d.productIds[i], i]
      );
    }
  }

  await cacheDel(reelKey.storeFeed(reel.store_id));
  return NextResponse.json({ ok: true });
}

// ── DELETE /api/reels/[reelId] ────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reelId } = await params;

  const reel = await queryOne<{ id: string; store_id: string; cloudinary_public_id: string }>(
    `SELECT r.id, r.store_id, r.cloudinary_public_id FROM reels r
     JOIN stores s ON s.id = r.store_id
     WHERE r.id = $1 AND s.owner_id = $2`,
    [reelId, user.firebaseUid]
  );
  if (!reel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete from Cloudinary
  try {
    await cloudinary.uploader.destroy(reel.cloudinary_public_id, { resource_type: "video" });
  } catch (e) {
    console.error("[reels] Cloudinary delete failed:", e);
  }

  await queryOne("DELETE FROM reels WHERE id = $1", [reel.id]);
  await cacheDel(reelKey.storeFeed(reel.store_id));
  await cacheDel(reelKey.trending());

  return NextResponse.json({ ok: true });
}

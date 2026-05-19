import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { redis, reelKey, cacheDel } from "@/lib/redis";
import type { Reel } from "@/types";

const MAX_PER_PAGE = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getStore(uid: string) {
  return queryOne<{ id: string }>(
    `SELECT s.id FROM stores s WHERE s.owner_id = $1 AND s.is_active = true`,
    [uid]
  );
}

async function getGlobalLimit(): Promise<number> {
  const row = await queryOne<{ value: unknown }>(
    "SELECT value FROM platform_settings WHERE key = 'reels_monthly_limit'",
    []
  );
  return Number(row?.value ?? 20);
}

async function checkRateLimit(storeId: string): Promise<{ allowed: boolean; reason?: string }> {
  // Hourly rate limit — max 3 uploads per hour to prevent bursts
  const hourKey = reelKey.hourlyRate(storeId);
  const count = await redis.incr(hourKey);
  if (count === 1) await redis.expire(hourKey, 3600);
  if (count > 3) return { allowed: false, reason: "Too many uploads — please wait before uploading again." };

  // Monthly quota
  const monthlyCount = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM reels
     WHERE store_id = $1 AND created_at >= date_trunc('month', NOW())`,
    [storeId]
  );
  const used = Number(monthlyCount?.count ?? 0);

  const globalLimit = await getGlobalLimit();
  const limit = globalLimit;

  if (used >= limit) {
    return { allowed: false, reason: `Monthly reel limit reached (${limit}/month). Upgrade your plan or contact support.` };
  }
  return { allowed: true };
}

// ── GET /api/reels — merchant's own reels list ────────────────────────────────

export async function GET(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = await getStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const { searchParams } = req.nextUrl;
  const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
  const offset = (page - 1) * MAX_PER_PAGE;

  const reels = await query<Reel>(
    `SELECT r.*,
       COALESCE(
         json_agg(
           json_build_object(
             'product_id', p.id, 'name', p.name, 'price', p.price,
             'image_url', p.image_url, 'slug', p.slug, 'stock_quantity', p.stock_quantity
           ) ORDER BY rp.sort_order
         ) FILTER (WHERE p.id IS NOT NULL), '[]'
       ) AS products
     FROM reels r
     LEFT JOIN reel_products rp ON rp.reel_id = r.id
     LEFT JOIN products p ON p.id = rp.product_id
     WHERE r.store_id = $1
     GROUP BY r.id
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [store.id, MAX_PER_PAGE, offset]
  );

  // Monthly usage
  const usageRow = await queryOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM reels WHERE store_id = $1 AND created_at >= date_trunc('month', NOW())",
    [store.id]
  );
  const monthlyLimit = await getGlobalLimit();

  return NextResponse.json({
    reels,
    monthlyUsed:  Number(usageRow?.count ?? 0),
    monthlyLimit,
  });
}

// ── POST /api/reels — save reel after Cloudinary upload ───────────────────────

const CreateSchema = z.object({
  cloudinaryPublicId: z.string().min(1),
  videoUrl:           z.string().url(),
  thumbnailUrl:       z.string().url().optional(),
  durationSeconds:    z.number().int().positive().optional(),
  title:              z.string().max(100).optional(),
  description:        z.string().max(500).optional(),
  productIds:         z.array(z.string().uuid()).max(5).optional(),
});

export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = await getStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const rate = await checkRateLimit(store.id);
  if (!rate.allowed) return NextResponse.json({ error: rate.reason }, { status: 429 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const d = parsed.data;

  const reel = await queryOne<{ id: string }>(
    `INSERT INTO reels
       (store_id, title, description, cloudinary_public_id, video_url, thumbnail_url, duration_seconds)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id`,
    [store.id, d.title ?? null, d.description ?? null,
     d.cloudinaryPublicId, d.videoUrl, d.thumbnailUrl ?? null, d.durationSeconds ?? null]
  );
  if (!reel) return NextResponse.json({ error: "Failed to create reel" }, { status: 500 });

  // Link products
  if (d.productIds?.length) {
    for (let i = 0; i < d.productIds.length; i++) {
      await queryOne(
        "INSERT INTO reel_products (reel_id, product_id, sort_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
        [reel.id, d.productIds[i], i]
      );
    }
  }

  // Bust store feed cache
  await cacheDel(reelKey.storeFeed(store.id));

  return NextResponse.json({ id: reel.id }, { status: 201 });
}

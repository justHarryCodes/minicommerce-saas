import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getOrSet, cacheKey, cacheDel, reelKey, TTL } from "@/lib/redis";
import type { Reel } from "@/types";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { slug } = await params;

  const store = await queryOne<{ id: string }>(
    "SELECT id FROM stores WHERE slug = $1 AND is_active = true",
    [slug]
  );
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor"); // reel id to paginate after
  const limit  = 10;

  const reels = await getOrSet<Reel[]>(
    cursor ? `${reelKey.storeFeed(store.id)}:${cursor}` : reelKey.storeFeed(store.id),
    async () => {
      const rows = await query<Reel>(
        `SELECT r.*,
           COALESCE(
             json_agg(
               json_build_object('product_id',p.id,'name',p.name,'price',p.price,
                 'image_url',p.image_url,'slug',p.slug,'stock_quantity',p.stock_quantity)
               ORDER BY rp.sort_order
             ) FILTER (WHERE p.id IS NOT NULL), '[]'
           ) AS products
         FROM reels r
         LEFT JOIN reel_products rp ON rp.reel_id = r.id
         LEFT JOIN products p ON p.id = rp.product_id
         WHERE r.store_id = $1 AND r.is_active = true
           ${cursor ? "AND r.created_at < (SELECT created_at FROM reels WHERE id = $3)" : ""}
         GROUP BY r.id
         ORDER BY r.created_at DESC
         LIMIT $2`,
        cursor ? [store.id, limit, cursor] : [store.id, limit]
      );
      return rows;
    },
    TTL.REEL_FEED
  );

  const list = reels ?? [];
  return NextResponse.json({
    reels: list,
    nextCursor: list.length === limit ? list[list.length - 1].id : null,
  });
}

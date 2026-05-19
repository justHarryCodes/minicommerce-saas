import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOrSet, reelKey, TTL } from "@/lib/redis";
import type { Reel } from "@/types";

// Public trending/featured reels for the discovery page.
// Only surfaces is_featured = true reels — admin curates what appears here
// to avoid system overload from surfacing all reels globally.
export async function GET() {
  const reels = await getOrSet<Reel[]>(
    reelKey.trending(),
    async () =>
      query<Reel>(
        `SELECT r.*,
           s.name AS store_name, s.slug AS store_slug, s.logo_url AS store_logo,
           COALESCE(
             json_agg(
               json_build_object('product_id',p.id,'name',p.name,'price',p.price,
                 'image_url',p.image_url,'slug',p.slug,'stock_quantity',p.stock_quantity)
               ORDER BY rp.sort_order
             ) FILTER (WHERE p.id IS NOT NULL), '[]'
           ) AS products
         FROM reels r
         JOIN stores s ON s.id = r.store_id AND s.is_active = true
         LEFT JOIN reel_products rp ON rp.reel_id = r.id
         LEFT JOIN products p ON p.id = rp.product_id
         WHERE r.is_active = true AND r.is_featured = true
         GROUP BY r.id, s.name, s.slug, s.logo_url
         ORDER BY r.view_count DESC, r.created_at DESC
         LIMIT 30`,
        []
      ),
    TTL.REEL_TRENDING
  );

  return NextResponse.json({ reels: reels ?? [] });
}

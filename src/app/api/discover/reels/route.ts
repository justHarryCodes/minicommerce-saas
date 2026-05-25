import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOrSet, reelKey } from "@/lib/redis";
import type { Reel } from "@/types";

const DISCOVER_TTL = 900; // 15 minutes — reels don't change frequently

// Insert Cloudinary transformations for mobile: H.264 MP4, auto-quality, max 720px wide.
// This cuts file size 40–60% vs the raw upload with zero visible quality loss on phone screens.
function optimizeVideoUrl(url: string): string {
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", "/upload/f_mp4,q_auto:good,w_720,c_limit/");
}

function optimizeThumbnailUrl(url: string | null): string | null {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", "/upload/f_jpg,q_auto:good,w_720,c_limit/");
}

// Group reels by store, shuffle store order, then interleave round-robin so
// you never watch all of Store A before seeing Store B.
function interleaveByStore(reels: Reel[]): Reel[] {
  const map = new Map<string, Reel[]>();
  for (const reel of reels) {
    if (!map.has(reel.store_id)) map.set(reel.store_id, []);
    map.get(reel.store_id)!.push(reel);
  }

  const stores = Array.from(map.values());

  // Fisher-Yates shuffle of store order for variety on each request
  for (let i = stores.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [stores[i], stores[j]] = [stores[j], stores[i]];
  }

  const result: Reel[] = [];
  let round = 0;
  while (result.length < reels.length) {
    let added = false;
    for (const storeReels of stores) {
      if (storeReels[round]) { result.push(storeReels[round]); added = true; }
    }
    if (!added) break;
    round++;
  }
  return result;
}

export async function GET() {
  // Cache raw list from DB (15 min); optimize URLs + interleave per-request in memory.
  const raw = await getOrSet<Reel[]>(
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
         WHERE r.is_active = true
         GROUP BY r.id, s.name, s.slug, s.logo_url
         ORDER BY r.view_count DESC, r.created_at DESC
         LIMIT 30`,
        []
      ),
    DISCOVER_TTL
  );

  const reels = interleaveByStore(raw ?? []).map(r => ({
    ...r,
    video_url:     optimizeVideoUrl(r.video_url),
    thumbnail_url: optimizeThumbnailUrl(r.thumbnail_url ?? null),
  }));

  return NextResponse.json({ reels });
}

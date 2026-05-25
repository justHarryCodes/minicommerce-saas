import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOrSet, reelKey, TTL } from "@/lib/redis";
import type { Reel } from "@/types";

// Group reels by store, shuffle the store order, then interleave round-robin.
// Result: store A reel 1 → store B reel 1 → store C reel 1 → store A reel 2 → …
// Store order is randomised per request so the feed feels fresh even from cache.
function interleaveByStore(reels: Reel[]): Reel[] {
  const map = new Map<string, Reel[]>();
  for (const reel of reels) {
    if (!map.has(reel.store_id)) map.set(reel.store_id, []);
    map.get(reel.store_id)!.push(reel);
  }

  const stores = Array.from(map.values());

  // Fisher-Yates shuffle of store order
  for (let i = stores.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [stores[i], stores[j]] = [stores[j], stores[i]];
  }

  const result: Reel[] = [];
  let round = 0;
  while (result.length < reels.length) {
    let added = false;
    for (const storeReels of stores) {
      if (storeReels[round]) {
        result.push(storeReels[round]);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }

  return result;
}

export async function GET() {
  // Cache raw list (sorted by popularity); interleave + shuffle per-request in memory.
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
    TTL.REEL_TRENDING
  );

  return NextResponse.json({ reels: interleaveByStore(raw ?? []) });
}

import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOrSet } from "@/lib/redis";

const CACHE_KEY = "discover:vendors";
const CACHE_TTL = 300; // 5 minutes

export async function GET() {
  const vendors = await getOrSet(
    CACHE_KEY,
    async () =>
      query<{
        store_id: string;
        store_name: string;
        store_slug: string;
        store_logo: string | null;
        category: string;
        total_views: number;
        product_count: number;
      }>(
        `SELECT
           s.id                                       AS store_id,
           s.name                                     AS store_name,
           s.slug                                     AS store_slug,
           s.logo_url                                 AS store_logo,
           COALESCE(s.primary_category, 'Other')      AS category,
           COALESCE(SUM(r.view_count), 0)::int        AS total_views,
           COUNT(DISTINCT p.id)::int                  AS product_count
         FROM stores s
         LEFT JOIN products p ON p.store_id = s.id AND p.is_active = true
         LEFT JOIN reels   r ON r.store_id = s.id AND r.is_active = true
         WHERE s.is_active = true
         GROUP BY s.id, s.name, s.slug, s.logo_url, s.primary_category
         ORDER BY total_views DESC, product_count DESC, s.created_at DESC
         LIMIT 100`,
        []
      ),
    CACHE_TTL
  );

  return NextResponse.json({ vendors: vendors ?? [] });
}

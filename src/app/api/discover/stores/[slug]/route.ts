import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOrSet } from "@/lib/redis";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { slug } = await params;

  const cacheKey = `discover:store:${slug}`;

  const store = await getOrSet(
    cacheKey,
    async () => {
      const [storeRows, productRows] = await Promise.all([
        query<{
          store_id: string;
          store_name: string;
          store_slug: string;
          store_logo: string | null;
          category: string;
          description: string | null;
          total_views: number;
          product_count: number;
        }>(
          `SELECT
             s.id                                      AS store_id,
             s.name                                    AS store_name,
             s.slug                                    AS store_slug,
             s.logo_url                                AS store_logo,
             COALESCE(s.primary_category, 'Other')     AS category,
             s.description,
             COALESCE(SUM(r.view_count), 0)::int       AS total_views,
             COUNT(DISTINCT p.id)::int                 AS product_count
           FROM stores s
           LEFT JOIN products p ON p.store_id = s.id AND p.is_active = true
           LEFT JOIN reels   r ON r.store_id = s.id AND r.is_active = true
           WHERE s.is_active = true AND s.slug = $1
           GROUP BY s.id, s.name, s.slug, s.logo_url, s.primary_category, s.description`,
          [slug]
        ),
        query<{
          product_id: string;
          name: string;
          price: number;
          image_url: string | null;
          slug: string;
          stock_quantity: number;
        }>(
          `SELECT
             p.id             AS product_id,
             p.name,
             p.price,
             p.image_url,
             p.slug,
             p.stock_quantity
           FROM products p
           JOIN stores s ON s.id = p.store_id AND s.slug = $1 AND s.is_active = true
           WHERE p.is_active = true
           ORDER BY p.is_featured DESC, p.created_at DESC
           LIMIT 20`,
          [slug]
        ),
      ]);

      if (!storeRows.length) return null;

      return { ...storeRows[0], products: productRows };
    },
    300
  );

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  return NextResponse.json({ store });
}

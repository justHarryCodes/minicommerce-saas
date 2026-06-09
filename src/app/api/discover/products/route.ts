import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOrSet } from "@/lib/redis";

export interface DiscoverProduct {
  product_id: string;
  product_name: string;
  product_slug: string;
  price: number;
  compare_price: number | null;
  image_url: string | null;
  category_name: string | null;
  store_id: string;
  store_name: string;
  store_slug: string;
  store_logo: string | null;
  store_category: string | null;
}

const CACHE_TTL = 300; // 5 minutes

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category") ?? "";
  const q = (searchParams.get("q") ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "40", 10)));
  const offset = (page - 1) * limit;

  const cacheKey = `discover:products:${category}:${q}:${page}:${limit}`;

  const result = await getOrSet(
    cacheKey,
    async () => {
      const conditions: string[] = [
        "p.is_active = true",
        "s.is_active = true",
        "p.stock_quantity > 0",
      ];
      const vals: unknown[] = [];
      let idx = 1;

      if (category && category !== "all") {
        conditions.push(`s.primary_category = $${idx++}`);
        vals.push(category);
      }

      if (q) {
        conditions.push(`(p.name ILIKE $${idx} OR s.name ILIKE $${idx})`);
        vals.push(`%${q}%`);
        idx++;
      }

      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

      const [products, countRows] = await Promise.all([
        query<DiscoverProduct>(
          `SELECT
             p.id                                        AS product_id,
             p.name                                      AS product_name,
             p.slug                                      AS product_slug,
             p.price,
             p.compare_price,
             p.image_url,
             c.name                                      AS category_name,
             s.id                                        AS store_id,
             s.name                                      AS store_name,
             s.slug                                      AS store_slug,
             s.logo_url                                  AS store_logo,
             COALESCE(s.primary_category, 'Other')       AS store_category
           FROM products p
           JOIN stores s ON s.id = p.store_id
           LEFT JOIN categories c ON c.id = p.category_id
           ${where}
           ORDER BY p.is_featured DESC, p.created_at DESC
           LIMIT $${idx++} OFFSET $${idx++}`,
          [...vals, limit, offset]
        ),
        query<{ total: string }>(
          `SELECT COUNT(*) AS total
           FROM products p
           JOIN stores s ON s.id = p.store_id
           ${where}`,
          vals
        ),
      ]);

      const total = parseInt(countRows[0]?.total ?? "0", 10);
      return { products: products ?? [], total, page, limit };
    },
    CACHE_TTL
  );

  return NextResponse.json(result);
}

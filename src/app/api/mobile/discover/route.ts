import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOrSet } from "@/lib/redis";
import { mobileProductImage, mobileStoreLogo } from "@/lib/cloudinary-transform";

// GET /api/mobile/discover
// Public endpoint — no auth required.
// Query params:
//   type=stores|products|all  (default: all)
//   category=<primary_category>
//   q=<search term>
//   page=<number>  (default: 1)
//   limit=<number> (default: 20, max: 100)

const CACHE_TTL = 300;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") ?? "all";
  const category = searchParams.get("category") ?? "";
  const q = (searchParams.get("q") ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  const cacheKey = `mobile:discover:${type}:${category}:${q}:${page}:${limit}`;

  const result = await getOrSet(
    cacheKey,
    async () => {
      const fetchStores = type === "stores" || type === "all";
      const fetchProducts = type === "products" || type === "all";

      // Build shared filter conditions
      const storeConditions: string[] = ["s.is_active = true"];
      const storeVals: unknown[] = [];
      let si = 1;

      if (category && category !== "all") {
        storeConditions.push(`s.primary_category = $${si++}`);
        storeVals.push(category);
      }
      if (q) {
        storeConditions.push(`(s.name ILIKE $${si} OR s.description ILIKE $${si})`);
        storeVals.push(`%${q}%`);
        si++;
      }

      const productConditions: string[] = [
        "p.is_active = true",
        "s.is_active = true",
        "p.stock_quantity > 0",
      ];
      const productVals: unknown[] = [];
      let pi = 1;

      if (category && category !== "all") {
        productConditions.push(`s.primary_category = $${pi++}`);
        productVals.push(category);
      }
      if (q) {
        productConditions.push(`(p.name ILIKE $${pi} OR s.name ILIKE $${pi})`);
        productVals.push(`%${q}%`);
        pi++;
      }

      const storeWhere = storeConditions.join(" AND ");
      const productWhere = productConditions.join(" AND ");

      const [storesResult, productsResult] = await Promise.all([
        fetchStores
          ? query<{
              store_id: string;
              store_name: string;
              store_slug: string;
              store_logo: string | null;
              store_category: string | null;
              description: string | null;
              product_count: number;
            }>(
              `SELECT
                 s.id                                       AS store_id,
                 s.name                                     AS store_name,
                 s.slug                                     AS store_slug,
                 s.logo_url                                 AS store_logo,
                 COALESCE(s.primary_category, 'Other')      AS store_category,
                 s.description,
                 COUNT(DISTINCT p.id)::int                  AS product_count
               FROM stores s
               LEFT JOIN products p ON p.store_id = s.id AND p.is_active = true
               WHERE ${storeWhere}
               GROUP BY s.id, s.name, s.slug, s.logo_url, s.primary_category, s.description
               ORDER BY product_count DESC, s.created_at DESC
               LIMIT $${si++} OFFSET $${si++}`,
              [...storeVals, limit, offset]
            )
          : Promise.resolve([]),

        fetchProducts
          ? query<{
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
            }>(
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
               WHERE ${productWhere}
               ORDER BY p.is_featured DESC, p.created_at DESC
               LIMIT $${pi++} OFFSET $${pi++}`,
              [...productVals, limit, offset]
            )
          : Promise.resolve([]),
      ]);

      return {
        type,
        page,
        limit,
        stores: storesResult.map(s => ({
          ...s,
          store_logo: mobileStoreLogo(s.store_logo),
        })),
        products: productsResult.map(p => ({
          ...p,
          image_url:  mobileProductImage(p.image_url),
          store_logo: mobileStoreLogo(p.store_logo),
        })),
      };
    },
    CACHE_TTL
  );

  return NextResponse.json(result);
}

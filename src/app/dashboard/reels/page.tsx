import { verifySession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { getPlatformSettings } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import ReelsClient from "./ReelsClient";
import type { Reel, Product } from "@/types";

export const metadata = { title: "Reels" };

export default async function ReelsDashboardPage() {
  const user = await verifySession();
  if (!user) redirect("/auth/login");

  const store = await queryOne<{ id: string; slug: string; reels_monthly_limit: number | null }>(
    "SELECT id, slug, reels_monthly_limit FROM stores WHERE owner_id = $1 AND is_active = true",
    [user.firebaseUid]
  );
  if (!store) redirect("/onboarding");

  const globalSettings = await getPlatformSettings();
  const monthlyLimit = store.reels_monthly_limit ?? globalSettings.reels_monthly_limit;

  const usageRow = await queryOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM reels WHERE store_id = $1 AND created_at >= date_trunc('month', NOW())",
    [store.id]
  );
  const monthlyUsed = Number(usageRow?.count ?? 0);

  const [reels, products] = await Promise.all([
    query<Reel>(
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
       WHERE r.store_id = $1
       GROUP BY r.id
       ORDER BY r.created_at DESC`,
      [store.id]
    ),
    query<Product>(
      "SELECT id, name, price, image_url, slug, stock_quantity FROM products WHERE store_id = $1 AND is_active = true ORDER BY name",
      [store.id]
    ),
  ]);

  return (
    <ReelsClient
      storeId={store.id}
      storeSlug={store.slug}
      initialReels={reels}
      products={products}
      monthlyUsed={monthlyUsed}
      monthlyLimit={monthlyLimit}
    />
  );
}

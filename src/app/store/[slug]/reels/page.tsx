import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { queryOne, query } from "@/lib/db";
import { getOrSet, reelKey, TTL } from "@/lib/redis";
import ReelFeed from "@/components/storefront/ReelFeed";
import type { Reel } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Reels — ${slug}` };
}

export default async function StoreReelsPage({ params }: Props) {
  const { slug } = await params;

  const store = await queryOne<{ id: string; name: string }>(
    "SELECT id, name FROM stores WHERE slug = $1 AND is_active = true",
    [slug]
  );
  if (!store) notFound();

  const reels = await getOrSet<Reel[]>(
    reelKey.storeFeed(store.id),
    () =>
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
         WHERE r.store_id = $1 AND r.is_active = true
         GROUP BY r.id
         ORDER BY r.created_at DESC
         LIMIT 10`,
        [store.id]
      ),
    TTL.REEL_FEED
  );

  const h = await headers();
  const isSubdomain = h.get("x-is-subdomain") === "1";
  const storeBase = isSubdomain ? "" : `/store/${slug}`;

  return (
    // Full-screen feed — remove the pt-16 padding from layout
    <div className="-mt-16 bg-black">
      <ReelFeed
        initialReels={reels ?? []}
        shareBase={storeBase}
        storeSlug={slug}
      />
    </div>
  );
}

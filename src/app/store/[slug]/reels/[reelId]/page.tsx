import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { queryOne } from "@/lib/db";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { Reel } from "@/types";

interface Props {
  params: Promise<{ slug: string; reelId: string }>;
}

async function getReel(reelId: string, storeId: string): Promise<Reel | null> {
  return queryOne<Reel>(
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
     WHERE r.id = $1 AND r.store_id = $2 AND r.is_active = true
     GROUP BY r.id`,
    [reelId, storeId]
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, reelId } = await params;

  const store = await queryOne<{ id: string; name: string }>(
    "SELECT id, name FROM stores WHERE slug = $1 AND is_active = true",
    [slug]
  );
  if (!store) return {};

  const reel = await getReel(reelId, store.id);
  if (!reel) return {};

  const title = reel.title ?? `Reel by ${store.name}`;
  const description = reel.description ?? `Watch and shop this reel from ${store.name}`;
  const image = reel.thumbnail_url ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [image] : [],
      type: "video.other",
      videos: [{ url: reel.video_url }],
    },
    twitter: {
      card: "player",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function ReelSharePage({ params }: Props) {
  const { slug, reelId } = await params;

  const store = await queryOne<{ id: string; name: string; logo_url: string | null; slug: string }>(
    "SELECT id, name, logo_url, slug FROM stores WHERE slug = $1 AND is_active = true",
    [slug]
  );
  if (!store) notFound();

  const reel = await getReel(reelId, store.id);
  if (!reel) notFound();

  const h = await headers();
  const isSubdomain = h.get("x-is-subdomain") === "1";
  const storeBase = isSubdomain ? "" : `/store/${slug}`;

  const products = reel.products ?? [];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center py-10 px-4">
      {/* Store header */}
      <Link href={storeBase || "/"} className="flex items-center gap-2 mb-6">
        {store.logo_url ? (
          <Image
            src={store.logo_url}
            alt={store.name}
            width={36}
            height={36}
            className="w-9 h-9 rounded-full object-cover border border-white/20"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">
            {store.name[0]}
          </div>
        )}
        <span className="font-semibold text-white text-sm">{store.name}</span>
      </Link>

      {/* Video player — 9:16 */}
      <div className="w-full max-w-xs aspect-[9/16] rounded-2xl overflow-hidden bg-black shadow-2xl">
        <video
          src={reel.video_url}
          poster={reel.thumbnail_url ?? undefined}
          controls
          playsInline
          className="w-full h-full object-cover"
        />
      </div>

      {/* Title + description */}
      {(reel.title || reel.description) && (
        <div className="w-full max-w-xs mt-5 text-center">
          {reel.title && (
            <p className="font-semibold text-white text-base mb-1">{reel.title}</p>
          )}
          {reel.description && (
            <p className="text-zinc-400 text-sm">{reel.description}</p>
          )}
        </div>
      )}

      {/* Products */}
      {products.length > 0 && (
        <div className="w-full max-w-xs mt-6">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Featured Products
          </p>
          <div className="flex flex-col gap-3">
            {products.map((p) => (
              <Link
                key={p.product_id}
                href={`${storeBase}/products/${p.slug ?? p.product_id}`}
                className="flex items-center gap-3 bg-zinc-900 rounded-2xl p-3 hover:bg-zinc-800 transition-colors"
              >
                {p.image_url ? (
                  <Image
                    src={p.image_url}
                    alt={p.name}
                    width={52}
                    height={52}
                    className="w-13 h-13 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-xl bg-zinc-800 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{p.name}</p>
                  <p className="text-sm font-bold text-amber-400">
                    ₦{p.price.toLocaleString()}
                  </p>
                </div>
                {p.stock_quantity > 0 ? (
                  <span className="shrink-0 text-xs font-semibold text-zinc-300 bg-zinc-700 px-2.5 py-1 rounded-lg">
                    Shop →
                  </span>
                ) : (
                  <span className="shrink-0 text-xs font-semibold text-zinc-500 bg-zinc-800 px-2.5 py-1 rounded-lg">
                    Sold out
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* CTA to full feed */}
      <Link
        href={`${storeBase}/reels`}
        className="mt-8 px-6 py-3 rounded-2xl bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-100 transition-colors"
      >
        See all reels from {store.name}
      </Link>
    </div>
  );
}

import { cache } from "react";
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

interface ReelPageData {
  id: string;
  name: string;
  logo_url: string | null;
  slug: string;
  reel: Reel;
}

// One query (store + reel + products), cached per request so
// generateMetadata and the page share the same result (was 4 queries, now 1).
const getReelPage = cache(
  async (slug: string, reelId: string): Promise<ReelPageData | null> => {
    return queryOne<ReelPageData>(
      `SELECT s.id, s.name, s.logo_url, s.slug,
       to_jsonb(r) || jsonb_build_object(
         'products',
         COALESCE((
           SELECT jsonb_agg(
             jsonb_build_object(
               'product_id', p.id, 'name', p.name, 'price', p.price,
               'image_url', p.image_url, 'slug', p.slug,
               'stock_quantity', p.stock_quantity
             ) ORDER BY rp.sort_order
           )
           FROM reel_products rp
           JOIN products p ON p.id = rp.product_id
           WHERE rp.reel_id = r.id
         ), '[]'::jsonb)
       ) AS reel
     FROM stores s
     JOIN reels r ON r.store_id = s.id AND r.id = $2 AND r.is_active = true
     WHERE s.slug = $1 AND s.is_active = true`,
      [slug, reelId],
    );
  },
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, reelId } = await params;
  const data = await getReelPage(slug, reelId);
  if (!data) return {};

  const { reel, name } = data;
  const title = reel.title ?? `Reel by ${name}`;
  const description =
    reel.description ?? `Watch and shop this reel from ${name}`;
  const images = reel.thumbnail_url ? [reel.thumbnail_url] : [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images,
      type: "video.other",
      videos: [{ url: reel.video_url }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

export default async function ReelSharePage({ params }: Props) {
  const { slug, reelId } = await params;

  const data = await getReelPage(slug, reelId);
  if (!data) notFound();

  const { reel } = data;
  const store = data;

  const h = await headers();
  const isSubdomain = h.get("x-is-subdomain") === "1";
  const storeBase = isSubdomain ? "" : `/store/${slug}`;

  const products = reel.products ?? [];
  const primary = products.find((p) => p.stock_quantity > 0) ?? null;
  const productHref = (p: { slug?: string | null; product_id: string }) =>
    `${storeBase}/products/${p.slug ?? p.product_id}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-28">
      <div className="mx-auto max-w-4xl px-4 pt-6">
        {/* Store header */}
        <Link href={storeBase || "/"} className="mb-5 flex items-center gap-2">
          {store.logo_url ? (
            <Image
              src={store.logo_url}
              alt={store.name}
              width={36}
              height={36}
              priority
              className="h-9 w-9 rounded-full border border-white/20 object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
              {store.name[0]}
            </div>
          )}
          <span className="text-sm font-semibold">{store.name}</span>
        </Link>

        <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-center">
          {/* Video — 9:16, autoplays muted so the poster is the only blocking asset */}
          <div className="w-full max-w-xs shrink-0">
            <div className="aspect-[9/16] overflow-hidden rounded-2xl bg-black shadow-2xl">
              <video
                src={reel.video_url}
                poster={reel.thumbnail_url ?? undefined}
                controls
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
            </div>

            {(reel.title || reel.description) && (
              <div className="mt-4 text-center md:text-left">
                {reel.title && (
                  <p className="mb-1 text-base font-semibold">{reel.title}</p>
                )}
                {reel.description && (
                  <p className="text-sm text-zinc-400">{reel.description}</p>
                )}
              </div>
            )}
          </div>

          {/* Products */}
          <div className="w-full max-w-xs md:max-w-sm md:pt-2">
            {products.length > 0 && (
              <>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Shop this reel
                </p>
                <div className="flex flex-col gap-3">
                  {products.map((p) => {
                    const inStock = p.stock_quantity > 0;
                    const lowStock = inStock && p.stock_quantity <= 5;
                    return (
                      <Link
                        key={p.product_id}
                        href={productHref(p)}
                        className="flex items-center gap-3 rounded-2xl bg-zinc-900 p-3 transition-colors hover:bg-zinc-800"
                      >
                        {p.image_url ? (
                          <Image
                            src={p.image_url}
                            alt={p.name}
                            width={56}
                            height={56}
                            sizes="56px"
                            className="h-14 w-14 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="h-14 w-14 shrink-0 rounded-xl bg-zinc-800" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {p.name}
                          </p>
                          <p className="text-base font-bold text-amber-400">
                            ₦{Number(p.price).toLocaleString()}
                          </p>
                          {lowStock && (
                            <p className="text-xs font-medium text-red-400">
                              Only {p.stock_quantity} left
                            </p>
                          )}
                        </div>
                        {inStock ? (
                          <span className="shrink-0 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-zinc-900">
                            Buy
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                            Sold out
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}

            <Link
              href={`${storeBase}/reels`}
              className="mt-6 block rounded-2xl border border-zinc-700 py-3 text-center text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-900"
            >
              See all reels from {store.name}
            </Link>
          </div>
        </div>
      </div>

      {/* Sticky buy bar — keeps the main call-to-action always in reach */}
      {primary && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-zinc-950/95 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{primary.name}</p>
              <p className="text-base font-bold text-amber-400">
                ₦{Number(primary.price).toLocaleString()}
              </p>
            </div>
            <Link
              href={productHref(primary)}
              className="shrink-0 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-zinc-900 transition-colors hover:bg-amber-300"
            >
              Shop now →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

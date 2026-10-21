import { redirect } from "next/navigation";
import { verifySession, getUserStore } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { getAppUrl } from "@/lib/paystack";
import { getStoreUrl } from "@/lib/utils";
import ChannelsClient from "./ChannelsClient";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const user = await verifySession();
  if (!user) redirect("/auth/login");
  const store = await getUserStore(user.firebaseUid);
  if (!store) redirect("/dashboard/orders");

  const [settings, readiness, sample] = await Promise.all([
    queryOne<{ feeds_enabled: boolean }>("SELECT feeds_enabled FROM stores WHERE id = $1", [store.id]),
    // What a catalog will accept: active physical products with a photo and a price
    queryOne<{ total: number; ready: number; no_image: number; no_description: number }>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE COALESCE(image_url, images[1]) IS NOT NULL AND price > 0)::int AS ready,
              COUNT(*) FILTER (WHERE COALESCE(image_url, images[1]) IS NULL)::int AS no_image,
              COUNT(*) FILTER (WHERE COALESCE(description, '') = '')::int AS no_description
       FROM products WHERE store_id = $1 AND is_active = true AND COALESCE(is_bookable, false) = false`,
      [store.id]
    ),
    query<{ name: string; slug: string; price: string; image_url: string | null; images: string[] | null }>(
      `SELECT name, slug, price, image_url, images FROM products
       WHERE store_id = $1 AND is_active = true AND COALESCE(image_url, images[1]) IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [store.id]
    ),
  ]);

  const feedBase = `${getAppUrl()}/api/feeds/${store.slug}`;
  const storeUrl = getStoreUrl(store.slug, store.customDomain ?? store.custom_domain ?? null);
  const p = sample[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-4 lg:pt-0">
      <div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-white">Sales channels</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Show your products on Google Shopping, Facebook and Instagram. Your catalog stays in sync automatically — prices, stock and photos update on their own.
        </p>
      </div>
      <ChannelsClient
        feedsEnabled={settings?.feeds_enabled !== false}
        feeds={{
          google: `${feedBase}/google.xml`,
          meta: `${feedBase}/meta.xml`,
          csv: `${feedBase}/products.csv`,
        }}
        readiness={readiness ?? { total: 0, ready: 0, no_image: 0, no_description: 0 }}
        preview={
          p
            ? {
                title: `${p.name} · ₦${Number(p.price).toLocaleString("en-NG")}`,
                image: p.image_url ?? p.images?.[0] ?? null,
                site: store.name,
                url: `${storeUrl}/products/${p.slug}`,
              }
            : { title: store.name, image: store.logoUrl ?? store.logo_url ?? null, site: store.name, url: storeUrl }
        }
      />
    </div>
  );
}

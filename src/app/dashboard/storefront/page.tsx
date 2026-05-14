import { redirect } from "next/navigation";
import { verifySession, getUserStore } from "@/lib/auth";
import { queryMany, queryOne } from "@/lib/db";
import StorefrontPageClient from "./StorefrontPageClient";
import type { Product } from "@/types";

export const dynamic = "force-dynamic";

export default async function StorefrontPage() {
  const user = await verifySession();
  if (!user) redirect("/auth/login");

  const storeRow = await queryOne<{
    id: string;
    banner_images: string[] | null;
    featured_product_ids: string[] | null;
  }>(
    "SELECT id, banner_images, featured_product_ids FROM stores WHERE owner_id = $1 AND is_active = true",
    [user.firebaseUid]
  );
  if (!storeRow) redirect("/onboarding");

  const products = await queryMany<Product>(
    "SELECT id, name, slug, price, compare_price, stock_quantity, image_url, images FROM products WHERE store_id = $1 AND is_active = true ORDER BY sort_order, name",
    [storeRow.id]
  );

  return (
    <div className="max-w-3xl mx-auto space-y-4 pt-4 lg:pt-0">
      <div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-white">Store Page</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Customise your store homepage — hero banner and featured products.
        </p>
      </div>

      <StorefrontPageClient
        initialBanners={storeRow.banner_images ?? []}
        initialFeatured={storeRow.featured_product_ids ?? []}
        products={products}
      />
    </div>
  );
}

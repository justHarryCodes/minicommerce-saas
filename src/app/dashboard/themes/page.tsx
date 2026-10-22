import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { getStoreUrl } from "@/lib/utils";
import { storeThemeState } from "@/lib/themes/resolve";
import { ownedThemeIds } from "@/lib/theme-access";
import type { Store } from "@/types";
import ThemeStudioClient from "./ThemeStudioClient";

export const dynamic = "force-dynamic";

export default async function ThemesPage() {
  const user = await verifySession();
  if (!user) redirect("/auth/login");

  // SELECT * so the page still loads (as a legacy store) before the
  // storefront_themes migration has been run.
  const store = await queryOne<Store>(
    "SELECT * FROM stores WHERE owner_id = $1 AND is_active = true",
    [user.firebaseUid]
  );
  if (!store) redirect("/onboarding");

  const { themeId, customization } = storeThemeState(store);
  const [ownedThemes, target] = await Promise.all([
    ownedThemeIds(store.id),
    // A real category + product so the studio can preview those pages
    queryOne<{ product: string | null; category: string | null }>(
      `SELECT
         (SELECT slug FROM products WHERE store_id = $1 AND is_active = true ORDER BY (stock_quantity > 0) DESC, sort_order, created_at DESC LIMIT 1) AS product,
         (SELECT c.slug FROM categories c WHERE c.store_id = $1 AND c.parent_id IS NULL
            AND EXISTS (SELECT 1 FROM products p WHERE p.category_id = c.id AND p.is_active = true AND p.stock_quantity > 0)
          ORDER BY c.sort_order, c.name LIMIT 1) AS category`,
      [store.id],
    ).catch(() => null),
  ]);

  return (
    <div className="mx-auto max-w-7xl pt-4 lg:pt-0">
      <ThemeStudioClient
        storeSlug={store.slug}
        storeName={store.name}
        storeUrl={getStoreUrl(store.slug, store.custom_domain ?? store.customDomain)}
        savedThemeId={themeId}
        savedCustomization={customization}
        ownedThemes={ownedThemes}
        previewTargets={{ product: target?.product ?? undefined, category: target?.category ?? undefined }}
      />
    </div>
  );
}

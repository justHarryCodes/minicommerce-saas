import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { getStoreUrl } from "@/lib/utils";
import { storeThemeState } from "@/lib/themes/resolve";
import { hasFeature } from "@/lib/plan";
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
  const [premiumUnlocked, ownedThemes] = await Promise.all([hasFeature(store.id, "premium_themes"), ownedThemeIds(store.id)]);

  return (
    <div className="mx-auto max-w-7xl pt-4 lg:pt-0">
      <ThemeStudioClient
        storeSlug={store.slug}
        storeName={store.name}
        storeUrl={getStoreUrl(store.slug, store.custom_domain ?? store.customDomain)}
        savedThemeId={themeId}
        savedCustomization={customization}
        premiumUnlocked={premiumUnlocked}
        ownedThemes={ownedThemes}
      />
    </div>
  );
}

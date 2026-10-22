// Theme + chrome wrapper around every storefront page: theme CSS variables,
// webfonts, light/dark lock, announcement bar and the nav. Shared by real
// stores (app/store/[slug]/layout.tsx) and theme demo stores.

import { googleFontsHref } from "@/lib/theme-presets";
import { themeCss } from "@/lib/themes/resolve";
import { openStatus, parseHours } from "@/lib/hours";
import type { ResolvedTheme } from "@/lib/themes/types";
import { StoreProvider } from "@/lib/store-context";
import { toPublicStore } from "@/lib/public-store";
import StorefrontNav from "@/components/storefront/Nav";
import CartProvider from "@/components/storefront/CartProvider";
import ColorModeLock from "@/components/storefront/ColorModeLock";
import type { Category, Store } from "@/types";

interface Props {
  store: Store;
  theme: ResolvedTheme;
  categories: (Category & { subcategories: Category[] })[];
  storeSlug: string;
  storeBase: string;
  aiAssistantEnabled?: boolean;
  /** Rendered inside the providers, after the nav (tracking, assistant, …) */
  extras?: React.ReactNode;
  children: React.ReactNode;
}

export default function StorefrontShell({ store, theme, categories, storeSlug, storeBase, aiAssistantEnabled = false, extras, children }: Props) {
  const { mode, bodyFont, headingFont } = theme.tokens;
  const announcement = theme.copy.announcement;
  // Opening hours (food stores mostly): live open/closed bar
  const status = openStatus(parseHours(store.opening_hours), new Date());
  const prep = store.prep_time_minutes ? Number(store.prep_time_minutes) : null;

  return (
    <StoreProvider storeSlug={storeSlug} storeBase={storeBase} theme={theme} aiAssistantEnabled={aiAssistantEnabled}>
      <CartProvider storeId={store.id}>
        <div className={`storefront min-h-screen ${mode === "dark" ? "dark" : ""}`} style={{ fontFamily: "var(--sf-font)" }} data-theme={theme.id}>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="stylesheet" href={googleFontsHref([bodyFont, headingFont])} />
          <style dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />
          <ColorModeLock mode={mode} />
          {announcement && (
            <div
              className="sf-no-print px-4 py-2.5 text-center text-xs font-semibold tracking-wide sm:text-[13px]"
              style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}
            >
              {announcement}
            </div>
          )}
          {status && (
            <div className="sf-no-print border-b border-surface-200/60 px-4 py-2 text-center text-xs font-medium text-surface-700 dark:border-surface-800 dark:text-surface-200 sm:text-[13px]">
              <span className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${status.open ? "bg-emerald-500" : "bg-amber-500"}`} />
              {status.label}
              {status.open && prep ? ` · ready in about ${prep} min` : ""}
              {!status.open && store.allow_preorders !== false ? " — you can still order ahead" : ""}
            </div>
          )}
          <StorefrontNav store={toPublicStore(store)} categories={categories} />
          {extras}
          <main>{children}</main>
        </div>
      </CartProvider>
    </StoreProvider>
  );
}

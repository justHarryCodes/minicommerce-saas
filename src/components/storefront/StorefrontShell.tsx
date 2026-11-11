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
import { MessageCircle, Phone } from "lucide-react";

/** "Call to order" strip above the nav: the store phone and WhatsApp, one tap away. */
function CallToOrder({ store, title }: { store: Store; title: string }) {
  const phone = store.phone?.trim() || null;
  const wa = store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}` : null;
  if (!phone && !wa) return null;
  return (
    <div className="sf-no-print bg-[#0b0b0d] text-white">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center gap-3 px-4 text-xs sm:justify-between sm:text-[13px] lg:px-6">
        {title && <span className="hidden truncate opacity-75 sm:block">{title}</span>}
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          {phone && (
            <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`} className="flex min-w-0 items-center gap-1.5 font-semibold hover:opacity-80">
              <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--sf-accent)" }} />
              <span className="uppercase tracking-wide opacity-75">Call to order</span>
              <span className="truncate">{phone}</span>
            </a>
          )}
          {phone && wa && <span aria-hidden className="h-3.5 w-px bg-white/25" />}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1.5 font-semibold hover:opacity-80">
              <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
              {phone ? "WhatsApp" : "Order on WhatsApp"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  store: Store;
  theme: ResolvedTheme;
  categories: (Category & { subcategories: Category[] })[];
  storeSlug: string;
  storeBase: string;
  aiAssistantEnabled?: boolean;
  /** Review summary per product id: [average, count] (cards show stars) */
  ratings?: Record<string, [number, number]>;
  /** Rendered inside the providers, after the nav (tracking, assistant, …) */
  extras?: React.ReactNode;
  children: React.ReactNode;
}

export default function StorefrontShell({ store, theme, categories, storeSlug, storeBase, aiAssistantEnabled = false, ratings, extras, children }: Props) {
  const { mode, bodyFont, headingFont } = theme.tokens;
  const announcement = theme.copy.announcement;
  // Opening hours (food stores mostly): live open/closed bar
  const status = openStatus(parseHours(store.opening_hours), new Date());
  const prep = store.prep_time_minutes ? Number(store.prep_time_minutes) : null;

  return (
    <StoreProvider storeSlug={storeSlug} storeBase={storeBase} theme={theme} aiAssistantEnabled={aiAssistantEnabled} ratings={ratings}>
      <CartProvider storeId={store.id}>
        <div className={`storefront min-h-screen ${mode === "dark" ? "dark" : ""}`} style={{ fontFamily: "var(--sf-font)" }} data-theme={theme.id}>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="stylesheet" href={googleFontsHref([bodyFont, headingFont])} />
          <style dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />
          <ColorModeLock mode={mode} />
          <CallToOrder store={store} title={theme.copy.ctaTitle} />
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

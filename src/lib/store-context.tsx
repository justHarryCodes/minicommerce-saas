"use client";

import { createContext, useContext } from "react";
import type { ResolvedTheme } from "@/lib/themes/types";

interface StoreCtx {
  storeSlug: string;
  /** "/store/{slug}" on main domain, "" on subdomain — use for building hrefs */
  storeBase: string;
  /** The store's resolved theme (tokens, layout variants, copy) */
  theme: ResolvedTheme;
  /** Resolved server-side (plan + merchant opt-in) — components just read this, no re-checking. */
  aiAssistantEnabled: boolean;
}

// No default theme on purpose: building one here pulled the whole theme
// catalog, the resolver, zod and chroma-js into every storefront page's
// JavaScript. StorefrontShell always provides the server-resolved theme.
const StoreCtx = createContext<StoreCtx>({
  storeSlug: "",
  storeBase: "",
  theme: null as unknown as ResolvedTheme,
  aiAssistantEnabled: false,
});

export function StoreProvider({
  children,
  storeSlug,
  storeBase,
  theme,
  aiAssistantEnabled = false,
}: {
  children: React.ReactNode;
  storeSlug: string;
  storeBase: string;
  theme: ResolvedTheme;
  aiAssistantEnabled?: boolean;
}) {
  return (
    <StoreCtx.Provider value={{ storeSlug, storeBase, theme, aiAssistantEnabled }}>
      {children}
    </StoreCtx.Provider>
  );
}

/** Returns { storeSlug, storeBase, theme, aiAssistantEnabled }.
 *  Use storeBase to build navigation hrefs:
 *    home        → storeBase || "/"
 *    product     → `${storeBase}/products/${slug}`
 *    checkout    → `${storeBase}/checkout`
 *    category    → `${storeBase || "/"}?category=${cat}`
 */
export const useStore = () => useContext(StoreCtx);

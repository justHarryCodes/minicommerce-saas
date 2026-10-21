"use client";

import { createContext, useContext } from "react";
import { DEFAULT_THEME_ID, getTheme } from "@/lib/themes/catalog";
import { mergeTheme } from "@/lib/themes/resolve";
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

const fallbackTheme = mergeTheme(getTheme(DEFAULT_THEME_ID)!, {});

const StoreCtx = createContext<StoreCtx>({
  storeSlug: "",
  storeBase: "",
  theme: fallbackTheme,
  aiAssistantEnabled: false,
});

export function StoreProvider({
  children,
  storeSlug,
  storeBase,
  theme = fallbackTheme,
  aiAssistantEnabled = false,
}: {
  children: React.ReactNode;
  storeSlug: string;
  storeBase: string;
  theme?: ResolvedTheme;
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

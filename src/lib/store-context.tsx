"use client";

import { createContext, useContext } from "react";

interface StoreCtx {
  storeSlug: string;
  /** "/store/{slug}" on main domain, "" on subdomain — use for building hrefs */
  storeBase: string;
  /** "rounded" | "sharp" — drives product card corner radius, from the merchant's theme preset */
  cardStyle: "rounded" | "sharp";
  /** Resolved server-side (plan + merchant opt-in) — components just read this, no re-checking. */
  aiAssistantEnabled: boolean;
}

const StoreCtx = createContext<StoreCtx>({
  storeSlug: "",
  storeBase: "",
  cardStyle: "rounded",
  aiAssistantEnabled: false,
});

export function StoreProvider({
  children,
  storeSlug,
  storeBase,
  cardStyle = "rounded",
  aiAssistantEnabled = false,
}: {
  children: React.ReactNode;
  storeSlug: string;
  storeBase: string;
  cardStyle?: "rounded" | "sharp";
  aiAssistantEnabled?: boolean;
}) {
  return (
    <StoreCtx.Provider value={{ storeSlug, storeBase, cardStyle, aiAssistantEnabled }}>
      {children}
    </StoreCtx.Provider>
  );
}

/** Returns { storeSlug, storeBase, cardStyle, aiAssistantEnabled }.
 *  Use storeBase to build navigation hrefs:
 *    home        → storeBase || "/"
 *    product     → `${storeBase}/products/${slug}`
 *    checkout    → `${storeBase}/checkout`
 *    category    → `${storeBase || "/"}?category=${cat}`
 */
export const useStore = () => useContext(StoreCtx);

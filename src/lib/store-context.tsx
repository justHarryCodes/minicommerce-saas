"use client";

import { createContext, useContext } from "react";

interface StoreCtx {
  storeSlug: string;
  /** "/store/{slug}" on main domain, "" on subdomain — use for building hrefs */
  storeBase: string;
}

const StoreCtx = createContext<StoreCtx>({ storeSlug: "", storeBase: "" });

export function StoreProvider({
  children,
  storeSlug,
  storeBase,
}: {
  children: React.ReactNode;
  storeSlug: string;
  storeBase: string;
}) {
  return (
    <StoreCtx.Provider value={{ storeSlug, storeBase }}>
      {children}
    </StoreCtx.Provider>
  );
}

/** Returns { storeSlug, storeBase }.
 *  Use storeBase to build navigation hrefs:
 *    home        → storeBase || "/"
 *    product     → `${storeBase}/products/${slug}`
 *    checkout    → `${storeBase}/checkout`
 *    category    → `${storeBase || "/"}?category=${cat}`
 */
export const useStore = () => useContext(StoreCtx);

"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";

// Light / dark / system for Duka itself (landing, dashboard, admin).
//
// Storefronts are always light: they have their own theme designs, and a
// shopper must never see a store turn dark because the vendor picked dark
// mode in their dashboard. On a store's subdomain or custom domain the
// theme choice isn't stored anyway (different site), and paths below cover
// stores opened on dukanigeria.com/store/... and their clean URLs.
const STOREFRONT = /^\/(store|theme-demo|products|checkout|cart-link|receipt|track|saved|search|pages|blog|reels)(\/|$)/;

export function isStorefrontPath(pathname: string | null): boolean {
  return !!pathname && STOREFRONT.test(pathname);
}

export default function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <ThemeProvider
      attribute="class"
      // Light until someone picks otherwise (stores on their own domains stay light)
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      forcedTheme={isStorefrontPath(pathname) ? "light" : undefined}
    >
      {children}
    </ThemeProvider>
  );
}

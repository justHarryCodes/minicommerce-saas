"use client";

// Storefront navigation. The theme picks one of ten bars (themes/types
// NAV_STYLES); the merchant can switch styles and tweak simple options
// (sticky, search, categories, logo size, colour) in the theme studio.
// All bars share state, the slide-out menu, cart and search.

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { LazyMotion } from "framer-motion";
import { useStore } from "@/lib/store-context";
import CartDrawer from "./CartDrawer";
import MenuSheet from "./nav/MenuSheet";
import { NavProvider, useNavValue, type NavCategory } from "./nav/core";
import { BoutiqueNav, ClassicNav } from "./nav/styles/basic";
import { ChipsNav, MarketplaceNav, TwoTierNav } from "./nav/styles/commerce";
import { AppNav, DrawerNav, FloatingNav, MegaNav, OverlayNav } from "./nav/styles/expressive";
import type { NavStyle } from "@/lib/themes/types";
import type { Store } from "@/types";

// Search loads on first open — it isn't needed to paint the page
const SearchOverlay = dynamic(() => import("./SearchOverlay"), { ssr: false });

// Animation engine loads async; only framer's tiny core ships with the page
const loadMotion = () => import("./nav/motion-features").then((m) => m.default);

const STYLES: Record<NavStyle, () => React.ReactElement> = {
  classic: ClassicNav,
  boutique: BoutiqueNav,
  marketplace: MarketplaceNav,
  floating: FloatingNav,
  mega: MegaNav,
  drawer: DrawerNav,
  app: AppNav,
  overlay: OverlayNav,
  twotier: TwoTierNav,
  chips: ChipsNav,
};

export default function StorefrontNav({ store, categories }: { store: Store; categories: NavCategory[] }) {
  const { theme } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const value = useNavValue(store, categories, theme.layout.navOptions, {
    menu: () => setMenuOpen(true),
    cart: () => setCartOpen(true),
    search: () => setSearchOpen(true),
  });
  const Bar = STYLES[theme.layout.nav] ?? ClassicNav;

  return (
    <LazyMotion features={loadMotion} strict>
      <NavProvider value={value}>
        <Bar />
        <MenuSheet open={menuOpen} onClose={closeMenu} />
        <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} store={store} />
        {searchOpen && <SearchOverlay storeSlug={store.slug} onClose={() => setSearchOpen(false)} />}
      </NavProvider>
    </LazyMotion>
  );
}

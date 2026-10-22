"use client";

// Shared pieces for the ten navigation bars: state, logo, icon buttons,
// search, category links, and the overlays (menu, cart, search) every bar
// opens. Each style in ./styles composes these into its own layout.

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import { ChevronDown, Heart, Menu, Search, ShoppingBag, ShoppingCart } from "lucide-react";
import { useCart } from "../CartProvider";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useStore } from "@/lib/store-context";
import type { NavOptions } from "@/lib/themes/types";
import type { Category, Store } from "@/types";

export interface NavCategory extends Category {
  subcategories: Category[];
  /** First product photo in the category (mega menu, chips) */
  cover?: string | null;
}

export interface NavProps {
  store: Store;
  categories: NavCategory[];
}

interface NavCore {
  store: Store;
  categories: NavCategory[];
  opts: NavOptions;
  homeHref: string;
  storeBase: string;
  isHome: boolean;
  activeCategory: string | null;
  scrolled: boolean;
  totalItems: number;
  bookmarkCount: number;
  openMenu: () => void;
  openCart: () => void;
  openSearch: () => void;
  whatsappHref: string | null;
}

const Ctx = createContext<NavCore | null>(null);
export const useNav = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useNav outside NavRoot");
  return c;
};

export function NavProvider({
  value,
  children,
}: {
  value: Omit<NavCore, "scrolled" | "isHome" | "activeCategory">;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const homePath = value.storeBase || "/";
  const isHome = pathname === homePath || pathname === `${homePath}/`;
  return (
    <Ctx.Provider value={{ ...value, scrolled, isHome, activeCategory: isHome ? params.get("category") : null }}>
      {children}
    </Ctx.Provider>
  );
}

/** Wires cart/bookmark counts and store links; overlays are rendered by NavRoot. */
export function useNavValue(store: Store, categories: NavCategory[], opts: NavOptions, open: { menu: () => void; cart: () => void; search: () => void }) {
  const { totalItems } = useCart();
  const { count: bookmarkCount } = useBookmarks(store.slug);
  const { storeBase } = useStore();
  return {
    store,
    categories,
    opts,
    homeHref: storeBase || "/",
    storeBase,
    totalItems,
    bookmarkCount,
    openMenu: open.menu,
    openCart: open.cart,
    openSearch: open.search,
    whatsappHref: store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}` : null,
  };
}

/* ───────────────────────────── Tone ───────────────────────────── */

/** Bar colours as CSS variables so every child reads them (page / accent / dark). */
export function toneStyle(tone: NavOptions["tone"], transparent = false): React.CSSProperties {
  if (transparent) return { ["--nav-bg" as string]: "transparent", ["--nav-fg" as string]: "#ffffff", ["--nav-line" as string]: "rgba(255,255,255,.18)" };
  if (tone === "accent") return { ["--nav-bg" as string]: "var(--sf-accent)", ["--nav-fg" as string]: "var(--sf-on-accent)", ["--nav-line" as string]: "color-mix(in srgb, var(--sf-on-accent) 18%, transparent)" };
  if (tone === "dark") return { ["--nav-bg" as string]: "#0b0b0d", ["--nav-fg" as string]: "#ffffff", ["--nav-line" as string]: "rgba(255,255,255,.1)" };
  return {
    ["--nav-bg" as string]: "color-mix(in srgb, var(--sf-page) 88%, transparent)",
    // Explicit ink (dark text on light pages, light text on dark ones)
    ["--nav-fg" as string]: "var(--sf-ink)",
    ["--nav-line" as string]: "color-mix(in srgb, var(--sf-ink) 10%, transparent)",
  };
}

export const barClass = "bg-[color:var(--nav-bg)] text-[color:var(--nav-fg)] backdrop-blur-xl";

/* ───────────────────────────── Pieces ───────────────────────────── */

const LOGO_H = { sm: "h-7", md: "h-9", lg: "h-11" } as const;
const WORD_SIZE = { sm: "text-lg", md: "text-xl", lg: "text-2xl" } as const;

export function Logo({ size, className = "" }: { size?: NavOptions["logoSize"]; className?: string }) {
  const { store, homeHref, opts } = useNav();
  const s = size ?? opts.logoSize;
  return (
    <Link href={homeHref} className={`flex shrink-0 items-center ${className}`} aria-label={`${store.name} home`}>
      {store.logo_url ? (
        <Image src={store.logo_url} alt={store.name} width={180} height={56} priority className={`${LOGO_H[s]} w-auto object-contain`} />
      ) : (
        <span className={`sf-display whitespace-nowrap ${WORD_SIZE[s]}`}>{store.name}</span>
      )}
    </Link>
  );
}

export function CountBadge({ n }: { n: number }) {
  return (
    <AnimatePresence>
      {n > 0 && (
        <m.span
          key={n}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
          style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}
        >
          {n > 9 ? "9+" : n}
        </m.span>
      )}
    </AnimatePresence>
  );
}

export const iconBtn =
  "relative inline-flex items-center justify-center gap-2 rounded-full p-2.5 transition-colors hover:bg-[color-mix(in_srgb,currentColor_9%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--sf-accent)]";

export function MenuButton({ label }: { label?: string }) {
  const { openMenu } = useNav();
  return (
    <button onClick={openMenu} className={iconBtn} aria-label="Open menu">
      <Menu className="h-5 w-5" />
      {label && <span className="text-sm font-semibold">{label}</span>}
    </button>
  );
}

export function SearchIcon() {
  const { openSearch, opts } = useNav();
  if (opts.search === "hidden") return null;
  return (
    <button onClick={openSearch} className={iconBtn} aria-label="Search">
      <Search className="h-5 w-5" />
    </button>
  );
}

export function SearchBar({ className = "", placeholder }: { className?: string; placeholder?: string }) {
  const { openSearch, store } = useNav();
  return (
    <button
      onClick={openSearch}
      className={`flex h-11 items-center gap-3 rounded-full border border-[color:var(--nav-line)] bg-[color-mix(in_srgb,currentColor_5%,transparent)] px-4 text-left text-sm opacity-90 transition hover:opacity-100 ${className}`}
      aria-label="Search"
    >
      <Search className="h-4 w-4 shrink-0 opacity-60" />
      <span className="truncate opacity-60">{placeholder ?? `Search ${store.name}`}</span>
    </button>
  );
}

export function SavedButton({ withLabel = false }: { withLabel?: boolean }) {
  const { homeHref, bookmarkCount } = useNav();
  return (
    <a href={`${homeHref}#saved-items`} className={iconBtn} aria-label="Saved items">
      <Heart className="h-5 w-5" />
      {withLabel && <span className="hidden text-sm font-semibold xl:inline">Saved</span>}
      <CountBadge n={bookmarkCount} />
    </a>
  );
}

export function CartButton({ withLabel = false, bag = false }: { withLabel?: boolean; bag?: boolean }) {
  const { openCart, totalItems } = useNav();
  const Icon = bag ? ShoppingBag : ShoppingCart;
  return (
    <button onClick={openCart} className={iconBtn} aria-label={`Open cart, ${totalItems} item${totalItems === 1 ? "" : "s"}`}>
      <Icon className="h-5 w-5" />
      {withLabel && <span className="hidden text-sm font-semibold xl:inline">Cart</span>}
      <CountBadge n={totalItems} />
    </button>
  );
}

/** Desktop category links with animated sub-category dropdowns. */
export function CategoryLinks({ max = 7, className = "", linkClass = "" }: { max?: number; className?: string; linkClass?: string }) {
  const { categories, homeHref, activeCategory, opts } = useNav();
  const [open, setOpen] = useState<string | null>(null);
  if (!opts.categories || !categories.length) return null;
  const shown = categories.slice(0, max);
  return (
    <ul className={`flex items-center ${className}`} onMouseLeave={() => setOpen(null)}>
      {shown.map((cat) => (
        <li key={cat.id} className="relative" onMouseEnter={() => setOpen(cat.id)}>
          <Link
            href={`${homeHref}?category=${cat.slug}`}
            onFocus={() => setOpen(cat.id)}
            className={`relative flex items-center gap-1 px-3 py-2 text-sm font-semibold opacity-80 transition-opacity hover:opacity-100 ${activeCategory === cat.slug ? "!opacity-100" : ""} ${linkClass}`}
          >
            {cat.name}
            {cat.subcategories.length > 0 && <ChevronDown className="h-3.5 w-3.5 opacity-50" />}
            {activeCategory === cat.slug && (
              <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full" style={{ background: "var(--sf-accent)" }} />
            )}
          </Link>
          <AnimatePresence>
            {open === cat.id && cat.subcategories.length > 0 && (
              <m.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.16 }}
                className="absolute left-0 top-full z-50 min-w-56 rounded-2xl border border-surface-100 bg-white p-2 text-surface-800 shadow-2xl dark:border-surface-800 dark:bg-surface-900 dark:text-surface-200"
              >
                <Link href={`${homeHref}?category=${cat.slug}`} className="block rounded-xl px-3 py-2 text-sm font-bold hover:bg-surface-50 dark:hover:bg-surface-800">
                  All {cat.name}
                </Link>
                {cat.subcategories.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`${homeHref}?category=${cat.slug}&sub=${sub.slug}`}
                    className="block rounded-xl px-3 py-2 text-sm text-surface-600 hover:bg-surface-50 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-white"
                  >
                    {sub.name}
                  </Link>
                ))}
              </m.div>
            )}
          </AnimatePresence>
        </li>
      ))}
    </ul>
  );
}

/** Horizontal, swipeable category chips (chips & marketplace & app bars). */
export function CategoryChips({ withImages = false, className = "" }: { withImages?: boolean; className?: string }) {
  const { categories, homeHref, activeCategory, opts } = useNav();
  if (!opts.categories || !categories.length) return null;
  const chip = (active: boolean) =>
    `flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
      active
        ? "border-transparent bg-[color:var(--sf-accent)] text-[color:var(--sf-on-accent)]"
        : "border-[color:var(--nav-line)] hover:bg-[color-mix(in_srgb,currentColor_7%,transparent)]"
    }`;
  return (
    <div className={`no-scrollbar flex gap-2 overflow-x-auto ${className}`}>
      <Link href={homeHref} className={chip(!activeCategory)}>All</Link>
      {categories.map((c) => (
        <Link key={c.id} href={`${homeHref}?category=${c.slug}`} className={chip(activeCategory === c.slug)}>
          {withImages && c.cover && (
            <Image src={c.cover} alt="" width={40} height={40} className="-ml-1.5 h-6 w-6 rounded-full object-cover" />
          )}
          {c.name}
        </Link>
      ))}
    </div>
  );
}

/** Sticky or static wrapper used by most bars. */
export function Bar({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const { opts } = useNav();
  return (
    // Colours inline: the theme stylesheet's .sf-header background would win over a class
    <header
      className={`sf-header z-40 ${opts.sticky ? "sticky top-0" : "relative"} ${className}`}
      style={{ background: "var(--nav-bg)", color: "var(--nav-fg)", ...style }}
    >
      {children}
    </header>
  );
}

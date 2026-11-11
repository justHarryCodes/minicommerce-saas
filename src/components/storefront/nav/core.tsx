"use client";

// Shared pieces for the ten navigation bars: state, logo, icon buttons,
// search, category links, and the overlays (menu, cart, search) every bar
// opens. Each style in ./styles composes these into its own layout.

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, Heart, Menu, Search, ShoppingBag, ShoppingCart } from "lucide-react";
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

// Logos are often square badges with padding baked in, so they need real height to read
const LOGO_H = { sm: "h-11", md: "h-11 lg:h-14", lg: "h-11 lg:h-[60px]" } as const;
const WORD_SIZE = { sm: "text-xl", md: "text-xl sm:text-2xl", lg: "text-2xl sm:text-3xl" } as const;

export function Logo({ size, className = "" }: { size?: NavOptions["logoSize"]; className?: string }) {
  const { store, homeHref, opts } = useNav();
  const s = size ?? opts.logoSize;
  return (
    <Link href={homeHref} className={`flex shrink-0 items-center ${className}`} aria-label={`${store.name} home`}>
      {store.logo_url ? (
        <Image src={store.logo_url} alt={store.name} width={280} height={96} priority className={`${LOGO_H[s]} w-auto max-w-[42vw] object-contain sm:max-w-[220px] lg:max-w-[260px]`} />
      ) : (
        <span className={`sf-display max-w-[46vw] truncate whitespace-nowrap sm:max-w-none ${WORD_SIZE[s]}`}>{store.name}</span>
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
          className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
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

/** Header action: icon with a short label (under it on phones, beside it from sm). */
export const actionBtn =
  "relative inline-flex min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-0.5 transition-colors hover:bg-[color-mix(in_srgb,currentColor_9%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--sf-accent)] sm:flex-row sm:gap-2 sm:px-3 sm:py-2";
const actionLabel = "text-[10px] font-semibold leading-none sm:text-sm sm:leading-normal";

export function SearchIcon() {
  const { openSearch, opts } = useNav();
  if (opts.search === "hidden") return null;
  return (
    <button onClick={openSearch} className={actionBtn} aria-label="Search">
      <Search className="h-5 w-5" />
      <span className={actionLabel}>Search</span>
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

export function SavedButton(_: { withLabel?: boolean } = {}) {
  const { storeBase, bookmarkCount } = useNav();
  return (
    <Link href={`${storeBase}/saved`} className={actionBtn} aria-label={`Saved items, ${bookmarkCount}`}>
      <span className="relative">
        <Heart className="h-5 w-5" />
        <CountBadge n={bookmarkCount} />
      </span>
      <span className={actionLabel}>Saved</span>
    </Link>
  );
}

export function CartButton({ bag = false }: { withLabel?: boolean; bag?: boolean }) {
  const { openCart, totalItems } = useNav();
  const Icon = bag ? ShoppingBag : ShoppingCart;
  return (
    <button onClick={openCart} className={actionBtn} aria-label={`Open cart, ${totalItems} item${totalItems === 1 ? "" : "s"}`}>
      <span className="relative">
        <Icon className="h-5 w-5" />
        <CountBadge n={totalItems} />
      </span>
      <span className={actionLabel}>Cart</span>
    </button>
  );
}

/** Scroll state of a horizontal rail: whether there is more to either side. */
function useRailEdges<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);
  const nudge = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.7, behavior: "smooth" });
  return { ref, edges, nudge };
}

/** Bring the selected category into view inside its rail. */
function useActiveIntoView(rail: React.RefObject<HTMLElement | null>, active: string | null) {
  useEffect(() => {
    const r = rail.current;
    const el = r?.querySelector<HTMLElement>("[data-active='true']");
    if (!r || !el) return;
    r.scrollLeft = el.offsetLeft - r.clientWidth / 2 + el.clientWidth / 2;
  }, [rail, active]);
}

const railArrow =
  "absolute top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-[color:var(--nav-line)] bg-[color:var(--nav-bg)] shadow-sm backdrop-blur";

/** Desktop category links: every category on one line, scrolling sideways
 *  when they don't fit, with sub-category dropdowns. */
export function CategoryLinks({ max = Infinity, className = "", linkClass = "" }: { max?: number; className?: string; linkClass?: string }) {
  const { categories, homeHref, activeCategory, opts } = useNav();
  const { ref, edges, nudge } = useRailEdges<HTMLUListElement>();
  const [open, setOpen] = useState<{ id: string; left: number; top: number } | null>(null);
  const [host, setHost] = useState<Element | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useActiveIntoView(ref, activeCategory);

  // Dropdowns render outside the scrolling list (which would clip them),
  // inside the storefront wrapper so theme colours still apply.
  useEffect(() => setHost(ref.current?.closest(".storefront") ?? document.body), [ref]);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(null);
    const list = ref.current;
    window.addEventListener("scroll", close, { passive: true });
    list?.addEventListener("scroll", close, { passive: true });
    return () => {
      window.removeEventListener("scroll", close);
      list?.removeEventListener("scroll", close);
    };
  }, [open, ref]);

  if (!opts.categories || !categories.length) return null;
  const shown = Number.isFinite(max) ? categories.slice(0, max) : categories;
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(null), 140);
  };
  const show = (id: string, el: HTMLElement) => {
    cancelClose();
    const r = el.getBoundingClientRect();
    setOpen({ id, left: Math.max(8, Math.min(r.left, window.innerWidth - 240)), top: r.bottom });
  };
  const openCat = open ? shown.find((c) => c.id === open.id) : null;
  const fade = (side: boolean, from: string, to: string) => (side ? `${from}, ${to}` : "black");

  return (
    <div className={`relative min-w-0 ${className}`}>
      <ul
        ref={ref}
        className="no-scrollbar flex min-w-0 items-center overflow-x-auto"
        style={{
          maskImage: `linear-gradient(to right, ${fade(edges.left, "transparent", "black 48px")}, ${fade(edges.right, "black calc(100% - 48px)", "transparent")})`,
        }}
        onMouseLeave={scheduleClose}
      >
        {shown.map((cat) => (
          <li key={cat.id} className="shrink-0" onMouseEnter={(e) => (cat.subcategories.length ? show(cat.id, e.currentTarget) : setOpen(null))}>
            <Link
              href={`${homeHref}?category=${cat.slug}`}
              data-active={activeCategory === cat.slug}
              onFocus={(e) => (cat.subcategories.length ? show(cat.id, e.currentTarget) : setOpen(null))}
              className={`relative flex items-center gap-1 whitespace-nowrap px-3 py-2 text-sm font-semibold opacity-80 transition-opacity hover:opacity-100 ${activeCategory === cat.slug ? "!opacity-100" : ""} ${linkClass}`}
            >
              {cat.name}
              {cat.subcategories.length > 0 && <ChevronDown className="h-3.5 w-3.5 opacity-50" />}
              {activeCategory === cat.slug && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full" style={{ background: "var(--sf-accent)" }} />
              )}
            </Link>
          </li>
        ))}
      </ul>
      {edges.left && (
        <button type="button" onClick={() => nudge(-1)} aria-label="Scroll categories left" className={`${railArrow} -left-1`}>
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {edges.right && (
        <button type="button" onClick={() => nudge(1)} aria-label="Scroll categories right" className={`${railArrow} -right-1`}>
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      {host &&
        createPortal(
          <AnimatePresence>
            {open && openCat && (
              <m.div
                key={openCat.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.16 }}
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
                style={{ position: "fixed", left: open.left, top: open.top }}
                className="z-50 min-w-56 rounded-2xl border border-surface-100 bg-white p-2 text-surface-800 shadow-2xl dark:border-surface-800 dark:bg-surface-900 dark:text-surface-200"
              >
                <Link href={`${homeHref}?category=${openCat.slug}`} onClick={() => setOpen(null)} className="block rounded-xl px-3 py-2 text-sm font-bold hover:bg-surface-50 dark:hover:bg-surface-800">
                  All {openCat.name}
                </Link>
                {openCat.subcategories.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`${homeHref}?category=${openCat.slug}&sub=${sub.slug}`}
                    onClick={() => setOpen(null)}
                    className="block rounded-xl px-3 py-2 text-sm text-surface-600 hover:bg-surface-50 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-white"
                  >
                    {sub.name}
                  </Link>
                ))}
              </m.div>
            )}
          </AnimatePresence>,
          host,
        )}
    </div>
  );
}

/** Phone category rail under the header: every category as a swipeable
 *  tab, the current one underlined and scrolled into view. */
export function CategoryRail({ className = "", plain = false }: { className?: string; plain?: boolean }) {
  const { categories, homeHref, activeCategory, isHome, opts } = useNav();
  const ref = useRef<HTMLElement>(null);
  useActiveIntoView(ref, activeCategory);
  if (!opts.categories || !categories.length) return null;
  const allActive = isHome && !activeCategory;
  const tab = (active: boolean) =>
    `relative flex h-10 shrink-0 items-center whitespace-nowrap px-3 text-[13px] font-semibold transition-opacity ${active ? "opacity-100" : "opacity-70 hover:opacity-100"}`;
  const bar = <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full" style={{ background: "var(--sf-accent)" }} />;
  return (
    <nav ref={ref} aria-label="Categories" className={`no-scrollbar flex overflow-x-auto px-1 ${plain ? "" : "border-t border-[color:var(--nav-line)]"} ${className}`}>
      <Link href={homeHref} data-active={allActive} className={tab(allActive)}>
        All
        {allActive && bar}
      </Link>
      {categories.map((c) => (
        <Link key={c.id} href={`${homeHref}?category=${c.slug}`} data-active={activeCategory === c.slug} className={tab(activeCategory === c.slug)}>
          {c.name}
          {activeCategory === c.slug && bar}
        </Link>
      ))}
    </nav>
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

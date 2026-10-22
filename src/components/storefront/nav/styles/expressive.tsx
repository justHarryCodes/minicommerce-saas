"use client";

// Floating pill, Mega menu, Full-screen drawer, App-style tabs and the
// see-through Overlay bar — the statement navigation styles.
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import dynamic from "next/dynamic";
import { ArrowRight, ChevronDown, Grid2X2, Heart, Home, Search, ShoppingBag, X } from "lucide-react";
import {
  Bar, CartButton, CategoryLinks, CountBadge, Logo, MenuButton, SavedButton, SearchBar, SearchIcon, iconBtn, toneStyle, useNav,
} from "../core";
import { MobileRow } from "./basic";

const CategorySheet = dynamic(() => import("../CategorySheet"), { ssr: false });
import { useStore } from "@/lib/store-context";

/** 4 · Floating — a rounded pill that hovers over the page and tightens on scroll. */
export function FloatingNav() {
  const { opts, scrolled } = useNav();
  return (
    <header className={`sf-header z-40 px-3 pt-3 lg:px-6 ${opts.sticky ? "sticky top-0" : "relative"}`} style={{ background: "transparent" }}>
      <m.div
        animate={{ maxWidth: scrolled ? 960 : 1180, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="mx-auto rounded-full border border-[color:var(--nav-line)] shadow-[0_10px_40px_-12px_rgba(0,0,0,.25)]"
        style={{ ...toneStyle(opts.tone), background: opts.tone === "page" ? "color-mix(in srgb, var(--sf-page) 82%, transparent)" : "var(--nav-bg)", color: "var(--nav-fg)", backdropFilter: "blur(18px)" }}
      >
        <div className="flex h-14 items-center gap-2 pl-4 pr-1.5 lg:h-16 lg:pl-6">
          <div className="lg:hidden">
            <MenuButton />
          </div>
          <Logo size="sm" />
          <CategoryLinks max={5} className="mx-auto hidden lg:flex" />
          <div className="ml-auto flex items-center lg:ml-0">
            <SearchIcon />
            <span className="hidden sm:inline-flex">
              <SavedButton />
            </span>
            <CartButton bag />
          </div>
        </div>
      </m.div>
    </header>
  );
}

/** 5 · Mega — a full-width panel with every category, its sub-categories and a photo. */
export function MegaNav() {
  const { opts, categories, homeHref } = useNav();
  const [open, setOpen] = useState(false);
  return (
    <Bar className="border-b border-[color:var(--nav-line)]" style={toneStyle(opts.tone)}>
      <MobileRow />
      <div className="relative hidden lg:block" onMouseLeave={() => setOpen(false)}>
        <div className="mx-auto flex h-[76px] max-w-7xl items-center gap-8 px-6">
          <Logo />
          <button
            onMouseEnter={() => setOpen(true)}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex items-center gap-1.5 text-sm font-bold"
          >
            Shop <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          <CategoryLinks max={4} />
          <div className="ml-auto flex items-center gap-0.5">
            {opts.search === "bar" ? <SearchBar className="w-64" /> : <SearchIcon />}
            <SavedButton />
            <CartButton />
          </div>
        </div>
        <AnimatePresence>
          {open && categories.length > 0 && (
            <m.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-x-0 top-full z-50 border-t border-surface-100 bg-white text-surface-800 shadow-2xl dark:border-surface-800 dark:bg-surface-950 dark:text-surface-200"
            >
              <div className="mx-auto grid max-w-7xl grid-cols-[1fr_320px] gap-10 px-6 py-8">
                <div className="grid grid-cols-3 gap-x-8 gap-y-6 xl:grid-cols-4">
                  {categories.slice(0, 12).map((c) => (
                    <div key={c.id}>
                      <Link href={`${homeHref}?category=${c.slug}`} onClick={() => setOpen(false)} className="sf-display text-base hover:underline">
                        {c.name}
                      </Link>
                      <ul className="mt-2 space-y-1.5">
                        {c.subcategories.slice(0, 5).map((s) => (
                          <li key={s.id}>
                            <Link href={`${homeHref}?category=${c.slug}&sub=${s.slug}`} onClick={() => setOpen(false)} className="text-sm text-surface-500 hover:text-surface-900 dark:hover:text-white">
                              {s.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <FeaturedTile onNavigate={() => setOpen(false)} />
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </Bar>
  );
}

function FeaturedTile({ onNavigate }: { onNavigate: () => void }) {
  const { categories, homeHref } = useNav();
  const c = categories.find((x) => x.cover) ?? categories[0];
  if (!c) return null;
  return (
    <Link href={`${homeHref}?category=${c.slug}`} onClick={onNavigate} className="group relative block overflow-hidden" style={{ borderRadius: "var(--sf-radius)" }}>
      {c.cover ? (
        <Image src={c.cover} alt="" width={640} height={480} className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
      ) : (
        <div className="aspect-[4/3] w-full" style={{ background: "var(--sf-accent)" }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <p className="text-xs uppercase tracking-[0.2em] opacity-80">Featured</p>
        <p className="sf-display mt-1 flex items-center gap-2 text-2xl">
          {c.name} <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </p>
      </div>
    </Link>
  );
}

/** 6 · Drawer — a quiet bar; "Menu" opens a full-screen, editorial menu. */
export function DrawerNav() {
  const { opts, categories, homeHref, storeBase } = useNav();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const preview = categories.find((c) => c.id === hover)?.cover ?? categories.find((c) => c.cover)?.cover ?? null;
  return (
    <>
      <Bar className="border-b border-[color:var(--nav-line)]" style={toneStyle(opts.tone)}>
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-3 lg:h-20 lg:px-8">
          <button onClick={() => setOpen(true)} className={`${iconBtn} justify-self-start`} aria-label="Open menu">
            <span className="flex flex-col gap-1.5">
              <span className="block h-px w-6 bg-current" />
              <span className="block h-px w-4 bg-current" />
            </span>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.25em] sm:inline">Menu</span>
          </button>
          <Logo />
          <div className="flex items-center justify-self-end">
            <SearchIcon />
            <span className="hidden sm:inline-flex">
              <SavedButton />
            </span>
            <CartButton bag />
          </div>
        </div>
      </Bar>
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[60] overflow-y-auto bg-surface-950 text-white"
            role="dialog"
            aria-label="Menu"
          >
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:h-20 lg:px-8">
              <span className="text-xs uppercase tracking-[0.3em] opacity-60">Menu</span>
              <button onClick={() => setOpen(false)} className={iconBtn} aria-label="Close menu">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-16 pt-6 lg:grid-cols-[1fr_420px] lg:px-8">
              <nav>
                <ul className="space-y-1">
                  {[{ id: "all", name: "Shop all", href: homeHref, cover: null }, ...categories.map((c) => ({ id: c.id, name: c.name, href: `${homeHref}?category=${c.slug}`, cover: c.cover }))].map((item, i) => (
                    <m.li
                      key={item.id}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + i * 0.05, duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        onMouseEnter={() => setHover(item.id)}
                        className="sf-display group flex items-baseline gap-4 py-1.5 text-4xl opacity-70 transition-opacity hover:opacity-100 sm:text-5xl lg:text-6xl"
                      >
                        <span className="text-xs tabular-nums opacity-50">{String(i + 1).padStart(2, "0")}</span>
                        {item.name}
                      </Link>
                    </m.li>
                  ))}
                </ul>
                <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm opacity-70">
                  <Link href={`${storeBase}/track`} onClick={() => setOpen(false)}>Track order</Link>
                  <Link href={`${storeBase}/reels`} onClick={() => setOpen(false)}>Reels</Link>
                  <a href={`${homeHref}#saved-items`} onClick={() => setOpen(false)}>Saved</a>
                </div>
              </nav>
              <div className="relative hidden aspect-[4/5] overflow-hidden lg:block" style={{ borderRadius: "var(--sf-radius)" }}>
                <AnimatePresence mode="wait">
                  {preview && (
                    <m.div key={preview} initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0">
                      <Image src={preview} alt="" fill sizes="420px" className="object-cover" />
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** 7 · App — slim top bar; on phones a bottom tab bar with a categories sheet. */
export function AppNav() {
  const { opts, categories, homeHref, totalItems, bookmarkCount, openCart, openSearch, isHome } = useNav();
  const pathname = usePathname();
  const [sheet, setSheet] = useState(false);
  const [sheetUsed, setSheetUsed] = useState(false);
  // Product pages and checkout have their own bottom action bar
  const showTabs = !/\/(products|checkout|receipt|reels)\//.test(`${pathname}/`);
  const tab = "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold";
  return (
    <>
      <Bar className="border-b border-[color:var(--nav-line)]" style={toneStyle(opts.tone)}>
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 lg:h-16 lg:px-6">
          <Logo size="sm" />
          {opts.search !== "hidden" && <SearchBar className="ml-2 hidden h-10 flex-1 lg:flex" />}
          <CategoryLinks max={5} className="hidden xl:flex" />
          <div className="ml-auto flex items-center">
            <span className="lg:hidden">
              <SearchIcon />
            </span>
            <span className="hidden lg:inline-flex">
              <SavedButton />
            </span>
            <CartButton />
          </div>
        </div>
      </Bar>

      {showTabs && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-surface-200/70 bg-white/95 pb-[env(safe-area-inset-bottom)] text-surface-500 backdrop-blur-xl dark:border-surface-800 dark:bg-surface-950/95 lg:hidden"
          aria-label="Shop navigation"
        >
          <Link href={homeHref} className={`${tab} ${isHome ? "text-[color:var(--sf-accent-ink)]" : ""}`}>
            <Home className="h-5 w-5" /> Home
          </Link>
          <button onClick={() => { setSheetUsed(true); setSheet(true); }} className={tab}>
            <Grid2X2 className="h-5 w-5" /> Categories
          </button>
          <button onClick={openSearch} className={tab}>
            <Search className="h-5 w-5" /> Search
          </button>
          <a href={`${homeHref}#saved-items`} className={`${tab} relative`}>
            <span className="relative">
              <Heart className="h-5 w-5" />
              <CountBadge n={bookmarkCount} />
            </span>
            Saved
          </a>
          <button onClick={openCart} className={tab}>
            <span className="relative">
              <ShoppingBag className="h-5 w-5" />
              <CountBadge n={totalItems} />
            </span>
            Cart
          </button>
        </nav>
      )}

      {/* Mounted on first open — the sheet library loads then */}
      {sheetUsed && <CategorySheet open={sheet} onOpenChange={setSheet} categories={categories} homeHref={homeHref} />}
    </>
  );
}

/** 8 · Overlay — see-through over a full-bleed hero, solid once you scroll. */
export function OverlayNav() {
  const { opts, scrolled, isHome, activeCategory } = useNav();
  const { theme } = useStore();
  // Only see-through where there's a full-bleed photo underneath it
  const overImage = isHome && !activeCategory && theme.layout.hero === "fullbleed" && theme.layout.sections[0] === "hero";
  const clear = overImage && !scrolled;
  return (
    <header
      className={`sf-header z-40 transition-[background-color,border-color,color] duration-300 ${
        overImage ? "fixed inset-x-0 top-0" : opts.sticky ? "sticky top-0" : "relative"
      } ${clear ? "border-b border-transparent" : "border-b border-[color:var(--nav-line)] backdrop-blur-xl"}`}
      style={{ ...toneStyle(opts.tone, clear), background: "var(--nav-bg)", color: "var(--nav-fg)" }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-3 lg:h-20 lg:px-8">
        <div className="lg:hidden">
          <MenuButton />
        </div>
        <Logo />
        <CategoryLinks max={5} className="mx-auto hidden lg:flex" linkClass="!text-[13px] uppercase tracking-[0.18em]" />
        <div className="ml-auto flex items-center lg:ml-0">
          <SearchIcon />
          <span className="hidden sm:inline-flex">
            <SavedButton />
          </span>
          <CartButton bag />
        </div>
      </div>
    </header>
  );
}


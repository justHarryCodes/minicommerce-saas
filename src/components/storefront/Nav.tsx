"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  ShoppingCart,
  X,
  ChevronRight,
  ChevronDown,
  Heart,
  Search,
  Film,
  Package,
  Home,
  MessageCircle,
  Phone,
} from "lucide-react";
import { useCart } from "./CartProvider";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useStore } from "@/lib/store-context";
import CartDrawer from "./CartDrawer";
import SearchOverlay from "./SearchOverlay";
import type { Store, Category } from "@/types";

interface CategoryWithSubs extends Category {
  subcategories: Category[];
}

interface Props {
  store: Store;
  categories: CategoryWithSubs[];
}

/** How many top-level categories sit in the desktop bar before "More". */
const MAX_BAR_CATEGORIES = 7;

const iconBtn =
  "relative flex items-center gap-2 rounded-xl p-2 text-surface-700 transition-colors hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800";

function CountBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span
      className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold"
      style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}
    >
      {n > 9 ? "9+" : n}
    </span>
  );
}

function Logo({ store, height = "h-9" }: { store: Store; height?: string }) {
  return store.logo_url ? (
    <Image
      src={store.logo_url}
      alt={store.name}
      width={160}
      height={48}
      className={`${height} w-auto object-contain`}
    />
  ) : (
    <span className="text-lg font-black tracking-tight text-surface-900 dark:text-white">
      {store.name}
    </span>
  );
}

export default function StorefrontNav({ store, categories }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { totalItems } = useCart();
  const { count: bookmarkCount } = useBookmarks(store.slug);
  const { storeBase, theme } = useStore();
  const variant = theme.layout.header;
  const homeHref = storeBase || "/";

  const barCategories = categories.slice(0, MAX_BAR_CATEGORIES);
  const moreCategories = categories.slice(MAX_BAR_CATEGORIES);

  const whatsappHref = store.whatsapp
    ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}`
    : null;
  const hasContact = Boolean(whatsappHref || store.phone);

  // Lock page scroll + close on Escape while the drawer is open.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  // Category links (with hover sub-menus), shared by every desktop header.
  const categoryList = (className: string, linkClass = "") => (
    <ul className={className}>
              {barCategories.map((cat) => (
                <li key={cat.id} className="group relative">
                  <Link
                    href={`${homeHref}?category=${cat.slug}`}
                    className={`flex items-center gap-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-surface-700 transition-colors hover:text-surface-900 dark:text-surface-300 dark:hover:text-white ${linkClass}`}
                  >
                    {cat.name}
                    {cat.subcategories.length > 0 && (
                      <ChevronDown className="h-3.5 w-3.5 opacity-50 transition-transform group-hover:rotate-180" />
                    )}
                  </Link>

                  {cat.subcategories.length > 0 && (
                    <div className="invisible absolute left-0 top-full z-50 min-w-56 translate-y-1 rounded-2xl border border-surface-100 bg-white p-2 opacity-0 shadow-xl transition-all duration-150 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 dark:border-surface-800 dark:bg-surface-900">
                      <Link
                        href={`${homeHref}?category=${cat.slug}`}
                        className="block rounded-xl px-3 py-2 text-sm font-bold text-surface-900 hover:bg-surface-50 dark:text-white dark:hover:bg-surface-800"
                      >
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
                    </div>
                  )}
                </li>
              ))}

              {moreCategories.length > 0 && (
                <li className="group relative">
                  <button className="flex items-center gap-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-surface-700 dark:text-surface-300">
                    More
                    <ChevronDown className="h-3.5 w-3.5 opacity-50 transition-transform group-hover:rotate-180" />
                  </button>
                  <div className="invisible absolute left-0 top-full z-50 min-w-52 translate-y-1 rounded-2xl border border-surface-100 bg-white p-2 opacity-0 shadow-xl transition-all duration-150 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 dark:border-surface-800 dark:bg-surface-900">
                    {moreCategories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`${homeHref}?category=${cat.slug}`}
                        className="block rounded-xl px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </li>
              )}
    </ul>
  );

  const searchButton = (
    <button onClick={() => setSearchOpen(true)} className={iconBtn} aria-label="Search products">
      <Search className="h-5 w-5" />
    </button>
  );
  const savedLink = (
    <a href={`${homeHref}#saved-items`} className={iconBtn} aria-label="Saved items">
      <Heart className="h-5 w-5" />
      <CountBadge n={bookmarkCount} />
    </a>
  );
  const cartButton = (
    <button onClick={() => setCartOpen(true)} className={iconBtn} aria-label="Open cart">
      <ShoppingCart className="h-5 w-5" />
      <CountBadge n={totalItems} />
    </button>
  );

  return (
    <>
      {/* Sticky (not fixed): no top padding needed on the layout wrapper. */}
      <header className="sf-header sticky top-0 z-40 border-b border-surface-200/60 backdrop-blur-md dark:border-surface-800">
        {/* ── Desktop utility strip (only if the store has contact info) ───── */}
        {variant === "standard" && hasContact && (
          <div className="hidden bg-surface-900 text-xs text-white/75 dark:bg-black lg:block">
            <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-6">
              <span>Questions about an item? Message the store.</span>
              <div className="flex items-center gap-5">
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-white"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
                {store.phone && (
                  <a
                    href={`tel:${store.phone}`}
                    className="flex items-center gap-1.5 hover:text-white"
                  >
                    <Phone className="h-3.5 w-3.5" /> {store.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Mobile header ─────────────────────────────────────────────────── */}
        <div className="lg:hidden">
          <div className="relative flex h-14 items-center justify-between px-4">
            <button
              onClick={() => setMenuOpen(true)}
              className="-ml-2 rounded-xl p-2 text-surface-700 transition-colors hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            <Link
              href={homeHref}
              className="absolute left-1/2 flex -translate-x-1/2 items-center"
            >
              <Logo store={store} />
            </Link>

            <div className="-mr-2 flex items-center">
              {variant !== "standard" && searchButton}
              <a
                href={`${homeHref}#saved-items`}
                className={iconBtn}
                aria-label="Saved items"
              >
                <Heart className="h-5 w-5" />
                <CountBadge n={bookmarkCount} />
              </a>
              <button
                onClick={() => setCartOpen(true)}
                className={iconBtn}
                aria-label="Open cart"
              >
                <ShoppingCart className="h-5 w-5" />
                <CountBadge n={totalItems} />
              </button>
            </div>
          </div>

          {variant === "standard" && (
          <div className="px-4 pb-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-10 w-full items-center gap-2.5 rounded-full bg-surface-100 px-4 text-sm text-surface-500 dark:bg-surface-800 dark:text-surface-400"
              aria-label="Search products"
            >
              <Search className="h-4 w-4" />
              Search products
            </button>
          </div>
          )}
        </div>

        {variant === "standard" && (<>
        {/* ── Desktop main row: logo · search · actions ────────────────────── */}
        <div className="mx-auto hidden h-[72px] max-w-7xl items-center gap-8 px-6 lg:flex">
          <Link href={homeHref} className="flex shrink-0 items-center">
            <Logo store={store} height="h-10" />
          </Link>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-11 flex-1 items-center gap-3 rounded-full border border-surface-200 bg-surface-50 px-5 text-sm text-surface-500 transition-colors hover:border-surface-300 hover:bg-white dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-800"
            aria-label="Search products"
          >
            <Search className="h-4 w-4" />
            <span>Search products in {store.name}</span>
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <a href={`${homeHref}#saved-items`} className={iconBtn}>
              <Heart className="h-5 w-5" />
              <span className="hidden text-sm font-semibold xl:inline">
                Saved
              </span>
              <CountBadge n={bookmarkCount} />
            </a>
            <button onClick={() => setCartOpen(true)} className={iconBtn}>
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden text-sm font-semibold xl:inline">
                Cart
              </span>
              <CountBadge n={totalItems} />
            </button>
          </div>
        </div>

        {/* ── Desktop category bar ─────────────────────────────────────────── */}
        <div className="hidden border-t border-surface-100 dark:border-surface-800 lg:block">
          <div className="mx-auto flex h-12 max-w-7xl items-center gap-2 px-6">
            <button
              onClick={() => setMenuOpen(true)}
              className="mr-2 flex items-center gap-2 rounded-xl bg-surface-900 px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
            >
              <Menu className="h-4 w-4" />
              All categories
            </button>

            {categoryList("flex items-center")}

            <div className="ml-auto flex items-center gap-1">
              <Link
                href={`${storeBase}/reels`}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-surface-700 hover:text-surface-900 dark:text-surface-300 dark:hover:text-white"
              >
                <Film className="h-4 w-4" />
                Reels
              </Link>
              <Link
                href={`${storeBase}/track`}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-surface-700 hover:text-surface-900 dark:text-surface-300 dark:hover:text-white"
              >
                <Package className="h-4 w-4" />
                Track order
              </Link>
            </div>
          </div>
        </div>
        </>)}

        {/* ── Desktop: centred logo (boutique / fashion) ───────────────────── */}
        {variant === "centered" && (
          <div className="hidden lg:block">
            <div className="mx-auto grid h-20 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-6">
              <div className="flex items-center gap-1">
                <button onClick={() => setMenuOpen(true)} className={iconBtn} aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                  <span className="text-sm font-semibold">Menu</span>
                </button>
                {searchButton}
              </div>
              <Link href={homeHref} className="flex items-center justify-center">
                {store.logo_url ? (
                  <Logo store={store} height="h-11" />
                ) : (
                  <span className="sf-display text-2xl text-surface-900 dark:text-white">{store.name}</span>
                )}
              </Link>
              <div className="flex items-center justify-end gap-1">
                {savedLink}
                {cartButton}
              </div>
            </div>
            {categories.length > 0 && (
              <div className="border-t border-surface-200/60 dark:border-surface-800">
                <div className="mx-auto flex h-12 max-w-7xl items-center justify-center px-6">
                  {categoryList("flex items-center gap-2", "!text-xs uppercase tracking-[0.14em]")}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Desktop: single slim row ─────────────────────────────────────── */}
        {variant === "minimal" && (
          <div className="mx-auto hidden h-[72px] max-w-7xl items-center gap-6 px-6 lg:flex">
            <Link href={homeHref} className="flex shrink-0 items-center">
              {store.logo_url ? (
                <Logo store={store} height="h-10" />
              ) : (
                <span className="sf-display text-xl text-surface-900 dark:text-white">{store.name}</span>
              )}
            </Link>
            <div className="min-w-0 flex-1">{categoryList("flex items-center")}</div>
            <div className="flex shrink-0 items-center gap-1">
              {searchButton}
              {savedLink}
              {cartButton}
            </div>
          </div>
        )}
      </header>

      {/* ─── Menu drawer (mobile menu + desktop "All categories") ───────────── */}
      <div
        className={`fixed inset-0 z-50 ${menuOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!menuOpen}
      >
        <div
          onClick={closeMenu}
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          role="dialog"
          aria-label="Menu"
          className={`absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-surface-900 ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-surface-100 px-5 py-4 dark:border-surface-800">
            <Logo store={store} height="h-8" />
            <button
              onClick={closeMenu}
              className="rounded-xl p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Quick links */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: homeHref, label: "All products", icon: Home },
                { href: `${storeBase}/reels`, label: "Reels", icon: Film },
                {
                  href: `${storeBase}/track`,
                  label: "Track order",
                  icon: Package,
                },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={closeMenu}
                  className="flex items-center gap-2.5 rounded-xl bg-surface-50 px-3 py-3 text-sm font-semibold text-surface-900 transition-colors hover:bg-surface-100 dark:bg-surface-800 dark:text-white dark:hover:bg-surface-700"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
              <a
                href={`${homeHref}#saved-items`}
                onClick={closeMenu}
                className="flex items-center gap-2.5 rounded-xl bg-surface-50 px-3 py-3 text-sm font-semibold text-surface-900 transition-colors hover:bg-surface-100 dark:bg-surface-800 dark:text-white dark:hover:bg-surface-700"
              >
                <Heart className="h-4 w-4" />
                Saved
                {bookmarkCount > 0 && (
                  <span
                    className="ml-auto rounded-full px-2 py-0.5 text-xs font-bold"
                    style={{ background: "var(--sf-accent)", color: "var(--sf-on-accent)" }}
                  >
                    {bookmarkCount}
                  </span>
                )}
              </a>
            </div>

            {/* Categories (accordion) */}
            {categories.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 px-3 text-sm font-bold text-surface-900 dark:text-white">
                  Shop by category
                </p>
                {categories.map((cat) => {
                  const hasSubs = cat.subcategories.length > 0;
                  const open = expanded === cat.id;
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800">
                        <Link
                          href={`${homeHref}?category=${cat.slug}`}
                          onClick={closeMenu}
                          className="flex-1 px-3 py-3 text-sm font-medium text-surface-800 dark:text-surface-200"
                        >
                          {cat.name}
                        </Link>
                        {hasSubs && (
                          <button
                            onClick={() => setExpanded(open ? null : cat.id)}
                            className="p-3 text-surface-400"
                            aria-expanded={open}
                            aria-label={`${open ? "Collapse" : "Expand"} ${cat.name}`}
                          >
                            <ChevronRight
                              className={`h-4 w-4 transition-transform ${
                                open ? "rotate-90" : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>
                      {hasSubs && open && (
                        <div className="mb-1 ml-3 border-l border-surface-100 pl-3 dark:border-surface-800">
                          <Link
                            href={`${homeHref}?category=${cat.slug}`}
                            onClick={closeMenu}
                            className="block rounded-lg px-3 py-2 text-sm font-semibold text-surface-900 dark:text-white"
                          >
                            All {cat.name}
                          </Link>
                          {cat.subcategories.map((sub) => (
                            <Link
                              key={sub.id}
                              href={`${homeHref}?category=${cat.slug}&sub=${sub.slug}`}
                              onClick={closeMenu}
                              className="block rounded-lg px-3 py-2 text-sm text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white"
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {hasContact && (
            <div className="border-t border-surface-100 p-5 dark:border-surface-800">
              <p className="mb-3 text-sm font-bold text-surface-900 dark:text-white">
                Need help?
              </p>
              <div className="flex flex-wrap gap-2">
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                )}
                {store.phone && (
                  <a
                    href={`tel:${store.phone}`}
                    className="flex items-center gap-2 rounded-full bg-surface-100 px-4 py-2 text-sm font-semibold text-surface-800 dark:bg-surface-800 dark:text-surface-200"
                  >
                    <Phone className="h-4 w-4" /> Call
                  </a>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        store={store}
      />

      {searchOpen && (
        <SearchOverlay
          storeSlug={store.slug}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </>
  );
}

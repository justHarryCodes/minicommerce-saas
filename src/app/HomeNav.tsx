"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  Menu,
  X,
  ArrowRight,
  Search,
  ChevronDown,
  Store,
  ShoppingBag,
  Rocket,
  Gift,
  BookOpen,
  FileText,
  Scale,
  TrendingUp,
  Banknote,
  CornerDownLeft,
} from "lucide-react";

/* ─────────────────────────────── Menu config ─────────────────────────────── */

interface NavItem {
  href: string;
  title: string;
  desc?: string;
  icon?: LucideIcon;
  emoji?: string;
}

interface NavSection {
  title?: string;
  layout: "list" | "chips";
  items: NavItem[];
}

interface NavPromo {
  title: string;
  text: string;
  cta: string;
  href: string;
}

interface NavGroup {
  id: string;
  label: string;
  width: string; // tailwind width class for desktop panel
  sections: NavSection[];
  promo?: NavPromo;
  matches: string[]; // pathname prefixes that mark this group active
}

const CATEGORY_LINKS: NavItem[] = [
  { title: "Fashion", emoji: "👗", cat: "Fashion and Clothing" },
  { title: "Beauty", emoji: "💄", cat: "Beauty and Makeup" },
  { title: "Food", emoji: "🍽️", cat: "Food and Catering" },
  { title: "Electronics", emoji: "⚡", cat: "Electronics and Gadgets" },
  { title: "Phones", emoji: "📱", cat: "Phones and Accessories" },
  { title: "Hair", emoji: "💇", cat: "Hair and Wigs" },
  { title: "Shoes", emoji: "👟", cat: "Shoes and Sneakers" },
  { title: "Home", emoji: "🛋️", cat: "Furniture and Home" },
].map(({ title, emoji, cat }) => ({
  title,
  emoji,
  href: `/discover?category=${encodeURIComponent(cat)}`,
}));

const GROUPS: NavGroup[] = [
  {
    id: "marketplace",
    label: "Marketplace",
    width: "w-[600px]",
    matches: ["/discover"],
    sections: [
      {
        title: "Explore",
        layout: "list",
        items: [
          {
            href: "/discover",
            title: "Browse stores",
            desc: "Find trusted vendors across Nigeria",
            icon: Store,
          },
          {
            href: "/discover?tab=products",
            title: "Browse products",
            desc: "Shop items from every store",
            icon: ShoppingBag,
          },
        ],
      },
      { title: "Popular categories", layout: "chips", items: CATEGORY_LINKS },
    ],
  },
  {
    id: "sell",
    label: "Sell on Duka",
    width: "w-[640px]",
    matches: ["/affiliate"],
    sections: [
      {
        title: "For vendors",
        layout: "list",
        items: [
          {
            href: "/#for-vendors",
            title: "Why sell on Duka",
            desc: "Store, checkout, dashboard and reach",
            icon: TrendingUp,
          },
          {
            href: "/auth/signup",
            title: "Create your free store",
            desc: "Live in about 10 minutes",
            icon: Rocket,
          },
          {
            href: "/affiliate",
            title: "Affiliate program",
            desc: "Earn ₦2,000 per vendor you refer",
            icon: Gift,
          },
        ],
      },
    ],
    promo: {
      title: "Turn your DMs into a real store",
      text: "Branded storefront, Paystack checkout and a marketplace of shoppers. Free to start.",
      cta: "Start selling",
      href: "/auth/signup",
    },
  },
  {
    id: "resources",
    label: "Resources",
    width: "w-80",
    matches: ["/resources", "/terms"],
    sections: [
      {
        layout: "list",
        items: [
          {
            href: "/resources#guides",
            title: "Guides",
            desc: "Step-by-step help for your store",
            icon: BookOpen,
          },
          {
            href: "/resources#articles",
            title: "Articles",
            desc: "Tips to grow your business",
            icon: FileText,
          },
          {
            href: "/terms",
            title: "Terms",
            desc: "Our terms of service",
            icon: Scale,
          },
        ],
      },
    ],
  },
];

const DIRECT_LINKS = [{ href: "/pricing", label: "Pricing", icon: Banknote }];

/* ─────────────────────────────── Component ─────────────────────────────── */

export default function HomeNav() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Scroll shadow */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close everything when the route changes */
  useEffect(() => {
    setActiveMenu(null);
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  /* Mobile menu: lock scroll + Escape */
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /* Search overlay: focus + Escape */
  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setSearchOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [searchOpen]);

  /* Cmd/Ctrl + K opens search */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* Desktop dropdowns: outside click + Escape */
  useEffect(() => {
    if (!activeMenu) return;
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node))
        setActiveMenu(null);
    };
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setActiveMenu(null);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [activeMenu]);

  const openMenu = useCallback((id: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveMenu(id);
  }, []);

  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setActiveMenu(null), 140);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = search.trim();
    setSearchOpen(false);
    router.push(term ? `/discover?q=${encodeURIComponent(term)}` : "/discover");
  }

  const isActive = (prefixes: string[]) =>
    prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-md transition-shadow"
        style={{
          background: "color-mix(in srgb, var(--bg) 90%, transparent)",
          borderColor: "var(--border)",
          boxShadow: scrolled ? "0 4px 20px rgba(0,0,0,0.07)" : "none",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            {/* Logo */}
            <Link
              href="/"
              className="flex shrink-0 items-center"
              aria-label="Duka home"
            >
              <Image
                src="/logo.png"
                alt="Duka"
                width={108}
                height={36}
                className="h-9 w-auto object-contain"
                priority
              />
            </Link>

            {/* ───────── Desktop navigation ───────── */}
            <nav
              ref={navRef}
              aria-label="Main"
              className="hidden flex-1 items-center justify-center gap-0.5 lg:flex"
            >
              {GROUPS.map((group) => {
                const open = activeMenu === group.id;
                const active = isActive(group.matches);
                return (
                  <div
                    key={group.id}
                    className="relative"
                    onMouseEnter={() => openMenu(group.id)}
                    onMouseLeave={scheduleClose}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveMenu(open ? null : group.id)}
                      aria-haspopup="true"
                      aria-expanded={open}
                      className="flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors"
                      style={{
                        color:
                          open || active
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                        background: open ? "var(--bg-tertiary)" : "transparent",
                      }}
                    >
                      {group.label}
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                      />
                    </button>

                    {/* Dropdown panel */}
                    <div
                      className={`absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 transition-all duration-200 ${group.width} ${
                        open
                          ? "pointer-events-auto translate-y-0 opacity-100"
                          : "pointer-events-none -translate-y-1 opacity-0"
                      }`}
                    >
                      <div
                        className="overflow-hidden rounded-2xl border shadow-2xl"
                        style={{
                          background: "var(--bg)",
                          borderColor: "var(--border)",
                        }}
                      >
                        <div
                          className={`grid gap-0 ${group.promo ? "grid-cols-[1.15fr_1fr]" : group.sections.length > 1 ? "grid-cols-[1fr_1fr]" : "grid-cols-1"}`}
                        >
                          <div className="space-y-5 p-4">
                            {group.sections.map((section, i) => (
                              <div key={i}>
                                {section.title && (
                                  <p
                                    className="mb-2 px-2 text-[11px] font-bold uppercase tracking-widest"
                                    style={{ color: "var(--text-muted)" }}
                                  >
                                    {section.title}
                                  </p>
                                )}

                                {section.layout === "list" ? (
                                  <ul className="space-y-0.5">
                                    {section.items.map((item) => {
                                      const Icon = item.icon;
                                      return (
                                        <li key={item.href}>
                                          <Link
                                            href={item.href}
                                            onClick={() => setActiveMenu(null)}
                                            className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                          >
                                            {Icon && (
                                              <span
                                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                                                style={{
                                                  background:
                                                    "var(--accent-light)",
                                                }}
                                              >
                                                <Icon className="h-[18px] w-[18px] text-black" />
                                              </span>
                                            )}
                                            <span className="min-w-0">
                                              <span
                                                className="flex items-center gap-1 text-sm font-bold"
                                                style={{
                                                  color: "var(--text-primary)",
                                                }}
                                              >
                                                {item.title}
                                                <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-60" />
                                              </span>
                                              {item.desc && (
                                                <span
                                                  className="block text-xs leading-snug"
                                                  style={{
                                                    color: "var(--text-muted)",
                                                  }}
                                                >
                                                  {item.desc}
                                                </span>
                                              )}
                                            </span>
                                          </Link>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <ul className="grid grid-cols-2 gap-1">
                                    {section.items.map((item) => (
                                      <li key={item.href}>
                                        <Link
                                          href={item.href}
                                          onClick={() => setActiveMenu(null)}
                                          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                          style={{
                                            color: "var(--text-primary)",
                                          }}
                                        >
                                          <span className="text-base">
                                            {item.emoji}
                                          </span>
                                          {item.title}
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Promo card */}
                          {group.promo && (
                            <div className="p-4 pl-0">
                              <Link
                                href={group.promo.href}
                                onClick={() => setActiveMenu(null)}
                                className="group relative flex h-full flex-col justify-between overflow-hidden rounded-xl p-5"
                                style={{ background: "var(--accent)" }}
                              >
                                <span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white opacity-15" />
                                <span className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-black opacity-5" />
                                <span className="relative">
                                  <span className="mb-1.5 block text-base font-black leading-tight text-black">
                                    {group.promo.title}
                                  </span>
                                  <span className="block text-xs leading-relaxed text-black/70">
                                    {group.promo.text}
                                  </span>
                                </span>
                                <span className="relative mt-5 inline-flex w-fit items-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-xs font-bold text-white transition-transform group-hover:scale-105">
                                  {group.promo.cta}
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </span>
                              </Link>
                            </div>
                          )}
                        </div>

                        {/* Marketplace footer strip */}
                        {group.id === "marketplace" && (
                          <Link
                            href="/discover"
                            onClick={() => setActiveMenu(null)}
                            className="flex items-center justify-between border-t px-6 py-3 text-xs font-bold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{
                              borderColor: "var(--border)",
                              background: "var(--bg-secondary)",
                              color: "var(--text-primary)",
                            }}
                          >
                            See everything on Duka
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {DIRECT_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{
                      color: active
                        ? "var(--text-primary)"
                        : "var(--text-secondary)",
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* ───────── Desktop right side ───────── */}
            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search stores and products"
                className="flex items-center gap-2 rounded-full border py-2 pl-3.5 pr-2.5 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-muted)",
                  background: "var(--bg-secondary)",
                }}
              >
                <Search className="h-4 w-4" />
                <span className="hidden pr-6 xl:inline">Search…</span>
                <kbd
                  className="hidden rounded-md border px-1.5 py-0.5 text-[10px] font-semibold xl:inline"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg)",
                  }}
                >
                  ⌘K
                </kbd>
              </button>
              <Link
                href="/auth/login"
                className="rounded-lg px-3.5 py-2 text-sm font-semibold transition-opacity hover:opacity-70"
                style={{ color: "var(--text-primary)" }}
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-black shadow-sm transition-all hover:scale-[1.03] hover:opacity-95"
                style={{ background: "var(--accent)" }}
              >
                Start Selling
              </Link>
            </div>

            {/* ───────── Mobile controls ───────── */}
            <div className="flex items-center gap-1 lg:hidden">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search stores and products"
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ color: "var(--text-secondary)" }}
              >
                <Search className="h-[18px] w-[18px]" />
              </button>
              <Link
                href="/auth/signup"
                className="rounded-full px-3.5 py-2 text-xs font-bold text-black"
                style={{ background: "var(--accent)" }}
              >
                Start Selling
              </Link>
              <button
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ color: "var(--text-primary)" }}
              >
                {mobileOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ═════════ Search overlay ═════════ */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-3xl border shadow-2xl"
            style={{ background: "var(--bg)", borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={submitSearch}
              className="flex items-center gap-3 border-b px-5"
              style={{ borderColor: "var(--border)" }}
            >
              <Search
                className="h-5 w-5 shrink-0"
                style={{ color: "var(--text-muted)" }}
                aria-hidden="true"
              />
              <label htmlFor="home-nav-search" className="sr-only">
                Search stores or products
              </label>
              <input
                id="home-nav-search"
                ref={searchInputRef}
                type="search"
                inputMode="search"
                enterKeyHint="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stores or products…"
                autoComplete="off"
                className="flex-1 bg-transparent py-5 text-lg outline-none [&::-webkit-search-cancel-button]:hidden"
                style={{ color: "var(--text-primary)" }}
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="rounded-md border px-2 py-1 text-[11px] font-semibold"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                Esc
              </button>
            </form>

            <div className="p-5">
              <p
                className="mb-3 text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}
              >
                Browse by category
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_LINKS.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    onClick={() => setSearchOpen(false)}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <span>{c.emoji}</span>
                    {c.title}
                  </Link>
                ))}
              </div>

              <div
                className="mt-5 flex items-center justify-between gap-3 border-t pt-4"
                style={{ borderColor: "var(--border)" }}
              >
                <Link
                  href="/discover?tab=products"
                  onClick={() => setSearchOpen(false)}
                  className="text-sm font-semibold hover:underline"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Browse all products
                </Link>
                <button
                  type="button"
                  onClick={(e) => submitSearch(e as unknown as React.FormEvent)}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-black"
                  style={{ background: "var(--accent)" }}
                >
                  Search
                  <CornerDownLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════ Mobile menu ═════════ */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`fixed inset-x-0 top-16 z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b transition-all duration-300 ease-out lg:hidden ${
          mobileOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0"
        }`}
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
          {/* Tap-to-search bar */}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              setSearchOpen(true);
            }}
            className="mb-2 flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-secondary)",
              color: "var(--text-muted)",
            }}
          >
            <Search className="h-4 w-4" />
            Search stores or products…
          </button>

          {/* Accordion groups */}
          {GROUPS.map((group) => {
            const open = mobileGroup === group.id;
            return (
              <div
                key={group.id}
                className="rounded-2xl"
                style={{
                  background: open ? "var(--bg-secondary)" : "transparent",
                }}
              >
                <button
                  type="button"
                  onClick={() => setMobileGroup(open ? null : group.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[15px] font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {group.label}
                  <ChevronDown
                    className={`h-4 w-4 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                  />
                </button>

                <div
                  className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                >
                  <div className="overflow-hidden">
                    <div className="px-2 pb-3">
                      {group.sections.map((section, i) => (
                        <div key={i} className="mb-1">
                          {section.layout === "list" ? (
                            section.items.map((item) => {
                              const Icon = item.icon;
                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  onClick={() => setMobileOpen(false)}
                                  className="flex items-center gap-3 rounded-xl px-2.5 py-2.5"
                                >
                                  {Icon && (
                                    <span
                                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                      style={{
                                        background: "var(--accent-light)",
                                      }}
                                    >
                                      <Icon className="h-4 w-4 text-black" />
                                    </span>
                                  )}
                                  <span className="min-w-0">
                                    <span
                                      className="block text-sm font-semibold"
                                      style={{ color: "var(--text-primary)" }}
                                    >
                                      {item.title}
                                    </span>
                                    {item.desc && (
                                      <span
                                        className="block text-xs"
                                        style={{ color: "var(--text-muted)" }}
                                      >
                                        {item.desc}
                                      </span>
                                    )}
                                  </span>
                                </Link>
                              );
                            })
                          ) : (
                            <div className="flex flex-wrap gap-2 px-2.5 pt-2">
                              {section.items.map((item) => (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  onClick={() => setMobileOpen(false)}
                                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
                                  style={{
                                    borderColor: "var(--border)",
                                    background: "var(--bg)",
                                    color: "var(--text-primary)",
                                  }}
                                >
                                  <span>{item.emoji}</span>
                                  {item.title}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Direct links */}
          {DIRECT_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-[15px] font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {link.label}
              <ArrowRight className="h-4 w-4 opacity-40" />
            </Link>
          ))}

          <div
            className="mt-3 grid grid-cols-2 gap-2 border-t pt-4"
            style={{ borderColor: "var(--border)" }}
          >
            <Link
              href="/auth/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center rounded-xl border px-4 py-3.5 text-sm font-bold"
              style={{
                borderColor: "var(--border-strong)",
                color: "var(--text-primary)",
              }}
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-black"
              style={{ background: "var(--accent)" }}
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

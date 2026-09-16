"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowRight, Search, ChevronDown } from "lucide-react";

const PRIMARY_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#for-vendors", label: "Vendors" },
  { href: "/affiliate", label: "Affiliate" },
];

const MORE_LINKS = [
  { href: "/resources#guides", label: "Guides" },
  { href: "/resources#articles", label: "Articles" },
  { href: "/terms", label: "Terms" },
];

export default function HomeNav() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change / escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Focus the search field when it opens; close on Escape
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSearchOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  // Close the "More" dropdown on outside click / Escape
  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = search.trim();
    setSearchOpen(false);
    router.push(term ? `/discover?q=${encodeURIComponent(term)}` : "/discover");
  }

  return (
    <>
      <nav
        className="sticky top-0 z-50 border-b backdrop-blur-sm transition-shadow"
        style={{
          background: "var(--bg)",
          borderColor: "var(--border)",
          boxShadow: scrolled ? "0 2px 12px rgba(0,0,0,0.08)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Logo */}
            <Link href="/" className="shrink-0 flex items-center">
              <Image src="/logo.png" alt="Duka" width={108} height={36} className="h-9 w-auto object-contain" priority />
            </Link>

            {/* Desktop nav links */}
            <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
              {PRIMARY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {link.label}
                </Link>
              ))}

              {/* More dropdown */}
              <div className="relative" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={moreOpen}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  More
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                </button>
                {moreOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full mt-2 w-44 rounded-xl border py-1.5 shadow-lg"
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  >
                    {MORE_LINKS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        role="menuitem"
                        onClick={() => setMoreOpen(false)}
                        className="block px-4 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: search + CTAs */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search stores and products"
                className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: "var(--text-secondary)" }}
              >
                <Search className="w-4.5 h-4.5" />
              </button>
              <Link
                href="/auth/login"
                className="text-sm font-medium px-4 py-2 rounded-lg transition-opacity hover:opacity-70"
                style={{ color: "var(--text-primary)" }}
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="text-sm font-semibold px-4 py-2 rounded-lg text-black transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)" }}
              >
                Start Selling
              </Link>
            </div>

            {/* Mobile: search + CTA + hamburger */}
            <div className="flex lg:hidden items-center gap-1">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search stores and products"
                className="w-10 h-10 flex items-center justify-center rounded-lg"
                style={{ color: "var(--text-secondary)" }}
              >
                <Search className="w-4.5 h-4.5" />
              </button>
              <Link
                href="/auth/signup"
                className="text-xs font-semibold px-3 py-2 rounded-lg text-black"
                style={{ background: "var(--accent)" }}
              >
                Start Selling
              </Link>
              <button
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Close menu" : "Open menu"}
                className="p-2 rounded-lg transition-colors"
                style={{ color: "var(--text-primary)" }}
              >
                {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Search overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}
        >
          <form
            onSubmit={submitSearch}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl border shadow-xl p-2 flex items-center gap-2"
            style={{ background: "var(--bg)", borderColor: "var(--border)" }}
          >
            <Search className="w-5 h-5 ml-2 shrink-0" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
            <label htmlFor="home-nav-search" className="sr-only">
              Search stores or products
            </label>
            <input
              id="home-nav-search"
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stores or products…"
              autoComplete="off"
              className="flex-1 bg-transparent py-3 text-base outline-none"
              style={{ color: "var(--text-primary)" }}
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              className="w-10 h-10 flex items-center justify-center rounded-lg shrink-0 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: "var(--text-muted)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Mobile menu backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile menu panel */}
      <div
        className={`fixed top-16 left-0 right-0 z-40 lg:hidden transition-all duration-300 ease-in-out max-h-[calc(100dvh-4rem)] overflow-y-auto ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-3 pointer-events-none"
        }`}
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
          {[...PRIMARY_LINKS, ...MORE_LINKS].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-80"
              style={{ color: "var(--text-primary)" }}
            >
              {link.label}
              <ArrowRight className="w-4 h-4 opacity-40" />
            </Link>
          ))}

          <Link
            href="/auth/login"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-80"
            style={{ color: "var(--text-primary)" }}
          >
            Login
            <ArrowRight className="w-4 h-4 opacity-40" />
          </Link>

          {/* Full-width signup CTA */}
          <Link
            href="/auth/signup"
            onClick={() => setOpen(false)}
            className="mt-2 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-bold text-black transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            Create your free store
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </>
  );
}

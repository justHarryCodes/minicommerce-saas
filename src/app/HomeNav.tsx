"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";

const NAV_LINKS = [
  { href: "/discover",     label: "Discover Stores" },
  { href: "/auth/login",   label: "Login" },
];

export default function HomeNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close on route change / escape
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
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm text-black"
                style={{ background: "var(--accent)" }}
              >
                SF
              </div>
              <span className="font-black text-lg" style={{ color: "var(--text-primary)" }}>
                ShopForge
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/discover"
                className="text-sm font-medium transition-opacity hover:opacity-70"
                style={{ color: "var(--text-secondary)" }}
              >
                Discover
              </Link>
            </div>

            {/* Desktop CTA buttons */}
            <div className="hidden md:flex items-center gap-3">
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

            {/* Mobile: CTA + hamburger */}
            <div className="flex md:hidden items-center gap-2">
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

      {/* Mobile menu backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile menu panel */}
      <div
        className={`fixed top-16 left-0 right-0 z-40 md:hidden transition-all duration-300 ease-in-out ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-3 pointer-events-none"
        }`}
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
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

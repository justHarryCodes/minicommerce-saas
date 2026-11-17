"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  ChevronDown,
  CornerDownLeft,
  FileText,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Scale,
  Search,
  ShoppingBag,
  Store,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Icon3D, { type Tone } from "./landing/Icon3D";

// Duka's public header. On the home page it floats over the video,
// transparent with white text, and turns to frosted glass once you scroll.
// It tucks away while you scroll down and comes back when you scroll up.
// Menus open as full-width panels (hover or click on desktop, a full-screen
// sheet on phones).

// Self-hosted: next/font/google downloads at build time, so a slow
// connection to Google could fail the whole build.
const wordmarkFont = localFont({
  src: "../fonts/sora-latin.woff2",
  weight: "100 800",
  display: "swap",
});

/* ─────────────────────────────── Menu config ─────────────────────────────── */

type Item = { href: string; title: string; desc: string; icon: LucideIcon; tone: Tone };
type Group = {
  id: string;
  label: string;
  matches: string[];
  items: Item[];
  chips?: { href: string; title: string; emoji: string }[];
  promo?: { title: string; cta: string; href: string; image: string };
};

const CATEGORIES = [
  { title: "Fashion", emoji: "👗", cat: "Fashion and Clothing" },
  { title: "Beauty", emoji: "💄", cat: "Beauty and Makeup" },
  { title: "Food", emoji: "🍽️", cat: "Food and Catering" },
  { title: "Electronics", emoji: "⚡", cat: "Electronics and Gadgets" },
  { title: "Phones", emoji: "📱", cat: "Phones and Accessories" },
  { title: "Hair", emoji: "💇", cat: "Hair and Wigs" },
  { title: "Shoes", emoji: "👟", cat: "Shoes and Sneakers" },
  { title: "Home", emoji: "🛋️", cat: "Furniture and Home" },
].map(({ title, emoji, cat }) => ({ title, emoji, href: `/discover?category=${encodeURIComponent(cat)}` }));

const GROUPS: Group[] = [
  {
    id: "features",
    label: "Features",
    matches: [],
    items: [
      { href: "/#tool-store", title: "Online store", desc: "Your brand, live in minutes", icon: Store, tone: "pink" },
      { href: "/#tool-pay", title: "Payments", desc: "Card, transfer, USSD, on delivery", icon: Wallet, tone: "green" },
      { href: "/#how-duka-works", title: "WhatsApp shop", desc: "Customers buy inside the chat", icon: MessageCircle, tone: "teal" },
      { href: "/#automation", title: "Sales automation", desc: "Reminders, receipts, updates", icon: Bot, tone: "amber" },
      { href: "/#tool-run", title: "Dashboard", desc: "Orders, money and stock", icon: LayoutDashboard, tone: "violet" },
      { href: "/#tool-found", title: "Get found", desc: "On Google and Duka Discover", icon: Search, tone: "blue" },
    ],
    promo: { title: "Nigerian stores, powered by Duka.", cta: "Start for free", href: "/auth/signup", image: "/hero-poster.jpg" },
  },
  {
    id: "marketplace",
    label: "Marketplace",
    matches: ["/discover"],
    items: [
      { href: "/discover", title: "Browse stores", desc: "Trusted vendors across Nigeria", icon: Store, tone: "amber" },
      { href: "/discover?tab=products", title: "Browse products", desc: "Shop from every store", icon: ShoppingBag, tone: "pink" },
    ],
    chips: CATEGORIES,
  },
  {
    id: "resources",
    label: "Resources",
    matches: ["/resources", "/terms"],
    items: [
      { href: "/resources#guides", title: "Guides", desc: "Step-by-step store help", icon: BookOpen, tone: "blue" },
      { href: "/resources#articles", title: "Articles", desc: "Tips to grow your business", icon: FileText, tone: "green" },
      { href: "/terms", title: "Terms", desc: "Our terms of service", icon: Scale, tone: "slate" },
    ],
  },
];

const PRICING = { href: "/pricing", label: "Pricing" };

/* ─────────────────────────────── Component ─────────────────────────────── */

export default function HomeNav({ overlay = false }: { overlay?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  const [menu, setMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>("features");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [tucked, setTucked] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Scroll: glass after a few px; tuck away going down, return going up */
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      if (Math.abs(y - lastY) > 6) {
        setTucked(y > 480 && y > lastY);
        lastY = y;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Route change closes everything */
  useEffect(() => {
    setMenu(null);
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  /* Escape closes; open sheets lock page scroll */
  useEffect(() => {
    const locked = mobileOpen || searchOpen;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(null);
        setMobileOpen(false);
        setSearchOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    if (locked) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (locked) document.body.style.overflow = "";
    };
  }, [mobileOpen, searchOpen]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  /* Desktop menu: click outside closes */
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  const open = useCallback((id: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMenu(id);
  }, []);
  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMenu(null), 160);
  }, []);

  function submitSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const term = search.trim();
    setSearchOpen(false);
    router.push(term ? `/discover?q=${encodeURIComponent(term)}` : "/discover");
  }

  const isActive = (prefixes: string[]) => prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Transparent over the video until scrolled or a menu opens
  const clear = overlay && !scrolled && !menu && !mobileOpen;
  const ink = clear ? "#fff" : "var(--text-primary)";
  const inkSoft = clear ? "rgba(255,255,255,0.82)" : "var(--text-secondary)";
  const group = GROUPS.find((g) => g.id === menu);

  return (
    <>
      <header
        ref={headerRef}
        onMouseLeave={scheduleClose}
        onMouseEnter={() => closeTimer.current && clearTimeout(closeTimer.current)}
        className={`${overlay ? "fixed" : "sticky"} inset-x-0 top-0 z-50 transition-[transform,background-color,border-color,box-shadow] duration-300 ${
          tucked && !menu && !mobileOpen ? "-translate-y-full" : "translate-y-0"
        }`}
        style={{
          background: clear ? "transparent" : "color-mix(in srgb, var(--bg) 82%, transparent)",
          backdropFilter: clear ? "none" : "saturate(180%) blur(18px)",
          WebkitBackdropFilter: clear ? "none" : "saturate(180%) blur(18px)",
          borderBottom: `1px solid ${clear ? "transparent" : "var(--border)"}`,
        }}
      >
        {/* Soft shade so white text reads over any video frame */}
        {clear && <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 bg-gradient-to-b from-black/45 to-transparent" />}

        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:h-[72px] lg:px-8">
          {/* Logo */}
          <Link href="/" className="mr-4 flex shrink-0 items-center gap-1.5" aria-label="Duka home">
            <Image src="/logo-mark.png" alt="" width={23} height={36} className="h-9 w-auto object-contain" priority />
            <span className={`${wordmarkFont.className} text-[22px] leading-none tracking-[0.04em] transition-colors`} style={{ color: ink }}>
              DUKA
            </span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Main" className="hidden items-center lg:flex">
            {GROUPS.map((g) => {
              const on = menu === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onMouseEnter={() => open(g.id)}
                  onClick={() => setMenu(on ? null : g.id)}
                  aria-expanded={on}
                  aria-controls="nav-panel"
                  className="flex items-center gap-1 rounded-full px-3.5 py-2 text-[15px] font-medium transition-colors"
                  style={{
                    color: on || isActive(g.matches) ? ink : inkSoft,
                    background: on ? "var(--bg-tertiary)" : "transparent",
                  }}
                >
                  {g.label}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${on ? "rotate-180" : ""}`} />
                </button>
              );
            })}
            <Link
              href={PRICING.href}
              onMouseEnter={scheduleClose}
              className="rounded-full px-3.5 py-2 text-[15px] font-medium transition-opacity hover:opacity-70"
              style={{ color: pathname === PRICING.href ? ink : inkSoft }}
            >
              {PRICING.label}
            </Link>
          </nav>

          <div className="flex-1" />

          {/* Desktop actions */}
          <div className="hidden items-center gap-1.5 lg:flex">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search stores and products (Ctrl K)"
              title="Search (Ctrl K)"
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${clear ? "text-white hover:bg-white/15" : "hover:bg-black/5 dark:hover:bg-white/10"}`}
              style={clear ? undefined : { color: "var(--text-secondary)" }}
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
            <ThemeToggle className={clear ? "!text-white hover:!bg-white/15" : ""} />
            <Link href="/auth/login" className="rounded-full px-4 py-2 text-[15px] font-medium transition-opacity hover:opacity-70" style={{ color: ink }}>
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="group inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[15px] font-semibold transition-transform hover:scale-[1.03]"
              style={clear ? { background: "#fff", color: "#000" } : { background: "var(--text-primary)", color: "var(--bg)" }}
            >
              Start for free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-1 lg:hidden">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search stores and products"
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ color: ink }}
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
            <Link
              href="/auth/signup"
              className="rounded-full px-4 py-2 text-[13px] font-semibold"
              style={clear ? { background: "#fff", color: "#000" } : { background: "var(--text-primary)", color: "var(--bg)" }}
            >
              Start for free
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="nav-sheet"
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ color: ink }}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* ───────── Desktop mega panel ───────── */}
        <div
          id="nav-panel"
          className={`absolute inset-x-0 top-full hidden border-b transition-all duration-200 lg:block ${
            group ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
          }`}
          style={{ background: "var(--bg)", borderColor: "var(--border)", boxShadow: "0 30px 60px -30px rgba(0,0,0,0.35)" }}
        >
          {group && <Panel key={group.id} group={group} onPick={() => setMenu(null)} />}
        </div>
      </header>

      {/* Dim the page under an open desktop menu */}
      <div
        aria-hidden
        onMouseEnter={scheduleClose}
        className={`fixed inset-0 z-40 hidden bg-black/25 backdrop-blur-[2px] transition-opacity duration-200 lg:block ${menu ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      {/* ───────── Mobile sheet ───────── */}
      <div
        id="nav-sheet"
        className={`fixed inset-x-0 bottom-0 top-16 z-40 flex flex-col transition-all duration-300 ease-out lg:hidden ${
          mobileOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        style={{ background: "var(--bg)" }}
        aria-hidden={!mobileOpen}
      >
        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              setSearchOpen(true);
            }}
            className="mb-4 flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg-secondary)", color: "var(--text-muted)" }}
          >
            <Search className="h-4 w-4" /> Search stores or products…
          </button>

          {GROUPS.map((g) => {
            const on = mobileGroup === g.id;
            return (
              <div key={g.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                <button
                  type="button"
                  onClick={() => setMobileGroup(on ? null : g.id)}
                  aria-expanded={on}
                  className="flex w-full items-center justify-between py-4 text-left text-2xl font-semibold tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {g.label}
                  <ChevronDown className={`h-5 w-5 opacity-50 transition-transform duration-200 ${on ? "rotate-180" : ""}`} />
                </button>
                <div className={`grid transition-all duration-300 ease-out ${on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <div className="grid grid-cols-1 gap-1 pb-4 min-[480px]:grid-cols-2">
                      {g.items.map((it) => (
                        <Link key={it.href + it.title} href={it.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-2xl p-2 active:bg-black/5 dark:active:bg-white/5">
                          <Icon3D icon={it.icon} tone={it.tone} size={38} />
                          <span className="min-w-0">
                            <span className="block text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>{it.title}</span>
                            <span className="block truncate text-xs" style={{ color: "var(--text-muted)" }}>{it.desc}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                    {g.chips && (
                      <div className="flex flex-wrap gap-2 pb-5">
                        {g.chips.map((c) => (
                          <Link key={c.href} href={c.href} onClick={() => setMobileOpen(false)} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
                            {c.emoji} {c.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <Link href={PRICING.href} onClick={() => setMobileOpen(false)} className="flex items-center justify-between border-b py-4 text-2xl font-semibold tracking-tight" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
            {PRICING.label}
            <ArrowUpRight className="h-5 w-5 opacity-40" />
          </Link>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Appearance</span>
            <ThemeToggle variant="segmented" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t p-4" style={{ borderColor: "var(--border)" }}>
          <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="flex items-center justify-center rounded-full border py-3.5 text-[15px] font-semibold" style={{ borderColor: "var(--border-strong)", color: "var(--text-primary)" }}>
            Log in
          </Link>
          <Link href="/auth/signup" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-1.5 rounded-full bg-amber-400 py-3.5 text-[15px] font-bold text-black">
            Start for free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ───────── Search ───────── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border shadow-2xl" style={{ background: "var(--bg)", borderColor: "var(--border)" }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submitSearch} className="flex items-center gap-3 border-b px-5" style={{ borderColor: "var(--border)" }}>
              <Search className="h-5 w-5 shrink-0" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
              <label htmlFor="home-nav-search" className="sr-only">Search stores or products</label>
              <input
                id="home-nav-search"
                ref={searchRef}
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
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className="rounded-md border px-2 py-1 text-[11px] font-semibold" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                Esc
              </button>
            </form>
            <div className="p-5">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Browse by category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <Link key={c.href} href={c.href} onClick={() => setSearchOpen(false)} className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
                    <span>{c.emoji}</span>
                    {c.title}
                  </Link>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                <Link href="/discover?tab=products" onClick={() => setSearchOpen(false)} className="text-sm font-semibold hover:underline" style={{ color: "var(--text-secondary)" }}>
                  Browse all products
                </Link>
                <button type="button" onClick={() => submitSearch()} className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-black">
                  Search <CornerDownLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────── Mega panel ─────────────────────────────── */

function Panel({ group, onPick }: { group: Group; onPick: () => void }) {
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-8 py-8" style={{ gridTemplateColumns: group.promo || group.chips ? "1.6fr 1fr" : "1fr" }}>
      <div>
        <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>{group.label}</p>
        <ul className={`grid gap-1 ${group.items.length > 3 ? "grid-cols-2" : group.promo || group.chips ? "grid-cols-1" : "grid-cols-3"}`}>
          {group.items.map((it, i) => (
            <li key={it.href + it.title} className="nav-pop" style={{ animationDelay: `${i * 35}ms` }}>
              <Link href={it.href} onClick={onPick} className="group flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
                <span className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-4deg]">
                  <Icon3D icon={it.icon} tone={it.tone} size={44} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    {it.title}
                    <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-60" />
                  </span>
                  <span className="block text-[13px]" style={{ color: "var(--text-muted)" }}>{it.desc}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {group.chips && (
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>Popular categories</p>
          <div className="grid grid-cols-2 gap-1.5">
            {group.chips.map((c, i) => (
              <Link key={c.href} href={c.href} onClick={onPick} className="nav-pop flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors hover:border-amber-400" style={{ borderColor: "var(--border)", color: "var(--text-primary)", animationDelay: `${i * 25}ms` }}>
                <span className="text-base">{c.emoji}</span> {c.title}
              </Link>
            ))}
          </div>
          <Link href="/discover" onClick={onPick} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:underline dark:text-amber-400">
            See everything on Duka <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {group.promo && (
        <Link href={group.promo.href} onClick={onPick} className="nav-pop group relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-3xl p-6 text-white">
          <Image src={group.promo.image} alt="" fill sizes="420px" loading="eager" className="object-cover transition-transform duration-700 group-hover:scale-105" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
          <span className="relative text-2xl font-semibold leading-tight tracking-tight">{group.promo.title}</span>
          <span className="relative mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
            {group.promo.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}
    </div>
  );
}

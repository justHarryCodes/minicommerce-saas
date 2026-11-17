"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { ChevronsLeft, ChevronsRight, CornerDownLeft, LogOut, Menu, Plus, Search, X } from "lucide-react";
import { auth } from "@/lib/firebase-client";
import type { AdminUser } from "@/lib/admin-auth";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import ThemeToggle from "@/components/ThemeToggle";
import DukaLogo from "@/components/DukaLogo";
import { ADMIN_NAV, ADMIN_NAV_ITEMS, adminTitle, isAdminActive } from "./nav";

// The admin "command centre": slim grouped sidebar (collapsible to icons),
// a top bar with ⌘K search, quick actions, theme and account, and a drawer
// on phones. Pages render inside; they keep using the CSS colour variables,
// so light and dark both work.

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const QUICK = [
  { label: "New campaign", href: "/admin/campaigns/new", keywords: "email push announcement" },
  { label: "Chase unfinished sign-ups", href: "/admin/leads?tab=unfinished", keywords: "leads setup" },
  { label: "Upgrade prospects", href: "/admin/leads?tab=upgrade", keywords: "leads pro business" },
  { label: "Confirm bank transfers", href: "/admin/transfers", keywords: "payments" },
];

function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {ADMIN_NAV.map((g, gi) => (
        <div key={gi} className="mb-2">
          {g.label &&
            (collapsed ? (
              <div className="mx-2 my-2 border-t" style={{ borderColor: "var(--border)" }} />
            ) : (
              <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
                {g.label}
              </p>
            ))}
          {g.items.map((it) => {
            const active = isAdminActive(pathname, it);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={onNavigate}
                title={collapsed ? it.label : undefined}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-9 items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors",
                  collapsed ? "justify-center px-0" : "px-2.5",
                  active ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white",
                )}
              >
                <it.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{it.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const pages = ADMIN_NAV_ITEMS.map((n) => ({ label: n.label, href: n.href, hint: "Page", keywords: n.keywords ?? "" }));
    const actions = QUICK.map((a) => ({ ...a, hint: "Action" }));
    const all = [...actions, ...pages];
    const hits = t ? all.filter((r) => `${r.label} ${r.keywords}`.toLowerCase().includes(t)) : all;
    // Free text that isn't a page: look the vendor up
    return t.length >= 2 ? [...hits, { label: `Find vendor "${q.trim()}"`, href: `/admin/vendors?q=${encodeURIComponent(q.trim())}`, hint: "Search", keywords: "" }] : hits;
  }, [q]);

  useEffect(() => {
    if (open) {
      setQ("");
      setI(0);
      setTimeout(() => input.current?.focus(), 10);
    }
  }, [open]);

  if (!open) return null;
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl" style={{ background: "var(--bg)", borderColor: "var(--border)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-3" style={{ borderColor: "var(--border)" }}>
          <Search className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setI(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") (e.preventDefault(), setI((x) => Math.min(x + 1, results.length - 1)));
              if (e.key === "ArrowUp") (e.preventDefault(), setI((x) => Math.max(x - 1, 0)));
              if (e.key === "Enter" && results[i]) go(results[i].href);
              if (e.key === "Escape") onClose();
            }}
            placeholder="Search pages, actions or a vendor…"
            className="h-12 flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--text-primary)" }}
          />
          <kbd className="rounded border px-1.5 text-[10px]" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-1.5">
          {results.map((r, n) => (
            <li key={r.href + r.label}>
              <button
                type="button"
                onMouseEnter={() => setI(n)}
                onClick={() => go(r.href)}
                className={cx("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm", n === i && "bg-zinc-100 dark:bg-zinc-800")}
                style={{ color: "var(--text-primary)" }}
              >
                <span className="flex-1 truncate">{r.label}</span>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{r.hint}</span>
                {n === i && <CornerDownLeft className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />}
              </button>
            </li>
          ))}
          {!results.length && <li className="px-3 py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>Nothing found</li>}
        </ul>
      </div>
    </div>
  );
}

export default function AdminShell({ admin, children }: { admin: AdminUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState(false);
  const title = adminTitle(pathname);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("duka_admin_rail") === "1");
    } catch {
      /* default open */
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => setDrawer(false), [pathname]);

  const toggleRail = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem("duka_admin_rail", c ? "0" : "1");
      } catch {
        /* fine */
      }
      return !c;
    });

  const logout = async () => {
    await signOut(auth);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  };

  const initials = (admin.name ?? admin.email ?? "?").split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("");

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-secondary)" }}>
      {/* Desktop sidebar */}
      <aside
        className={cx("fixed inset-y-0 left-0 z-30 hidden flex-col border-r transition-[width] duration-200 lg:flex", collapsed ? "w-16" : "w-56")}
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <div className={cx("flex h-14 items-center border-b", collapsed ? "justify-center" : "justify-between px-3")} style={{ borderColor: "var(--border)" }}>
          {collapsed ? <DukaLogo size={24} wordmark={false} href="/admin" /> : <DukaLogo size={24} href="/admin" />}
          {!collapsed && <span className="rounded-md bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-white dark:text-zinc-900">Admin</span>}
        </div>
        <Sidebar collapsed={collapsed} />
        <button
          type="button"
          onClick={toggleRail}
          className="flex h-10 items-center justify-center gap-2 border-t text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          style={{ borderColor: "var(--border)" }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : (<><ChevronsLeft className="h-4 w-4" /> Collapse</>)}
        </button>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r" style={{ background: "var(--bg)", borderColor: "var(--border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex h-14 items-center justify-between border-b px-3" style={{ borderColor: "var(--border)" }}>
              <DukaLogo size={24} href="/admin" />
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="rounded-lg p-2 text-zinc-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Sidebar collapsed={false} onNavigate={() => setDrawer(false)} />
            <div className="border-t p-3" style={{ borderColor: "var(--border)" }}>
              <ThemeToggle variant="segmented" className="w-full justify-between" />
            </div>
          </aside>
        </div>
      )}

      <div className={cx("flex min-h-screen flex-col transition-[padding] duration-200", collapsed ? "lg:pl-16" : "lg:pl-56")}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b px-3 backdrop-blur-md sm:px-5" style={{ background: "color-mix(in srgb, var(--bg) 88%, transparent)", borderColor: "var(--border)" }}>
          <button type="button" onClick={() => setDrawer(true)} className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 truncate text-sm font-bold sm:text-base" style={{ color: "var(--text-primary)" }}>{title}</h1>

          <button
            type="button"
            onClick={() => setPalette(true)}
            className="mx-auto hidden h-9 w-full max-w-md items-center gap-2 rounded-lg border px-3 text-[13px] md:flex"
            style={{ borderColor: "var(--border)", background: "var(--bg-secondary)", color: "var(--text-muted)" }}
          >
            <Search className="h-3.5 w-3.5" /> Search pages, actions, vendors…
            <kbd className="ml-auto rounded border px-1.5 text-[10px] font-semibold" style={{ borderColor: "var(--border)" }}>Ctrl K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <button type="button" onClick={() => setPalette(true)} className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 md:hidden" aria-label="Search">
              <Search className="h-[18px] w-[18px]" />
            </button>
            <Link href="/admin/campaigns/new" className="hidden h-9 items-center gap-1 rounded-lg bg-amber-400 px-3 text-[13px] font-bold text-black hover:bg-amber-500 sm:flex">
              <Plus className="h-4 w-4" /> Campaign
            </Link>
            <ThemeToggle />
            <PushNotificationPrompt subjectType="admin" />
            <div className="relative">
              <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Account" className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white dark:bg-white dark:text-zinc-900">
                {initials}
              </button>
              {menu && (
                <div className="absolute right-0 top-10 z-50 w-56 rounded-lg border p-1 shadow-lg" style={{ background: "var(--bg)", borderColor: "var(--border)" }} onMouseLeave={() => setMenu(false)}>
                  <div className="px-2.5 py-2">
                    <p className="truncate text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{admin.name ?? admin.email}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{admin.role === "super_admin" ? "Super admin" : "Admin"}</p>
                  </div>
                  <Link href="/dashboard" className="block rounded-md px-2.5 py-2 text-[13px] text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">Open vendor dashboard</Link>
                  <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-zinc-600 hover:bg-red-50 hover:text-red-600 dark:text-zinc-300 dark:hover:bg-red-950/30">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 p-3 sm:p-5 lg:p-6">{children}</main>
      </div>

      <Palette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}

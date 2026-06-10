"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import type { AdminUser } from "@/lib/admin-auth";

const ALL_NAV = [
  { href: "/admin",           label: "Overview",   icon: LayoutDashboard, exact: true  },
  { href: "/admin/vendors",   label: "Vendors",    icon: Users,           exact: false },
  { href: "/admin/plans",     label: "Plans",      icon: CreditCard,      exact: false },
  { href: "/admin/transfers", label: "Transfers",  icon: ArrowLeftRight,  exact: false },
  { href: "/admin/settings",  label: "Settings",   icon: Settings,        exact: false },
  { href: "/admin/affiliates",label: "Affiliates", icon: UserCheck,       exact: false },
];

// Only 5 items fit cleanly in the bottom bar — Affiliates lives in the drawer only
const BOTTOM_TABS = ALL_NAV.slice(0, 5);

export default function AdminMobileNav({ admin }: { admin: AdminUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  async function handleLogout() {
    setOpen(false);
    await signOut(auth);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  }

  const initials = (admin.name ?? admin.email ?? "?")[0].toUpperCase();

  return (
    <>
      {/* ── Mobile top header (hidden lg+) ───────────────────────── */}
      <header
        className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center px-4 gap-3"
        style={{
          height: 56,
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Hamburger */}
        <button
          onClick={() => setOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ background: "var(--bg-secondary)" }}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
        </button>

        {/* Center — logo */}
        <div className="flex-1 flex items-center justify-center">
          <Image src="/logo.png" alt="Duka" width={72} height={24} style={{ height: 24, width: "auto" }} priority />
        </div>

        {/* Right — admin avatar */}
        <div
          className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 font-black text-sm"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {initials}
        </div>
      </header>

      {/* ── Mobile drawer (hidden lg+) ────────────────────────────── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* Slide panel */}
          <aside
            className="relative w-72 flex flex-col h-full shadow-2xl"
            style={{ background: "var(--bg)" }}
          >
            {/* Drawer header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <Image src="/logo.png" alt="Duka" width={80} height={28} style={{ height: 28, width: "auto" }} />
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ color: "var(--text-muted)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Admin profile strip */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {admin.name ?? admin.email}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {admin.role === "super_admin" ? "Super Admin" : "Admin"}
                </p>
              </div>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
              {ALL_NAV.map(({ href, label, icon: Icon, exact }) => {
                const active = isActive(href, exact);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors"
                    style={{
                      background: active ? "var(--accent)" : "transparent",
                      color: active ? "#000" : "var(--text-secondary)",
                    }}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Sign out */}
            <div
              className="p-4 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  color: "#ef4444",
                }}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Mobile bottom tab bar (hidden lg+) ───────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch"
        style={{
          height: 60,
          background: "var(--bg)",
          borderTop: "1px solid var(--border)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
        }}
      >
        {BOTTOM_TABS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 rounded-b-full"
                  style={{ height: 3, background: "var(--accent)" }}
                />
              )}
              <Icon
                className="w-[22px] h-[22px]"
                style={{
                  color: active ? "var(--text-primary)" : "var(--text-muted)",
                }}
              />
              <span
                className="text-[10px] font-semibold"
                style={{
                  color: active ? "var(--text-primary)" : "var(--text-muted)",
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

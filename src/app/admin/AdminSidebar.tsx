"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Settings, LogOut, Shield, CreditCard } from "lucide-react";
import { auth } from "@/lib/firebase-client";
import { signOut } from "firebase/auth";
import type { AdminUser } from "@/lib/admin-auth";

const navItems = [
  { href: "/admin",          label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/vendors",  label: "Vendors",  icon: Users,           exact: false },
  { href: "/admin/plans",    label: "Plans",    icon: CreditCard,      exact: false },
  { href: "/admin/settings", label: "Settings", icon: Settings,        exact: false },
];

export default function AdminSidebar({ admin }: { admin: AdminUser }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  };

  return (
    <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 border-r z-30"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
      {/* Brand */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent)" }}>
            <Shield className="w-4 h-4 text-black" />
          </div>
          <span className="font-black text-base" style={{ color: "var(--text-primary)" }}>
            Admin Panel
          </span>
        </div>
        <p className="text-xs pl-10" style={{ color: "var(--text-muted)" }}>ShopForge</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: active ? "var(--accent)" : "transparent",
                color: active ? "#000" : "var(--text-secondary)",
              }}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Admin info + logout */}
      <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="mb-3 px-2">
          <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {admin.name ?? admin.email}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
            {admin.role === "super_admin" ? "Super Admin" : "Admin"}
          </p>
        </div>
        <button onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
          style={{ color: "var(--text-secondary)" }}>
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingBag, Settings, Plus, CalendarDays, Boxes, ScanBarcode } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/access-shared";

const TABS = [
  { href: "/dashboard",          label: "Home",     icon: LayoutDashboard, exact: true  },
  { href: "/dashboard/orders",   label: "Orders",   icon: ShoppingBag,     exact: false },
  { href: "/dashboard/products", label: "Products", icon: Package,         exact: false },
  { href: "/dashboard/settings", label: "Settings", icon: Settings,        exact: false },
];

// Team members get tabs for what their role can actually open
const ROLE_TABS: Record<Exclude<Role, "owner">, typeof TABS> = {
  manager: [
    { href: "/dashboard",          label: "Home",     icon: LayoutDashboard, exact: true  },
    { href: "/dashboard/orders",   label: "Orders",   icon: ShoppingBag,     exact: false },
    { href: "/dashboard/products", label: "Products", icon: Package,         exact: false },
    { href: "/dashboard/pos",      label: "POS",      icon: ScanBarcode,     exact: false },
  ],
  staff: [
    { href: "/dashboard/orders",    label: "Orders",   icon: ShoppingBag,  exact: false },
    { href: "/dashboard/bookings",  label: "Bookings", icon: CalendarDays, exact: false },
    { href: "/dashboard/inventory", label: "Stock",    icon: Boxes,        exact: false },
    { href: "/dashboard/pos",       label: "POS",      icon: ScanBarcode,  exact: false },
  ],
};

export default function DashboardBottomNav({ role = "owner" }: { role?: Role }) {
  const pathname = usePathname();
  const tabs = role === "owner" ? TABS : ROLE_TABS[role];
  // Staff can't add products, so their quick action is a new in-person sale
  const fab = role === "staff"
    ? { href: "/dashboard/pos", label: "New sale" }
    : { href: "/dashboard/products/new", label: "List new product" };

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  // Split into 2 tabs left + FAB center + 2 tabs right
  const leftTabs  = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2);

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex items-stretch bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800"
      style={{ height: 64, boxShadow: "0 -4px 24px rgba(0,0,0,0.07)" }}
    >
      {/* Left tabs */}
      {leftTabs.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-accent-500" />
            )}
            <Icon
              className={cn("w-[22px] h-[22px]", active ? "text-accent-600 dark:text-accent-400" : "text-zinc-400 dark:text-zinc-500")}
            />
            <span
              className={cn("text-[10px] font-semibold", active ? "text-accent-600 dark:text-accent-400" : "text-zinc-400 dark:text-zinc-500")}
            >
              {label}
            </span>
          </Link>
        );
      })}

      {/* FAB — list product */}
      <div className="flex items-center justify-center px-2">
        <Link
          href={fab.href}
          className="w-12 h-12 rounded-2xl bg-accent-500 hover:bg-accent-600 flex items-center justify-center shadow-lg shadow-accent-500/30 transition-colors"
          aria-label={fab.label}
        >
          <Plus className="w-6 h-6 text-black" strokeWidth={2.5} />
        </Link>
      </div>

      {/* Right tabs */}
      {rightTabs.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-accent-500" />
            )}
            <Icon
              className={cn("w-[22px] h-[22px]", active ? "text-accent-600 dark:text-accent-400" : "text-zinc-400 dark:text-zinc-500")}
            />
            <span
              className={cn("text-[10px] font-semibold", active ? "text-accent-600 dark:text-accent-400" : "text-zinc-400 dark:text-zinc-500")}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

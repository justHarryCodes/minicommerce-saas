"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Store } from "lucide-react";
import type { Store as StoreType } from "@/types";
import type { SessionUser } from "@/lib/auth";

interface Props {
  user: SessionUser;
  store: StoreType;
}

const ROOT = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "awarizon.shop").replace(/^www\./, "");

const PAGE_LABELS: Record<string, string> = {
  "/dashboard":            "Overview",
  "/dashboard/products":   "Products",
  "/dashboard/categories": "Categories",
  "/dashboard/orders":     "Orders",
  "/dashboard/storefront": "Store Page",
  "/dashboard/reels":      "Reels",
  "/dashboard/billing":    "Billing",
  "/dashboard/coupons":    "Coupons",
  "/dashboard/reviews":    "Reviews",
  "/dashboard/referral":   "Refer & Earn",
  "/dashboard/settings":   "Settings",
};

function getPageLabel(pathname: string): string {
  // Exact match first
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  // Prefix match for nested routes (e.g. /dashboard/products/new)
  const match = Object.keys(PAGE_LABELS)
    .filter((k) => k !== "/dashboard" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_LABELS[match] : "Dashboard";
}

function InitialsAvatar({ name, email }: { name?: string | null; email: string }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : email[0].toUpperCase();

  return (
    <div className="w-8 h-8 rounded-full bg-accent-400 flex items-center justify-center font-bold text-black text-xs shrink-0 ring-2 ring-accent-200 dark:ring-accent-800">
      {initials}
    </div>
  );
}

export default function DashboardTopbar({ user, store }: Props) {
  const pathname = usePathname();
  const pageLabel = getPageLabel(pathname);
  const storeUrl = `https://${store.slug}.${ROOT}`;

  return (
    <header className="hidden lg:flex h-16 sticky top-0 z-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-surface-100 dark:border-surface-800 items-center justify-between px-8 gap-4">

      {/* Left — page title */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-base font-bold text-surface-900 dark:text-white truncate">
          {pageLabel}
        </h1>
      </div>

      {/* Right — actions + user */}
      <div className="flex items-center gap-2 shrink-0">

        {/* View store pill */}
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:border-accent-400 hover:text-accent-600 dark:hover:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-950/30 transition-all"
        >
          <Store className="w-3.5 h-3.5" />
          {store.slug}.{ROOT}
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>

        {/* Divider */}
        <div className="hidden xl:block w-px h-5 bg-surface-200 dark:bg-surface-700" />

        {/* User chip */}
        <div className="flex items-center gap-2.5 pl-1">
          <InitialsAvatar name={user.displayName} email={user.email} />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-surface-900 dark:text-white max-w-[140px] truncate">
              {user.displayName ?? user.email.split("@")[0]}
            </span>
            <span className="text-xs text-surface-400 max-w-[140px] truncate">
              {store.name}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

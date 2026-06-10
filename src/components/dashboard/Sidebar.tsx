"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardDrawer } from "@/lib/dashboard-drawer-store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Settings,
  LogOut,
  ChevronRight,
  X,
  ExternalLink,
  CreditCard,
  Layout,
  Tag,
  Star,
  Gift,
  Film,
} from "lucide-react";
import { auth } from "@/lib/firebase-client";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/categories", label: "Categories", icon: FolderTree },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/storefront", label: "Store Page", icon: Layout },
  { href: "/dashboard/reels", label: "Reels", icon: Film },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/coupons", label: "Coupons", icon: Tag },
  { href: "/dashboard/reviews", label: "Reviews", icon: Star },
  { href: "/dashboard/referral", label: "Refer & Earn", icon: Gift },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  store?: { name: string; slug: string; logoUrl?: string };
}

function SidebarContent({
  store,
  onClose,
}: {
  store?: SidebarProps["store"];
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  };

const ROOT = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "awarizon.shop")
  .replace(/^www\./, "");

const storeUrl = store
  ? `https://${store.slug}.${ROOT}`
  : null;

const storeDisplayUrl = store
  ? `${store.slug}.${ROOT}`
  : null;

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
        <Image src="/logo.png" alt="Duka" width={96} height={32} style={{ height: 32, width: "auto" }} priority />
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Store card */}
      {store && storeUrl && (
        <div className="mx-4 mt-5 mb-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3 border border-zinc-200 dark:border-zinc-700">
          <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
            Your store
          </p>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {store.name}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                {storeDisplayUrl}
              </p>
            </div>
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-accent-600 dark:text-accent-400 hover:underline shrink-0 mt-0.5"
            >
              View <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* Nav label */}
      <p className="px-6 pt-4 pb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        Menu
      </p>

      {/* Nav links */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "relative flex items-center gap-3.5 px-4 py-3 rounded-xl text-base font-medium transition-all duration-150",
                active
                  ? "bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100",
              )}
            >
              {/* Active left bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-accent-500 dark:bg-accent-400" />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active ? "text-accent-600 dark:text-accent-400" : "",
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3.5 px-4 py-3 rounded-xl text-base font-medium text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ store }: SidebarProps) {
  const { open, setOpen } = useDashboardDrawer();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-zinc-950 border-r border-zinc-100 dark:border-zinc-800 shadow-xl transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent store={store} onClose={() => setOpen(false)} />
      </aside>

      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-zinc-950 border-r border-zinc-100 dark:border-zinc-800">
        <SidebarContent store={store} />
      </aside>
    </>
  );
}

"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { ChevronsLeft, ChevronsRight, ExternalLink, LogOut, X } from "lucide-react";
import { useDashboardDrawer } from "@/lib/dashboard-drawer-store";
import { cn } from "@/lib/utils";
import { allowedPath, type Role } from "@/lib/access-shared";
import { featureForPath, type Feature } from "@/lib/features-shared";
import { auth } from "@/lib/firebase-client";
import { clLogo } from "@/lib/cloudinary";
import { NAV_GROUPS, isActiveHref } from "./nav-config";
import { useRail } from "./DashboardFrame";

interface SidebarProps {
  store?: { name: string; slug: string; logoUrl?: string; customDomain?: string | null };
  isPro?: boolean;
  role?: Role;
  /** Paid features the store's plan includes (drives the lock badges) */
  features?: Feature[];
  /** Counts shown next to nav items, e.g. { "/dashboard/orders": 3 } */
  badges?: Record<string, number>;
}

const ROOT = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "dukanigeria.com").replace(/^www\./, "");

function SidebarContent({
  store,
  isPro,
  role = "owner",
  features,
  badges = {},
  rail = false,
  onClose,
}: SidebarProps & { rail?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setCollapsed } = useDashboardDrawer();

  const handleLogout = async () => {
    await signOut(auth);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  };

  const storeUrl = store ? (store.customDomain ? `https://${store.customDomain}` : `https://${store.slug}.${ROOT}`) : null;
  const storeHost = store ? store.customDomain ?? `${store.slug}.${ROOT}` : null;

  return (
    <div className="flex h-full flex-col">
      {/* Store */}
      <div className={cn("flex h-12 shrink-0 items-center gap-2 border-b border-zinc-100 dark:border-zinc-800", rail ? "justify-center px-2" : "px-3")}>
        {store?.logoUrl ? (
          <Image src={clLogo(store.logoUrl)} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-md border border-zinc-200 object-contain bg-white dark:border-zinc-700" />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-400 text-xs font-black text-black">
            {(store?.name ?? "D").charAt(0).toUpperCase()}
          </span>
        )}
        {!rail && (
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-bold text-zinc-900 dark:text-zinc-100">{store?.name ?? "Duka"}</p>
            {storeUrl && (
              <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate text-[11px] text-zinc-400 hover:text-accent-600">
                <span className="truncate">{storeHost}</span> <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              </a>
            )}
          </div>
        )}
        {onClose && (
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="no-scrollbar flex-1 overflow-y-auto px-2 py-2">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter(({ href }) => allowedPath(role, href));
          if (!items.length) return null;
          return (
            <div key={group.label} className="mb-2">
              {rail ? (
                <div className="mx-2 my-1.5 border-t border-zinc-100 first:hidden dark:border-zinc-800" />
              ) : (
                <p className="px-2 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">{group.label}</p>
              )}
              {items.map(({ href, label, icon: Icon, pro, tag, color }) => {
                const active = isActiveHref(pathname, href) || (href !== "/dashboard" && pathname.startsWith(href));
                const needs = featureForPath(href);
                const locked = features ? !!needs && !features.includes(needs) : pro && !isPro;
                const badge = badges[href] ?? 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    title={rail ? label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-8 items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors",
                      rail ? "justify-center px-0" : "px-2",
                      active
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" style={color && !active ? { color } : undefined} />
                    {!rail && <span className="truncate">{label}</span>}
                    {!rail && tag && !badge && (
                      <span className={cn("ml-auto rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide", active ? "bg-white/20" : "bg-[#25D366] text-white")}>{tag}</span>
                    )}
                    {rail && tag && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#25D366]" />}
                    {!rail && locked && !tag && (
                      <span className="ml-auto rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-300 dark:text-amber-400 dark:ring-amber-700">Pro</span>
                    )}
                    {badge > 0 &&
                      (rail ? (
                        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent-500" />
                      ) : (
                        <span className={cn("ml-auto min-w-[18px] rounded-full px-1.5 text-center text-[10px] font-bold leading-[18px]", active ? "bg-white/20" : "bg-accent-400 text-black")}>
                          {badge > 99 ? "99+" : badge}
                        </span>
                      ))}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn("flex shrink-0 items-center gap-1 border-t border-zinc-100 p-2 dark:border-zinc-800", rail && "flex-col")}>
        <button
          onClick={handleLogout}
          title="Sign out"
          className={cn(
            "flex h-8 items-center gap-2.5 rounded-md text-[13px] font-medium text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400",
            rail ? "w-8 justify-center" : "flex-1 px-2",
          )}
        >
          <LogOut className="h-4 w-4" />
          {!rail && "Sign out"}
        </button>
        {!onClose && (
          <button
            onClick={() => setCollapsed(!rail)}
            title={rail ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
          >
            {rail ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  const { open, setOpen } = useDashboardDrawer();
  const collapsed = useRail();

  return (
    <>
      {/* Mobile drawer */}
      {open && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-100 bg-white shadow-xl transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent {...props} onClose={() => setOpen(false)} />
      </aside>

      {/* Desktop: full sidebar or icon rail */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-zinc-100 bg-white transition-[width] duration-200 dark:border-zinc-800 dark:bg-zinc-950 lg:flex",
          collapsed ? "w-14" : "w-56",
        )}
      >
        <SidebarContent {...props} rail={collapsed} />
      </aside>
    </>
  );
}

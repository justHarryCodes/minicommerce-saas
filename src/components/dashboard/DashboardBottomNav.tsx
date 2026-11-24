"use client";

// Phone navigation, shaped like the apps vendors already live in: a tab bar
// along the bottom (Instagram / TikTok), a create button in the middle that
// opens a sheet of "new" things, and the store's own picture as the last tab
// (the Instagram profile tab), which opens the store menu.
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes, CalendarDays, Film, FilePlus2, FolderPlus, Home, LayoutGrid, PackagePlus, Plus, ReceiptText, ScanBarcode, Share2, TicketPercent, X, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { allowedPath, type Role } from "@/lib/access-shared";
import { clLogo } from "@/lib/cloudinary";
import ShareButton from "./ShareButton";

type Tab = { href: string; label: string; icon: LucideIcon; exact?: boolean; badgeKey?: "orders" };

const OWNER_TABS: Tab[] = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/orders", label: "Orders", icon: ReceiptText, badgeKey: "orders" },
  { href: "/dashboard/products", label: "Products", icon: LayoutGrid },
];
const ROLE_TABS: Record<Exclude<Role, "owner">, Tab[]> = {
  manager: OWNER_TABS,
  staff: [
    { href: "/dashboard/orders", label: "Orders", icon: ReceiptText, badgeKey: "orders" },
    { href: "/dashboard/bookings", label: "Bookings", icon: CalendarDays },
    { href: "/dashboard/inventory", label: "Stock", icon: Boxes },
  ],
};

export const CREATE_ACTIONS: { href: string; label: string; hint: string; icon: LucideIcon; tone: string }[] = [
  { href: "/dashboard/products/new", label: "Product", hint: "Something new to sell", icon: PackagePlus, tone: "bg-amber-400 text-black" },
  { href: "/dashboard/pos", label: "Shop sale", hint: "A sale in your shop", icon: ScanBarcode, tone: "bg-emerald-500 text-white" },
  { href: "/dashboard/coupons", label: "Discount", hint: "A code for customers", icon: TicketPercent, tone: "bg-pink-500 text-white" },
  { href: "/dashboard/reels", label: "Reel", hint: "A short product video", icon: Film, tone: "bg-violet-500 text-white" },
  { href: "/dashboard/categories", label: "Category", hint: "Group your products", icon: FolderPlus, tone: "bg-sky-500 text-white" },
  { href: "/dashboard/pages", label: "Page or post", hint: "About us, FAQ, blog", icon: FilePlus2, tone: "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900" },
];

export default function DashboardBottomNav({
  role = "owner",
  store,
  badges = {},
}: {
  role?: Role;
  store?: { name: string; logoUrl?: string | null; url: string; slug: string };
  badges?: { orders?: number };
}) {
  const pathname = usePathname();
  const [sheet, setSheet] = useState(false);
  const tabs = role === "owner" ? OWNER_TABS : ROLE_TABS[role];
  const actions = CREATE_ACTIONS.filter((a) => allowedPath(role, a.href));

  // Close the sheet when the page changes
  useEffect(() => setSheet(false), [pathname]);

  const isActive = (t: { href: string; exact?: boolean }) => (t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(t.href + "/"));
  const meActive = pathname.startsWith("/dashboard/me");

  const tab = (t: Tab) => {
    const active = isActive(t);
    const badge = t.badgeKey ? badges[t.badgeKey] ?? 0 : 0;
    return (
      <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className="relative flex flex-1 flex-col items-center justify-center gap-0.5">
        <span className="relative">
          <t.icon className={cn("h-[25px] w-[25px] transition-colors", active ? "text-zinc-950 dark:text-white" : "text-zinc-400 dark:text-zinc-500")} strokeWidth={active ? 2.4 : 1.8} />
          {badge > 0 && (
            <span className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full border-2 border-white bg-red-500 px-1 text-center text-[10px] font-bold leading-[14px] text-white dark:border-zinc-950">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </span>
        <span className={cn("text-[10.5px]", active ? "font-bold text-zinc-950 dark:text-white" : "font-medium text-zinc-400 dark:text-zinc-500")}>{t.label}</span>
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/70 bg-white/95 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex h-[60px] items-stretch">
          {tab(tabs[0])}
          {tab(tabs[1])}

          {/* Create: TikTok-style "+" */}
          <div className="flex flex-1 items-center justify-center">
            {actions.length > 0 ? (
              <button type="button" onClick={() => setSheet(true)} aria-label="Create something new" aria-expanded={sheet} className="group relative h-[34px] w-[50px] active:scale-95 transition-transform">
                <span className="absolute inset-y-0 left-0 w-[44px] rounded-[11px] bg-amber-400" />
                <span className="absolute inset-y-0 right-0 w-[44px] rounded-[11px] bg-orange-500" />
                <span className="absolute inset-y-0 left-[3px] flex w-[44px] items-center justify-center rounded-[11px] bg-zinc-950 dark:bg-white">
                  <Plus className="h-5 w-5 text-white dark:text-zinc-950" strokeWidth={3} />
                </span>
              </button>
            ) : null}
          </div>

          {tab(tabs[2])}

          {/* The store's picture opens the store menu (Instagram profile tab) */}
          <Link href="/dashboard/me" aria-current={meActive ? "page" : undefined} className="flex flex-1 flex-col items-center justify-center gap-0.5">
            <span className={cn("rounded-full p-[2px]", meActive ? "ring-2 ring-zinc-950 dark:ring-white" : "")}>
              {store?.logoUrl ? (
                <Image src={clLogo(store.logoUrl)} alt="" width={26} height={26} className="h-[24px] w-[24px] rounded-full bg-white object-contain ring-1 ring-black/10" />
              ) : (
                <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-amber-400 text-[11px] font-black text-black">{(store?.name ?? "D").charAt(0).toUpperCase()}</span>
              )}
            </span>
            <span className={cn("text-[10.5px]", meActive ? "font-bold text-zinc-950 dark:text-white" : "font-medium text-zinc-400 dark:text-zinc-500")}>Store</span>
          </Link>
        </div>
      </nav>

      {sheet && <CreateSheet actions={actions} store={store} onClose={() => setSheet(false)} />}
    </>
  );
}

/** Bottom sheet of things to create (Instagram's "Create" sheet). */
function CreateSheet({ actions, store, onClose }: { actions: typeof CREATE_ACTIONS; store?: { name: string; url: string; slug: string }; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Create">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white px-4 pb-6 pt-2 shadow-2xl animate-slide-up dark:bg-zinc-900" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Create</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-x-2 gap-y-4">
          {actions.map((a) => (
            <Link key={a.href} href={a.href} onClick={onClose} className="flex flex-col items-center gap-1.5 text-center active:scale-95 transition-transform">
              <span className={cn("flex h-[58px] w-[58px] items-center justify-center rounded-[20px] shadow-sm", a.tone)}>
                <a.icon className="h-6 w-6" strokeWidth={2.2} />
              </span>
              <span className="text-[13px] font-semibold leading-tight text-zinc-900 dark:text-white">{a.label}</span>
              <span className="-mt-1 text-[11px] leading-tight text-zinc-500">{a.hint}</span>
            </Link>
          ))}
        </div>
        {store && (
          <ShareButton target={{ kind: "store", title: store.name, url: store.url, cardPath: `/api/og/store/${store.slug}` }} className="mt-5 flex w-full items-center gap-3 rounded-2xl bg-zinc-100 px-4 py-3 text-left dark:bg-zinc-800">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white">
              <Share2 className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-zinc-900 dark:text-white">Share your store link</span>
              <span className="block truncate text-[12px] text-zinc-500">{store.url.replace(/^https:\/\//, "")}</span>
            </span>
          </ShareButton>
        )}
      </div>
    </div>
  );
}

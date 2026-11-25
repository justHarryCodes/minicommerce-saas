"use client";

// The phone "Store" tab, laid out like an Instagram profile: the store's
// picture and three numbers, Edit / Share buttons, a row of round shortcuts
// (like story highlights), then every tool as a plain list with a one-line
// explanation, so nothing needs a manual.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  ChevronRight, Eye, FileText, Film, LifeBuoy, LogOut, Palette, PanelsTopLeft, Share2, Sparkles, Star, TicketPercent, type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/firebase-client";
import { cn } from "@/lib/utils";
import { allowedPath, ROLE_LABEL, type Role } from "@/lib/access-shared";
import { featureForPath, type Feature } from "@/lib/features-shared";
import { clLogo } from "@/lib/cloudinary";
import ShareButton from "@/components/dashboard/ShareButton";
import { NAV_GROUPS } from "@/components/dashboard/nav-config";
import { Avatar, StoryBubble } from "./parts";
import SocialIcon from "@/components/SocialIcon";

/** Items already on the tab bar aren't repeated in the list. */
const ON_TAB_BAR = new Set(["/dashboard", "/dashboard/orders", "/dashboard/products"]);

const GROUP_TONE: Record<string, string> = {
  "Add-ons": "bg-[#25D366] text-white",
  Sell: "bg-amber-400 text-black",
  Catalog: "bg-sky-500 text-white",
  Customers: "bg-pink-500 text-white",
  Store: "bg-violet-500 text-white",
  Account: "bg-zinc-700 text-white dark:bg-zinc-200 dark:text-zinc-900",
};
const GROUP_TITLE: Record<string, string> = {
  "Add-ons": "Add-ons",
  Sell: "Selling",
  Catalog: "Your products",
  Customers: "Customers",
  Store: "How your store looks",
  Account: "Account",
};

const HIGHLIGHTS: { href: string; label: string; icon: LucideIcon; tone: string }[] = [
  { href: "/dashboard/themes", label: "Look", icon: Palette, tone: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300" },
  { href: "/dashboard/storefront", label: "Banners", icon: PanelsTopLeft, tone: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300" },
  { href: "/dashboard/coupons", label: "Discounts", icon: TicketPercent, tone: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300" },
  { href: "/dashboard/reels", label: "Reels", icon: Film, tone: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  { href: "/dashboard/reviews", label: "Reviews", icon: Star, tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
  { href: "/dashboard/pages", label: "Pages", icon: FileText, tone: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200" },
];

export interface StoreHubProps {
  store: { name: string; slug: string; logoUrl?: string | null; url: string };
  plan: { name: string; isPro: boolean };
  stats: { products: number; orders: number; visitors: number };
  role: Role;
  features: Feature[];
  badges?: Record<string, number>;
}

export default function StoreHub({ store, plan, stats, role, features, badges = {} }: StoreHubProps) {
  const router = useRouter();
  const owner = role === "owner";
  const host = store.url.replace(/^https?:\/\//, "");
  const logo = store.logoUrl ? clLogo(store.logoUrl) : null;

  const logout = async () => {
    await signOut(auth);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  };

  return (
    <div className="-mx-3 pb-6 sm:-mx-4">
      {/* ── Profile header ── */}
      <section className="px-4 pt-4">
        <div className="flex items-center gap-5">
          <a href={store.url} target="_blank" rel="noopener noreferrer" aria-label="Open your store" className="shrink-0 rounded-full bg-[conic-gradient(from_200deg,#f59e0b,#f97316,#ef4444,#f59e0b)] p-[3px]">
            <span className="block rounded-full bg-white p-[3px] dark:bg-zinc-950">
              <Avatar name={store.name} src={logo} size={80} />
            </span>
          </a>
          <dl className="grid flex-1 grid-cols-3 text-center">
            {[
              { n: stats.products, l: "Products", href: "/dashboard/products" },
              { n: stats.orders, l: "Orders", href: "/dashboard/orders" },
              { n: stats.visitors, l: "Visitors", href: "/dashboard/analytics", sub: "7 days" },
            ].map((s) => (
              <Link key={s.l} href={s.href} className="flex flex-col-reverse items-center">
                <dt className="text-[13px] leading-tight text-zinc-600 dark:text-zinc-400">
                  {s.l}
                  {s.sub && <span className="block text-[10.5px] text-zinc-400">{s.sub}</span>}
                </dt>
                <dd className="text-[19px] font-bold tabular-nums text-zinc-950 dark:text-white">{s.n.toLocaleString("en-NG")}</dd>
              </Link>
            ))}
          </dl>
        </div>

        <div className="mt-3">
          <p className="flex items-center gap-2 text-[15px] font-bold text-zinc-950 dark:text-white">
            {store.name}
            <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide", plan.isPro ? "bg-amber-400 text-black" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300")}>
              {plan.isPro ? plan.name : `${plan.name} plan`}
            </span>
          </p>
          {!owner && <p className="text-[13px] text-zinc-500">You&apos;re signed in as {ROLE_LABEL[role]}</p>}
          <a href={store.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate text-[14px] font-medium text-amber-700 dark:text-amber-400">
            {host}
          </a>
        </div>

        {/* Instagram-style buttons */}
        <div className="mt-3 flex gap-1.5">
          {owner && (
            <Link href="/dashboard/settings" className="flex h-9 flex-1 items-center justify-center rounded-lg bg-zinc-100 text-[14px] font-semibold text-zinc-900 active:bg-zinc-200 dark:bg-zinc-800 dark:text-white">
              Edit store
            </Link>
          )}
          <ShareButton target={{ kind: "store", title: store.name, url: store.url, cardPath: `/api/og/store/${store.slug}` }} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-100 text-[14px] font-semibold text-zinc-900 active:bg-zinc-200 dark:bg-zinc-800 dark:text-white">
            <Share2 className="h-4 w-4" /> Share store
          </ShareButton>
          <a href={store.url} target="_blank" rel="noopener noreferrer" aria-label="View your store" className="flex h-9 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 active:bg-zinc-200 dark:bg-zinc-800 dark:text-white">
            <Eye className="h-[18px] w-[18px]" />
          </a>
        </div>
      </section>

      {/* ── Highlights ── */}
      {owner && (
        <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {HIGHLIGHTS.map((h) => (
            <StoryBubble key={h.href} href={h.href} label={h.label} icon={h.icon} tone={h.tone} />
          ))}
        </div>
      )}

      {/* ── Every tool, in plain words ── */}
      <div className="mt-2 space-y-5 px-4 pt-3">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((i) => !ON_TAB_BAR.has(i.href) && allowedPath(role, i.href));
          if (!items.length) return null;
          return (
            <section key={group.label}>
              <h2 className="mb-1.5 px-1 text-[13px] font-semibold text-zinc-500 dark:text-zinc-400">{GROUP_TITLE[group.label] ?? group.label}</h2>
              <ul className="overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200/70 dark:bg-zinc-900 dark:ring-zinc-800">
                {items.map((item, i) => {
                  const needs = featureForPath(item.href);
                  const locked = !!needs && !features.includes(needs);
                  const badge = badges[item.href] ?? 0;
                  return (
                    <li key={item.href} className={cn(i > 0 && "border-t border-zinc-100 dark:border-zinc-800")}>
                      <Link href={item.href} className="flex items-center gap-3 px-3 py-2.5 active:bg-zinc-50 dark:active:bg-zinc-800/60">
                        {item.social ? (
                          <SocialIcon name={item.social} size={36} label="" className="rounded-[11px]" />
                        ) : (
                          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]", item.color ? "text-white" : GROUP_TONE[group.label])} style={item.color ? { background: item.color } : undefined}>
                            <item.icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold leading-tight text-zinc-900 dark:text-white">{item.label}</span>
                          {item.hint && <span className="mt-0.5 block truncate text-[12.5px] leading-tight text-zinc-500">{item.hint}</span>}
                        </span>
                        {badge > 0 && <span className="min-w-[22px] rounded-full bg-red-500 px-1.5 text-center text-[11px] font-bold leading-[20px] text-white">{badge}</span>}
                        {item.tag && !badge && <span className="rounded-full bg-[#25D366] px-2 py-0.5 text-[10px] font-bold uppercase text-white">{item.tag}</span>}
                        {locked && !item.tag && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">Pro</span>}
                        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {/* Help + sign out */}
        <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200/70 dark:bg-zinc-900 dark:ring-zinc-800">
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("duka-assistant:open"))} className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-zinc-50 dark:active:bg-zinc-800/60">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-amber-400 to-orange-500 text-black">
              <Sparkles className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-tight text-zinc-900 dark:text-white">Need help?</span>
              <span className="mt-0.5 block text-[12.5px] leading-tight text-zinc-500">Ask the Duka Assistant anything</span>
            </span>
            <LifeBuoy className="h-4 w-4 text-zinc-300 dark:text-zinc-600" />
          </button>
          <button type="button" onClick={logout} className="flex w-full items-center gap-3 border-t border-zinc-100 px-3 py-3 text-left text-[15px] font-semibold text-red-600 active:bg-red-50 dark:border-zinc-800 dark:active:bg-red-950/30">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-red-50 dark:bg-red-950/40">
              <LogOut className="h-[18px] w-[18px]" />
            </span>
            Sign out
          </button>
        </section>
        <p className="pb-2 text-center text-[11px] text-zinc-400">Duka by Awarizon</p>
      </div>
    </div>
  );
}

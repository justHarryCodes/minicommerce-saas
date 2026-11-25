// Dashboard home on phones. Familiar shapes instead of tables:
//   • a stories row (Instagram / WhatsApp status) for things waiting on you,
//     setup steps and shortcuts
//   • one bold "today" card (Snapchat-yellow)
//   • recent orders as a chat list (WhatsApp)
//   • best sellers as tall swipeable cards (TikTok / Reels)
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3, Film, LayoutTemplate, Rocket, Settings, CalendarDays, ChevronRight, Landmark, Lock, Package, PackagePlus, PackageX, Palette, ScanBarcode, ShoppingBag, ShoppingCart, TicketPercent, TrendingDown, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { clCard } from "@/lib/cloudinary";
import { allowedPath, type Role } from "@/lib/access-shared";
import { timeAgo } from "@/components/dashboard/ui";
import { Avatar, ORDER_WORDS, SectionTitle, StoryBubble, needsAction } from "@/components/dashboard/mobile/parts";
import ShareBubble from "@/components/dashboard/mobile/ShareBubble";

export interface MobileHomeData {
  pro: boolean;
  role: Role;
  firstName?: string;
  store: { name: string; slug: string; url: string; logo: string | null };
  k: { revToday: number; ordersToday: number; rev7: number; revPrev7: number; orders7: number; products: number };
  visitors7: number;
  series: { date: string; value: number }[];
  attention: { newOrders: number; transfers: number; outOfStock: number; lowStock: number; bookingsToday: number; abandoned: number };
  checklist: { id: string; label: string; done: boolean; href: string }[];
  recent: { id: string; order_number: string; customer_name: string; total: string; order_status: string; payment_status: string; created_at: string; items: string; channel: string | null }[];
  top: { name: string; image: string | null; qty: string; revenue: string }[];
}

const SETUP_ICON: Record<string, { icon: LucideIcon; label: string }> = {
  product: { icon: PackagePlus, label: "Add product" },
  payment: { icon: Wallet, label: "Get paid" },
  logo: { icon: Package, label: "Add logo" },
  theme: { icon: Palette, label: "Pick a look" },
};

function greeting(): string {
  const h = Number(new Date().toLocaleString("en-NG", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** Stories row, today card and setup progress. */
export function MobileHomeTop({ d }: { d: MobileHomeData }) {
  const a = d.attention;
  const waiting = [
    { n: a.newOrders, label: "New orders", href: "/dashboard/orders?view=new", icon: ShoppingBag },
    { n: a.transfers, label: "Check bank", href: "/dashboard/orders?view=payment", icon: Landmark },
    { n: a.bookingsToday, label: "Bookings", href: "/dashboard/bookings", icon: CalendarDays },
    { n: a.outOfStock, label: "Sold out", href: "/dashboard/products?filter=out", icon: PackageX },
    { n: a.lowStock, label: "Running low", href: "/dashboard/products?filter=low", icon: TrendingDown },
    { n: a.abandoned, label: "Didn't pay", href: "/dashboard/abandoned", icon: ShoppingCart },
  ].filter((t) => t.n > 0 && allowedPath(d.role, t.href));
  const setup = d.checklist.filter((c) => !c.done && SETUP_ICON[c.id] && allowedPath(d.role, c.href));
  // Quick actions: the things vendors do most, one tap away (owner/manager see what their role allows)
  const shortcuts: { href: string; label: string; icon?: LucideIcon; src?: string; tone: string }[] = [
    { href: "/dashboard/themes", label: "Customize", icon: Palette, tone: "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white" },
    { href: "/dashboard/products/new", label: "Add product", icon: PackagePlus, tone: "bg-amber-400 text-black" },
    { href: "/dashboard/storefront", label: "Banners", icon: LayoutTemplate, tone: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300" },
    { href: "/dashboard/coupons", label: "Discounts", icon: TicketPercent, tone: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300" },
    { href: "/dashboard/growth", label: "Grow", icon: Rocket, tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
    { href: "/dashboard/whatsapp", label: "WhatsApp", src: "/social/whatsapp.png", tone: "" },
    { href: "/dashboard/reels", label: "Reels", icon: Film, tone: "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" },
    { href: "/dashboard/pos", label: "Shop sale", icon: ScanBarcode, tone: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300" },
    { href: "/dashboard/customers", label: "Customers", icon: Users, tone: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300" },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, tone: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" },
    { href: "/dashboard/settings", label: "Settings", icon: Settings, tone: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200" },
  ].filter((s) => allowedPath(d.role, s.href));
  const canShare = allowedPath(d.role, "/dashboard/settings");

  const doneCount = d.checklist.filter((c) => c.done).length;
  const nextStep = d.checklist.find((c) => !c.done && c.href);
  const delta = d.k.revPrev7 > 0 ? Math.round(((d.k.rev7 - d.k.revPrev7) / d.k.revPrev7) * 100) : null;
  const last7 = d.series.slice(-7);
  const max = Math.max(1, ...last7.map((s) => s.value));

  return (
    <div className="-mx-3 sm:-mx-4">
      <p className="px-4 pt-3 text-[14px] text-zinc-500 dark:text-zinc-400">
        {greeting()}
        {d.firstName ? `, ${d.firstName}` : ""} 👋
      </p>

      {/* Stories */}
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 pt-3">
        <StoryBubble href={d.store.url} external label="Your store" src={d.store.logo} icon={ShoppingBag} ring="hot" tone="bg-amber-400 text-black" />
        {waiting.map((t) => (
          <StoryBubble key={t.href} href={t.href} label={t.label} icon={t.icon} ring="hot" count={t.n} tone="bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" />
        ))}
        {setup.map((c) => (
          <StoryBubble key={c.id} href={c.href} label={SETUP_ICON[c.id].label} icon={SETUP_ICON[c.id].icon} ring="todo" tone="bg-white text-amber-600 dark:bg-zinc-900 dark:text-amber-400" />
        ))}
        {shortcuts.slice(0, 2).map((s) => (
          <StoryBubble key={s.href} href={s.href} label={s.label} icon={s.icon} src={s.src} tone={s.tone} />
        ))}
        {canShare && <ShareBubble store={d.store} />}
        {shortcuts.slice(2).map((s) => (
          <StoryBubble key={s.href} href={s.href} label={s.label} icon={s.icon} src={s.src} tone={s.tone} />
        ))}
      </div>

      {/* Today card */}
      <div className="px-4 pt-4">
        <section className="relative overflow-hidden rounded-[26px] bg-amber-400 p-5 text-black shadow-[0_18px_40px_-24px_rgba(245,158,11,0.9)]">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/25" aria-hidden />
          <p className="relative text-[13px] font-semibold uppercase tracking-wider text-black/60">Today</p>
          {d.pro ? (
            <>
              <p className="relative mt-1 text-[34px] font-black leading-none tracking-tight tabular-nums">{formatCurrency(d.k.revToday)}</p>
              <p className="relative mt-1.5 text-[14px] font-medium text-black/70">
                {d.k.ordersToday} order{d.k.ordersToday === 1 ? "" : "s"} today
              </p>
            </>
          ) : (
            <>
              <p className="relative mt-1 text-[34px] font-black leading-none tracking-tight tabular-nums">
                {d.k.ordersToday} <span className="text-[20px] font-bold">order{d.k.ordersToday === 1 ? "" : "s"}</span>
              </p>
              <Link href="/dashboard/billing" className="relative mt-2 inline-flex items-center gap-1.5 rounded-full bg-black/10 px-3 py-1 text-[12.5px] font-semibold">
                <Lock className="h-3.5 w-3.5" /> See your sales in naira with Pro
              </Link>
            </>
          )}

          {d.pro && (
            <div className="relative mt-4 flex h-12 items-end gap-1.5" aria-hidden>
              {last7.map((s, i) => (
                <span key={s.date} className={`flex-1 rounded-t-md ${i === last7.length - 1 ? "bg-black" : "bg-black/25"}`} style={{ height: `${Math.max(8, (s.value / max) * 100)}%` }} />
              ))}
            </div>
          )}

          <div className="relative mt-4 grid grid-cols-3 gap-2">
            {d.pro ? (
              <TodayChip label="This week" value={formatCurrency(d.k.rev7)} sub={delta == null ? undefined : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}%`} />
            ) : (
              <TodayChip label="Waiting" value={String(a.newOrders + a.transfers)} sub="on you" />
            )}
            <TodayChip label="Orders" value={String(d.k.orders7)} sub="this week" />
            {d.pro ? <TodayChip label="Visitors" value={String(d.visitors7)} sub="this week" /> : <TodayChip label="Products" value={String(d.k.products)} sub="live" />}
          </div>
        </section>
      </div>

      {/* Setup progress */}
      {nextStep && doneCount < d.checklist.length && (
        <div className="px-4 pt-3">
          <Link href={nextStep.href} className="flex items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-zinc-200/70 active:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-800">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-zinc-900 dark:text-white" style={{ background: `conic-gradient(#f59e0b ${(doneCount / d.checklist.length) * 360}deg, rgba(161,161,170,0.25) 0)` }}>
              <span className="absolute inset-[4px] rounded-full bg-white dark:bg-zinc-900" />
              <span className="relative">{doneCount}/{d.checklist.length}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-zinc-900 dark:text-white">Finish setting up</span>
              <span className="block truncate text-[13px] text-zinc-500">Next: {nextStep.label}</span>
            </span>
            <ChevronRight className="h-5 w-5 text-zinc-300" />
          </Link>
        </div>
      )}
    </div>
  );
}

function TodayChip({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/45 px-2.5 py-2">
      <p className="truncate text-[11px] font-semibold text-black/60">{label}</p>
      <p className="truncate text-[15px] font-extrabold tabular-nums">{value}</p>
      {sub && <p className="truncate text-[10.5px] font-medium text-black/55">{sub}</p>}
    </div>
  );
}

/** Recent orders as a chat list, then best sellers as tall cards. */
export function MobileHomeBottom({ d }: { d: MobileHomeData }) {
  const now = new Date();
  return (
    <div className="-mx-3 sm:-mx-4">
      <SectionTitle title="Recent orders" href="/dashboard/orders" />
      {d.recent.length === 0 ? (
        <div className="mx-4 rounded-2xl bg-white px-4 py-8 text-center ring-1 ring-zinc-200/70 dark:bg-zinc-900 dark:ring-zinc-800">
          <ShoppingBag className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-2 text-[15px] font-semibold text-zinc-900 dark:text-white">No orders yet</p>
          <p className="mt-0.5 text-[13px] text-zinc-500">Share your store link and orders will show up here.</p>
        </div>
      ) : (
        <ul className="bg-white dark:bg-zinc-900">
          {d.recent.map((o) => {
            const hot = needsAction(o);
            const items = Number(o.items);
            return (
              <li key={o.id}>
                <Link href={`/dashboard/orders?id=${o.id}`} className="flex items-center gap-3 px-4 py-2.5 active:bg-zinc-50 dark:active:bg-zinc-800/60">
                  <Avatar name={o.customer_name} size={50} />
                  <span className="min-w-0 flex-1 border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-zinc-950 dark:text-white">{o.customer_name}</span>
                      <span className={`shrink-0 text-[12px] ${hot ? "font-semibold text-amber-600 dark:text-amber-400" : "text-zinc-400"}`}>{timeAgo(o.created_at, now)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[14px] text-zinc-500">
                        {o.payment_status === "pending_confirmation" ? "Check your bank" : ORDER_WORDS[o.order_status] ?? o.order_status} · {items} item{items === 1 ? "" : "s"} · {formatCurrency(Number(o.total))}
                      </span>
                      {hot && <span className="h-[18px] w-[18px] shrink-0 rounded-full bg-amber-500 text-center text-[11px] font-bold leading-[18px] text-white">1</span>}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {d.top.length > 0 && (
        <>
          <SectionTitle title="Best sellers" href="/dashboard/products" cta="All products" />
          <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 pb-2">
            {d.top.map((p, i) => (
              <div key={p.name} className="relative h-[190px] w-[124px] shrink-0 overflow-hidden rounded-2xl bg-zinc-200 dark:bg-zinc-800">
                {p.image ? (
                  <Image src={clCard(p.image)} alt="" fill sizes="124px" className="object-cover" />
                ) : (
                  <Package className="absolute left-1/2 top-1/3 h-8 w-8 -translate-x-1/2 text-zinc-400" />
                )}
                <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">#{i + 1}</span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2.5 pb-2.5 pt-10">
                  <span className="line-clamp-2 text-[13px] font-semibold leading-tight text-white">{p.name}</span>
                  <span className="mt-0.5 block text-[11.5px] text-white/80">
                    {Number(p.qty)} sold{d.pro ? ` · ${formatCurrency(Number(p.revenue))}` : ""}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

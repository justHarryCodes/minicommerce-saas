"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowRight, Check, Copy, Download, Eye, Gift, HeartHandshake, Lock, Megaphone, MessageCircle, Repeat, Search, Sparkles, Star, UserPlus, Users,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { whatsappLink } from "@/lib/phone";
import { SOURCE_LABELS, type TrafficSource } from "@/lib/traffic-source";
import { SHARE_CHANNELS, WELCOME_PERCENTS, trackedLink, welcomeHeadline, type ContactRow, type GrowthStats } from "@/lib/growth-shared";
import ShareButton from "@/components/dashboard/ShareButton";
import { FLOWS, type AutomationSettings } from "@/lib/growth-automations-shared";
import type { AutomationResult } from "@/lib/growth-automations";
import type { ReferralSettings, ReferralStats } from "@/lib/growth-referrals-shared";
import BroadcastCard, { type BroadcastProps } from "./BroadcastCard";
import ReferralCard from "./ReferralCard";
import SocialIcon, { type SocialName } from "@/components/SocialIcon";

interface Props {
  store: { name: string; slug: string; url: string };
  stats: GrowthStats;
  contacts: ContactRow[];
  days: number;
  limited: boolean;
  couponsAllowed: boolean;
  welcome: { enabled: boolean; percent: number; headline: string };
  automations: { allowed: boolean; settings: AutomationSettings; results: AutomationResult[] };
  broadcasts: BroadcastProps;
  referrals: { allowed: boolean; settings: ReferralSettings; stats: ReferralStats };
  giftCardsAllowed: boolean;
}

const card = "rounded-2xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900";
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : "–");
const sourceLabel = (s: string | null) => (s ? SOURCE_LABELS[s as TrafficSource] ?? s : "Unknown");

export default function GrowthClient({ store, stats, contacts, days, limited, couponsAllowed, welcome, automations, broadcasts, referrals, giftCardsAllowed }: Props) {
  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-6 pt-2 lg:pt-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-amber-500" /> Growth
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Reach more people, turn visitors into buyers, and bring buyers back.</p>
        </div>
        <nav className="flex w-fit rounded-xl border border-zinc-200 p-0.5 dark:border-zinc-700" aria-label="Date range">
          {[7, 30, 90].map((r) =>
            limited && r !== days ? (
              <Link key={r} href="/dashboard/billing" title="Upgrade to Pro for longer history" className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                <Lock className="h-3 w-3" /> {r} days
              </Link>
            ) : (
              <Link key={r} href={`/dashboard/growth?range=${r}`} aria-current={r === days ? "page" : undefined} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", r === days ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white")}>
                {r} days
              </Link>
            ),
          )}
        </nav>
      </div>

      <Funnel stats={stats} />

      <div className="grid gap-4 lg:grid-cols-2">
        <WelcomeCard store={store} welcome={welcome} stats={stats} allowed={couponsAllowed} />
        <ShareCard store={store} />
      </div>

      <Automations store={store} automations={automations} days={days} welcomePercent={welcome.percent} />

      <BroadcastCard store={store} data={broadcasts} contacts={contacts} />

      <ReferralCard data={referrals} giftCardsAllowed={giftCardsAllowed} />

      <Channels stats={stats} />

      <Audience store={store} contacts={contacts} total={stats.totalContacts} />
    </div>
  );
}

/* ───────────────────────── The loop ───────────────────────── */

function Funnel({ stats }: { stats: GrowthStats }) {
  const steps = [
    { icon: Eye, label: "Reach", title: "Visitors", value: stats.visitors, note: "people who opened your store", tone: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
    { icon: UserPlus, label: "Capture", title: "New contacts", value: stats.newContacts, note: `${pct(stats.newContacts, stats.visitors)} of visitors joined your list`, tone: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
    { icon: Gift, label: "Convert", title: "First orders", value: stats.firstOrders, note: "new customers who bought", tone: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
    { icon: Repeat, label: "Bring back", title: "Returning buyers", value: stats.returningBuyers, note: `${stats.repeatRate}% of all your buyers came back`, tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  ];
  return (
    <section className={cn(card, "p-4 sm:p-5")}>
      <ol className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.label} className="relative rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2">
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", s.tone)}>
                <s.icon className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                {i + 1}. {s.label}
              </span>
            </div>
            <p className="mt-3 text-3xl font-black tabular-nums tracking-tight text-zinc-900 dark:text-white">{s.value.toLocaleString("en-NG")}</p>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{s.title}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{s.note}</p>
            {i < steps.length - 1 && (
              <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-white p-0.5 text-zinc-400 shadow-sm dark:bg-zinc-900 lg:block" />
            )}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-zinc-100 pt-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <span>
          Sales: <strong className="text-zinc-900 dark:text-white">{formatCurrency(stats.revenue)}</strong>
        </span>
        <span>
          From returning buyers: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.returningRevenue)}</strong>
        </span>
        <span>
          Your list: <strong className="text-zinc-900 dark:text-white">{stats.totalContacts.toLocaleString("en-NG")}</strong> people
        </span>
      </div>
    </section>
  );
}

/* ───────────────────────── Capture: welcome offer ───────────────────────── */

function WelcomeCard({ store, welcome, stats, allowed }: { store: Props["store"]; welcome: Props["welcome"]; stats: GrowthStats; allowed: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(welcome.enabled);
  const [percent, setPercent] = useState(welcome.percent);
  const [headline, setHeadline] = useState(welcome.headline);
  const [saving, setSaving] = useState(false);
  const dirty = enabled !== welcome.enabled || percent !== welcome.percent || headline !== welcome.headline;

  async function save(next?: { enabled: boolean }) {
    const body = { welcomeEnabled: next?.enabled ?? enabled, welcomePercent: percent, welcomeHeadline: headline.trim() || null };
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/growth", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't save");
      toast.success(body.welcomeEnabled ? "Welcome offer is live on your store" : "Welcome offer turned off");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
      if (next) setEnabled(!next.enabled);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={cn(card, "p-4 sm:p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Capture</p>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Welcome offer</h2>
          <p className="mt-0.5 text-sm text-zinc-500">A pop-up gives new visitors their own first-order code when they leave their WhatsApp number. They join your list.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Welcome offer on your store"
          disabled={saving || !allowed}
          onClick={() => {
            const v = !enabled;
            setEnabled(v);
            void save({ enabled: v });
          }}
          className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50", enabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700")}
        >
          <span className={cn("absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform", enabled ? "translate-x-5" : "translate-x-0")} />
        </button>
      </div>

      {!allowed ? (
        <Link href="/dashboard/billing" className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <Lock className="h-4 w-4" /> Your plan doesn&apos;t include discount codes. Upgrade to use the welcome offer.
        </Link>
      ) : (
        <>
          {/* What shoppers see */}
          <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-4 text-center text-black">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">{store.name}</p>
            <p className="text-3xl font-black leading-tight">{percent}% OFF</p>
            <p className="text-sm font-semibold">{welcomeHeadline(percent, headline)}</p>
            <p className="mt-1 text-[11px] opacity-70">Preview. Your store&apos;s own colours are used.</p>
          </div>

          <p className="mb-1.5 mt-4 text-xs font-semibold text-zinc-600 dark:text-zinc-300">Discount</p>
          <div className="flex gap-2">
            {WELCOME_PERCENTS.map((p) => (
              <button key={p} type="button" onClick={() => setPercent(p)} aria-pressed={percent === p} className={cn("h-9 flex-1 rounded-xl text-sm font-bold", percent === p ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200")}>
                {p}%
              </button>
            ))}
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Headline (optional)</span>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={80} placeholder={welcomeHeadline(percent)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" />
          </label>
          {dirty && (
            <button type="button" onClick={() => void save()} disabled={saving} className="mt-3 h-10 w-full rounded-xl bg-amber-400 text-sm font-bold text-black hover:bg-amber-500 disabled:opacity-60">
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}

          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { l: "Codes given", v: stats.welcome.issued.toLocaleString("en-NG") },
              { l: "Codes used", v: stats.welcome.used.toLocaleString("en-NG") },
              { l: "Sales from codes", v: formatCurrency(stats.welcome.revenue) },
            ].map((x) => (
              <div key={x.l} className="rounded-xl bg-zinc-50 px-2 py-2.5 dark:bg-zinc-800/50">
                <dd className="text-base font-extrabold tabular-nums text-zinc-900 dark:text-white">{x.v}</dd>
                <dt className="text-[11px] text-zinc-500">{x.l}</dt>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[11px] text-zinc-400">Each code works once, on a first order, for 30 days. They don&apos;t count towards your discount-code limit.</p>
        </>
      )}
    </section>
  );
}

/* ───────────────────────── Reach: tracked links ───────────────────────── */

function ShareCard({ store }: { store: Props["store"] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, id: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(id);
      toast.success("Link copied");
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
    });
  };
  return (
    <section className={cn(card, "p-4 sm:p-5")}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Reach</p>
      <h2 className="text-base font-bold text-zinc-900 dark:text-white">Share links that tell you what works</h2>
      <p className="mt-0.5 text-sm text-zinc-500">Use a different link on each app. Duka then shows which one brings buyers, not just visitors.</p>
      <ul className="mt-4 space-y-2">
        {SHARE_CHANNELS.map((c) => {
          const link = trackedLink(store.url, c.source);
          return (
            <li key={c.source} className="flex items-center gap-3 rounded-xl border border-zinc-100 px-3 py-2 dark:border-zinc-800">
              <SocialIcon name={c.source === "twitter" ? "x" : (c.source as SocialName)} size={36} label="" className="rounded-[10px]" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-zinc-900 dark:text-white">{c.label}</span>
                <span className="block truncate text-xs text-zinc-500">{c.hint}</span>
              </span>
              <button type="button" onClick={() => copy(link, c.source)} className="flex h-9 items-center gap-1.5 rounded-lg bg-zinc-100 px-3 text-xs font-bold text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100">
                {copied === c.source ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} Copy link
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
        <Megaphone className="h-4 w-4 shrink-0 text-amber-500" />
        <span className="flex-1">Want a ready-made picture for your status or stories?</span>
        <ShareButton target={{ kind: "store", title: store.name, url: trackedLink(store.url, "whatsapp"), cardPath: `/api/og/store/${store.slug}` }} className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 font-bold text-zinc-800 shadow-sm dark:bg-zinc-900 dark:text-white">
          Share kit
        </ShareButton>
      </div>
    </section>
  );
}

/* ───────────────────────── Which channels bring buyers ───────────────────────── */

function Channels({ stats }: { stats: GrowthStats }) {
  const rows = stats.channels.filter((c) => c.visitors > 0 || c.orders > 0);
  const best = rows.filter((r) => r.orders > 0).sort((a, b) => b.revenue - a.revenue)[0];
  return (
    <section className={cn(card, "overflow-hidden")}>
      <div className="p-4 pb-2 sm:p-5 sm:pb-2">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">Where your buyers come from</h2>
        <p className="text-sm text-zinc-500">
          {best ? (
            <>
              <strong className="text-zinc-800 dark:text-zinc-200">{sourceLabel(best.source)}</strong> brought the most sales in the last {stats.days} days. Share there more.
            </>
          ) : (
            "Share your tracked links above and this fills up with the apps that bring you buyers."
          )}
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 pb-6 pt-2 text-sm text-zinc-400">No visits in this period yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-[11px] uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
                <th className="px-5 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 text-right font-medium">Visitors</th>
                <th className="px-3 py-2 text-right font-medium">Orders</th>
                <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Turned into orders</th>
                <th className="px-5 py-2 text-right font-medium">Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((r) => (
                <tr key={r.source}>
                  <td className="px-5 py-2.5 font-medium text-zinc-900 dark:text-white">{sourceLabel(r.source)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600 dark:text-zinc-300">{r.visitors.toLocaleString("en-NG")}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600 dark:text-zinc-300">{r.orders.toLocaleString("en-NG")}</td>
                  <td className="hidden px-3 py-2.5 text-right tabular-nums text-zinc-600 dark:text-zinc-300 sm:table-cell">{pct(r.orders, r.visitors)}</td>
                  <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-zinc-900 dark:text-white">{formatCurrency(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-zinc-100 px-5 py-2 text-[11px] text-zinc-400 dark:border-zinc-800">
        Orders count towards the app that first brought that shopper to your store. &quot;Direct&quot; means an untagged link or typed address.
      </p>
    </section>
  );
}

/* ───────────────────────── Your audience ───────────────────────── */

function Audience({ store, contacts, total }: { store: Props["store"]; contacts: ContactRow[]; total: number }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const digits = t.replace(/\D/g, "");
    return contacts.filter((c) => !t || (c.name ?? "").toLowerCase().includes(t) || (digits.length >= 3 && c.phone.replace(/\D/g, "").includes(digits)));
  }, [contacts, q]);

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Name", "Phone", "Email", "Joined via", "Came from", "Joined", "Orders", "Spent", "Welcome code", "Code used"];
    const rows = contacts.map((c) => [c.name, c.phone, c.email, c.source, sourceLabel(c.first_source), c.created_at.slice(0, 10), c.orders, c.spent, c.code, c.code_used ? "yes" : "no"]);
    const blob = new Blob([[head, ...rows].map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${store.slug}-contacts.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const message = (c: ContactRow) => {
    const hi = c.name ? `Hi ${c.name.split(" ")[0]}` : "Hi";
    if (c.orders === 0 && c.code && !c.code_used) return `${hi}! Your ${store.name} welcome code ${c.code} is still waiting for you. Shop here: ${trackedLink(store.url, "whatsapp")}`;
    if (c.orders === 0) return `${hi}! Thanks for joining ${store.name}. Here's our latest: ${trackedLink(store.url, "whatsapp")}`;
    return `${hi}! Thanks for shopping with ${store.name} 💛 We've got new arrivals you'll love: ${trackedLink(store.url, "whatsapp")}`;
  };

  return (
    <section className={cn(card, "overflow-hidden")}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-white">
            <Users className="h-4 w-4 text-zinc-400" /> Your list <span className="text-sm font-semibold text-zinc-400">{total.toLocaleString("en-NG")}</span>
          </h2>
          <p className="text-sm text-zinc-500">People who agreed to hear from you. Message them from your own WhatsApp, free.</p>
        </div>
        {contacts.length > 0 && (
          <div className="flex gap-2">
            <label className="flex h-9 items-center gap-2 rounded-xl border border-zinc-200 px-3 dark:border-zinc-700">
              <Search className="h-3.5 w-3.5 text-zinc-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or phone" className="w-32 border-0 bg-transparent p-0 text-sm shadow-none outline-none focus:ring-0 dark:text-white sm:w-40" />
            </label>
            <button type="button" onClick={exportCsv} className="flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
        )}
      </div>

      {contacts.length === 0 ? (
        <div className="px-5 pb-8 pt-2 text-center">
          <UserPlus className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">Your list is empty for now</p>
          <p className="mx-auto mt-0.5 max-w-sm text-sm text-zinc-500">Turn on the welcome offer above. Shoppers who tick &quot;send me offers&quot; at checkout join too.</p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
          {list.map((c) => {
            const wa = c.unsubscribed_at ? null : whatsappLink(c.phone, message(c));
            return (
              <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {(c.name ?? c.phone).trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-white">{c.name || c.phone}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {c.name ? `${c.phone} · ` : ""}
                    {c.source === "welcome" ? "Welcome offer" : c.source === "checkout" ? "At checkout" : "Added"} · from {sourceLabel(c.first_source)}
                  </span>
                </span>
                <span className="hidden text-right text-xs sm:block">
                  {c.unsubscribed_at ? (
                    <span className="text-zinc-400">Unsubscribed</span>
                  ) : c.orders > 0 ? (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {c.orders} order{c.orders === 1 ? "" : "s"} · {formatCurrency(c.spent)}
                    </span>
                  ) : c.code ? (
                    <span className={c.code_used ? "text-emerald-600" : "text-amber-600"}>{c.code_used ? "Code used" : "Code not used yet"}</span>
                  ) : (
                    <span className="text-zinc-400">No order yet</span>
                  )}
                </span>
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`Message ${c.name ?? c.phone} on WhatsApp`} className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-xs font-bold text-white">
                    <SocialIcon name="whatsapp" size={16} label="" className="rounded-[4px] ring-1 ring-white/50" /> <span className="hidden sm:inline">WhatsApp</span>
                  </a>
                )}
              </li>
            );
          })}
          {list.length === 0 && <li className="px-5 py-6 text-center text-sm text-zinc-500">No one matches.</li>}
        </ul>
      )}
    </section>
  );
}

/* ───────────────────────── Bring back: automatic follow-ups ───────────────────────── */

const FLOW_ICON = { welcome_reminder: Gift, review_request: Star, win_back: HeartHandshake } as const;
const FLOW_TONE = {
  welcome_reminder: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  review_request: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  win_back: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
} as const;

function Automations({ store, automations, days, welcomePercent }: { store: Props["store"]; automations: Props["automations"]; days: number; welcomePercent: number }) {
  const router = useRouter();
  const [settings, setSettings] = useState<AutomationSettings>(automations.settings);
  const [saving, setSaving] = useState<string | null>(null);
  const result = (flow: string) => automations.results.find((r) => r.flow === flow);

  async function save(patch: Partial<AutomationSettings>, label: string) {
    const prev = settings;
    setSettings({ ...settings, ...patch });
    setSaving(label);
    try {
      const res = await fetch("/api/dashboard/growth", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ automations: patch }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't save");
      router.refresh();
    } catch (e) {
      setSettings(prev);
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className={cn(card, "p-4 sm:p-5")}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Bring back</p>
          <h2 className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-white">
            Automatic follow-ups {!automations.allowed && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">Pro</span>}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">Emails in your store&apos;s name, sent at the right moment, so buyers come back. Every email has a one-click &quot;stop&quot; link.</p>
        </div>
        <p className="shrink-0 text-xs text-zinc-400">Last {days} days</p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {FLOWS.map((f) => {
          const on = automations.allowed && (settings[f.key] as boolean);
          const r = result(f.id);
          const Icon = FLOW_ICON[f.id];
          const subject = f.subject.replace("{store}", store.name).replace("{percent}", String(settings.winBackPercent)).replace("{welcome}", String(welcomePercent));
          return (
            <div key={f.id} className={cn("flex flex-col rounded-2xl border p-4", on ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/10" : "border-zinc-200 dark:border-zinc-800")}>
              <div className="flex items-start justify-between gap-2">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", FLOW_TONE[f.id])}>
                  <Icon className="h-4 w-4" />
                </span>
                {automations.allowed ? (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${f.title} emails`}
                    disabled={saving !== null}
                    onClick={() => void save({ [f.key]: !on } as Partial<AutomationSettings>, f.id)}
                    className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60", on ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700")}
                  >
                    <span className={cn("absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform", on ? "translate-x-5" : "translate-x-0")} />
                  </button>
                ) : (
                  <Lock className="h-4 w-4 text-zinc-400" />
                )}
              </div>
              <p className="mt-3 text-[15px] font-bold text-zinc-900 dark:text-white">{f.title}</p>
              <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">{f.when}.</p>
              <p className="mt-1 text-xs text-zinc-500">To: {f.who}</p>
              <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-zinc-200/80 dark:bg-zinc-950 dark:ring-zinc-800">
                <span className="text-zinc-400">Subject: </span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-100">{subject}</span>
              </div>
              {f.id === "win_back" && automations.allowed && (
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="mr-1 text-xs text-zinc-500">Code:</span>
                  {WELCOME_PERCENTS.map((p) => (
                    <button key={p} type="button" disabled={saving !== null} onClick={() => void save({ winBackPercent: p }, "pct")} aria-pressed={settings.winBackPercent === p} className={cn("h-7 flex-1 rounded-lg text-xs font-bold", settings.winBackPercent === p ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200")}>
                      {p}%
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-auto grid grid-cols-3 gap-1.5 pt-3 text-center">
                {[
                  { l: "Sent", v: (r?.sent ?? 0).toLocaleString("en-NG") },
                  { l: "Orders", v: f.id === "review_request" ? "–" : (r?.ordered ?? 0).toLocaleString("en-NG") },
                  { l: "Sales", v: f.id === "review_request" ? "–" : formatCurrency(r?.revenue ?? 0) },
                ].map((x) => (
                  <div key={x.l} className="rounded-lg bg-zinc-50 py-1.5 dark:bg-zinc-800/50">
                    <p className="text-sm font-extrabold tabular-nums text-zinc-900 dark:text-white">{x.v}</p>
                    <p className="text-[10px] text-zinc-500">{x.l}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!automations.allowed ? (
        <Link href="/dashboard/billing" className="mt-4 flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-200">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="flex-1">Go Pro and these emails go out for you, in your store&apos;s name, while you focus on selling.</span>
          <span className="shrink-0 font-bold underline underline-offset-2">Upgrade</span>
        </Link>
      ) : (
        <p className="mt-3 text-[11px] text-zinc-400">
          Emails only reach people who gave an email address. Follow-ups about offers only go to people on your list. Orders count when the code in the email is used.
        </p>
      )}
    </section>
  );
}

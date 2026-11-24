"use client";

// Shopper referrals: buyers share their own link; friends get money off
// their first order; the buyer earns store credit once it's delivered.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Gift, Share2, ShoppingBag, Sparkles, Trophy, Wallet } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { REFERRAL_PERCENTS, REFERRAL_REWARDS, type ReferralSettings, type ReferralStats } from "@/lib/growth-referrals-shared";

const card = "rounded-2xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900";

export default function ReferralCard({ data, giftCardsAllowed }: { data: { allowed: boolean; settings: ReferralSettings; stats: ReferralStats }; giftCardsAllowed: boolean }) {
  const router = useRouter();
  const [s, setS] = useState(data.settings);
  const [saving, setSaving] = useState(false);
  const allowed = data.allowed;

  async function save(patch: Partial<ReferralSettings>) {
    const prev = s;
    setS({ ...s, ...patch });
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/growth", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ referrals: patch }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Couldn't save");
      if (patch.enabled !== undefined) toast.success(patch.enabled ? "Referrals are on: buyers see their share link on their receipt" : "Referrals turned off");
      router.refresh();
    } catch (e) {
      setS(prev);
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  const on = allowed && s.enabled;
  const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
  return (
    <section className={cn(card, "p-4 sm:p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Reach</p>
          <h2 className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-white">
            <Gift className="h-4 w-4 text-sky-500" /> Customer referrals {!allowed && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">Pro</span>}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">Your buyers bring their friends. Word of mouth, on autopilot.</p>
        </div>
        {allowed && (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label="Customer referrals"
            disabled={saving}
            onClick={() => void save({ enabled: !s.enabled })}
            className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60", on ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700")}
          >
            <span className={cn("absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform", on ? "translate-x-5" : "translate-x-0")} />
          </button>
        )}
      </div>

      {/* How it works */}
      <ol className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { icon: Share2, t: "A buyer shares their link", d: "From their receipt or the thank-you email" },
          { icon: ShoppingBag, t: `Their friend gets ${s.friendPercent}% off`, d: "On their first order with you" },
          { icon: Wallet, t: `The buyer earns ${naira(s.reward)}`, d: "Store credit, once the order is delivered" },
        ].map((x, i) => (
          <li key={x.t} className="flex gap-2.5 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[12px] font-black text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">{i + 1}</span>
            <span>
              <span className="block text-sm font-semibold text-zinc-900 dark:text-white">{x.t}</span>
              <span className="block text-xs text-zinc-500">{x.d}</span>
            </span>
          </li>
        ))}
      </ol>

      {allowed ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">Friend&apos;s discount</p>
              <div className="flex gap-2">
                {REFERRAL_PERCENTS.map((p) => (
                  <button key={p} type="button" disabled={saving} onClick={() => void save({ friendPercent: p })} aria-pressed={s.friendPercent === p} className={cn("h-9 flex-1 rounded-xl text-sm font-bold", s.friendPercent === p ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200")}>
                    {p}%
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">Buyer&apos;s reward per friend</p>
              <div className="flex gap-2">
                {REFERRAL_REWARDS.map((r) => (
                  <button key={r} type="button" disabled={saving} onClick={() => void save({ reward: r })} aria-pressed={s.reward === r} className={cn("h-9 flex-1 rounded-xl text-xs font-bold", s.reward === r ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200")}>
                    {naira(r)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {!giftCardsAllowed && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Rewards are store credit, spent like a gift card. Your plan needs gift cards for buyers to spend it.</p>}

          <dl className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            {[
              { l: "Buyers sharing", v: data.stats.referrers.toLocaleString("en-NG") },
              { l: "Friends' orders", v: data.stats.orders.toLocaleString("en-NG") },
              { l: "Sales from friends", v: formatCurrency(data.stats.revenue) },
              { l: "Rewards earned", v: formatCurrency(data.stats.rewardsPaid) },
            ].map((x) => (
              <div key={x.l} className="rounded-xl bg-zinc-50 px-2 py-2.5 dark:bg-zinc-800/50">
                <dd className="text-base font-extrabold tabular-nums text-zinc-900 dark:text-white">{x.v}</dd>
                <dt className="text-[11px] text-zinc-500">{x.l}</dt>
              </div>
            ))}
          </dl>

          {data.stats.top.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <Trophy className="h-3.5 w-3.5 text-amber-500" /> Top sharers
              </p>
              <ul className="divide-y divide-zinc-100 rounded-xl ring-1 ring-zinc-200/80 dark:divide-zinc-800 dark:ring-zinc-800">
                {data.stats.top.map((t) => (
                  <li key={t.code} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-semibold text-zinc-900 dark:text-white">{t.name || t.code}</span>
                    <span className="text-xs text-zinc-500">{t.friends} friend{t.friends === 1 ? "" : "s"}</span>
                    <span className="w-20 text-right text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(t.earned)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <Link href="/dashboard/billing" className="mt-4 flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-200">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="flex-1">Go Pro and every buyer becomes a promoter for your store.</span>
          <span className="shrink-0 font-bold underline underline-offset-2">Upgrade</span>
        </Link>
      )}
    </section>
  );
}

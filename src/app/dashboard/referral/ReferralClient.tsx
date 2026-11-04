"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Award, Check, Copy, Share2, Users } from "lucide-react";
import { EmptyState, Kpi, Panel } from "@/components/dashboard/ui";

interface Referral {
  status: string;
  created_at: string;
  store_name: string | null;
}

interface Props {
  referralCode: string;
  referralCredits: number;
  referrals: Referral[];
}

const formatDate = (d: string) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

const STEPS = [
  { icon: Share2, title: "Share your link", desc: "Send it to friends who want to sell online." },
  { icon: Users, title: "They open a store", desc: "They sign up with your link and create their store." },
  { icon: Award, title: "You get a free month", desc: "When they pay for a plan, you get 1 month of Pro — automatically." },
];

export default function ReferralClient({ referralCode, referralCredits, referrals }: Props) {
  const [copied, setCopied] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL ?? "https://dukanigeria.com";
  const referralLink = referralCode ? `${baseUrl}/onboarding?ref=${referralCode}` : "";
  const rewarded = referrals.filter((r) => r.status === "rewarded").length;
  const shareText = `I sell online with Duka — set up your own store in minutes: ${referralLink}`;

  async function copy() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy the link");
    }
  }
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: "Start your store on Duka", text: shareText, url: referralLink });
      else await copy();
    } catch {
      /* cancelled */
    }
  }

  return (
    <div className="space-y-3 pt-1 lg:pt-0">
      {/* Share + stats */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[13px] font-semibold text-zinc-900 dark:text-white">Your referral link</p>
          <p className="mb-2 text-[12px] text-zinc-500">Earn 1 free month of Pro each time a friend you invite pays for a plan.</p>
          {referralCode ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  onFocus={(e) => e.target.select()}
                  aria-label="Referral link"
                  className="h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 font-mono text-[12px] text-zinc-700 focus:outline-none focus:ring-2 focus:ring-accent-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                />
                <button onClick={copy} className="flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-accent-400 px-3 text-[13px] font-bold text-black hover:bg-accent-500">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-[13px] font-bold text-white"
                  style={{ background: "#25D366" }}
                >
                  WhatsApp
                </a>
                <button onClick={share} aria-label="Share" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-400">
                Code: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{referralCode}</strong>
              </p>
            </>
          ) : (
            <p className="text-[13px] text-zinc-500">Your referral code is being created — check back shortly.</p>
          )}
        </section>
        <div className="grid grid-cols-3 gap-2">
          <Kpi label="Referred" value={String(referrals.length)} hint="stores signed up" />
          <Kpi label="Rewarded" value={String(rewarded)} hint="paid for a plan" />
          <Kpi label="Months earned" value={String(referralCredits)} hint="free Pro months" />
        </div>
      </div>

      {/* History + how it works */}
      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title={`Referral history · ${referrals.length}`}>
          {referrals.length === 0 ? (
            <EmptyState icon={Users} title="No referrals yet" text="Share your link to start earning free months." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-400">
                    <th className="px-3 py-1.5 font-medium">Store</th>
                    <th className="px-3 py-1.5 font-medium">Status</th>
                    <th className="px-3 py-1.5 text-right font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {referrals.map((r, i) => (
                    <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="px-3 py-1.5 font-medium text-zinc-900 dark:text-white">{r.store_name ?? <span className="italic text-zinc-400">Unnamed store</span>}</td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`rounded px-1.5 py-px text-[11px] font-semibold ${
                            r.status === "rewarded" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                          }`}
                        >
                          {r.status === "rewarded" ? "Rewarded" : "Signed up"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right text-zinc-500">{formatDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="How it works">
          <ol className="space-y-2.5 p-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400">
                  <s.icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-zinc-900 dark:text-white">
                    <span className="text-zinc-400">{i + 1}.</span> {s.title}
                  </span>
                  <span className="block text-[12px] text-zinc-500">{s.desc}</span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}

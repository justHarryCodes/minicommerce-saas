"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Gift, Copy, Check, Users, Award, ChevronRight } from "lucide-react";

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ReferralClient({ referralCode, referralCredits, referrals }: Props) {
  const [copied, setCopied] = useState(false);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "https://awarizon.shop";

  const referralLink = referralCode
    ? `${baseUrl}/onboarding?ref=${referralCode}`
    : "";

  const totalReferrals = referrals.length;
  const rewardedCount = referrals.filter((r) => r.status === "rewarded").length;

  async function handleCopy() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy link");
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-surface-900 dark:text-white flex items-center gap-2">
          <Gift className="w-6 h-6" />
          Refer &amp; Earn
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          Share your referral link — earn 1 free month when a friend pays their setup fee
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface-400 dark:text-surface-500 mb-1">
            Total referred
          </p>
          <p className="text-3xl font-black text-surface-900 dark:text-white">{totalReferrals}</p>
        </div>
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface-400 dark:text-surface-500 mb-1">
            Successful rewards
          </p>
          <p className="text-3xl font-black text-green-600 dark:text-green-400">{rewardedCount}</p>
        </div>
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface-400 dark:text-surface-500 mb-1">
            Months earned
          </p>
          <p className="text-3xl font-black text-accent-600 dark:text-accent-400">{referralCredits}</p>
        </div>
      </div>

      {/* Referral link */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6 space-y-4">
        <h2 className="font-bold text-surface-900 dark:text-white">Your referral link</h2>
        {referralCode ? (
          <>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-700 dark:text-surface-300 text-sm font-mono select-all focus:outline-none focus:ring-2 focus:ring-accent-400"
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent-400 hover:bg-accent-500 text-black font-bold text-sm transition-all shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-surface-400">
              Your referral code: <strong className="font-mono text-surface-700 dark:text-surface-300">{referralCode}</strong>
            </p>
          </>
        ) : (
          <p className="text-sm text-surface-400">
            Your referral code is being generated. Check back shortly.
          </p>
        )}
      </div>

      {/* How it works */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6">
        <h2 className="font-bold text-surface-900 dark:text-white mb-5">How it works</h2>
        <div className="space-y-4">
          {[
            {
              icon: <Copy className="w-5 h-5" />,
              title: "Share your link",
              desc: "Send your referral link to friends who want to start an online store on Duka.",
            },
            {
              icon: <Users className="w-5 h-5" />,
              title: "Friend registers",
              desc: "They sign up using your link and create their store.",
            },
            {
              icon: <Award className="w-5 h-5" />,
              title: "You both benefit",
              desc: "When they pay their setup fee, you automatically get 1 free month added to your subscription.",
            },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-900/20 flex items-center justify-center text-accent-600 dark:text-accent-400 shrink-0">
                {step.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-accent-600 dark:text-accent-400 uppercase tracking-wide">
                    Step {i + 1}
                  </span>
                  <ChevronRight className="w-3 h-3 text-surface-300" />
                  <span className="font-bold text-surface-900 dark:text-white text-sm">{step.title}</span>
                </div>
                <p className="text-sm text-surface-500 dark:text-surface-400">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referrals table */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 overflow-hidden">
        <div className="p-5 border-b border-surface-100 dark:border-surface-800">
          <h2 className="font-bold text-surface-900 dark:text-white">Referral history</h2>
        </div>
        {referrals.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-surface-900 dark:text-white mb-1">No referrals yet</p>
            <p className="text-sm text-surface-400">Share your link to start earning free months.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 dark:bg-surface-800/50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                    Store
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {referrals.map((ref, i) => (
                  <tr key={i} className="hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors">
                    <td className="px-5 py-4 font-medium text-surface-900 dark:text-white">
                      {ref.store_name ?? <span className="text-surface-400 italic">Unnamed store</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          ref.status === "rewarded"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {ref.status === "rewarded" ? "Rewarded" : "Signed up"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-surface-500 dark:text-surface-400">
                      {formatDate(ref.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

// "Give X%, get ₦Y" on the receipt: the buyer's own referral link, ready to
// share on WhatsApp. Uses the store's colours.
import { useState } from "react";
import { Check, Copy, Gift, Loader2, MessageCircle } from "lucide-react";
import { referralMessage } from "@/lib/growth-referrals-shared";

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

export default function ReferralShare({ storeSlug, storeName, orderNumber, token, percent, reward }: { storeSlug: string; storeName: string; orderNumber: string; token: string; percent: number; reward: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<{ code: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function getLink() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/storefront/${storeSlug}/referral`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber, token }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setMine({ code: data.code, link: data.link });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const text = mine ? referralMessage(storeName, percent, mine.link) : "";
  return (
    <section className="mt-4 overflow-hidden rounded-[var(--sf-radius)] border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900 print:hidden">
      <div className="flex items-center gap-3 px-5 py-4" style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Gift className="h-5 w-5" />
        </span>
        <div>
          <p className="text-base font-bold">
            Give {percent}%, get {naira(reward)}
          </p>
          <p className="text-sm opacity-85">Friends get {percent}% off their first order. You get {naira(reward)} to spend here when it&apos;s delivered.</p>
        </div>
      </div>
      <div className="p-5">
        {!mine ? (
          <>
            <button type="button" onClick={getLink} disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold disabled:opacity-60" style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Get my share link
            </button>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-dashed px-4 py-3" style={{ borderColor: "var(--sf-accent)" }}>
              <div className="min-w-0">
                <p className="text-xs text-surface-500">Your friend code</p>
                <p className="font-mono text-lg font-black tracking-wider text-surface-900 dark:text-white">{mine.code}</p>
              </div>
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(mine.link).then(() => setCopied(true))}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-surface-100 px-3 text-xs font-bold text-surface-800 dark:bg-surface-800 dark:text-surface-100"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy link"}
              </button>
            </div>
            <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-bold text-white">
              <MessageCircle className="h-4 w-4" /> Share on WhatsApp
            </a>
            <p className="text-center text-xs text-surface-500">Your credit arrives when your friend&apos;s order is delivered. It works like a gift card at checkout.</p>
          </div>
        )}
      </div>
    </section>
  );
}

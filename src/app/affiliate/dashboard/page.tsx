"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Copy, Check, LogOut, Wallet, Users, TrendingUp, Clock,
  ChevronRight, Loader2, ExternalLink, BadgeCheck, AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface Affiliate {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  earnings_total: number;
  payout_balance: number;
  total_referrals: number;
  active_referrals: number;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
}

interface Referral {
  id: string;
  store_id: string;
  store_name: string;
  store_slug: string;
  status: "pending" | "active";
  commission_amount: number | null;
  created_at: string;
  rewarded_at: string | null;
}

interface Payout {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "paid";
  bank_name: string | null;
  account_number: string | null;
  admin_note: string | null;
  requested_at: string;
  processed_at: string | null;
}

const MIN_PAYOUT = 5000;

function fmt(n: number) {
  return "₦" + n.toLocaleString();
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:  { label: "Pending",  cls: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20" },
    active:   { label: "Active",   cls: "bg-green-400/10 text-green-400 border-green-400/20" },
    approved: { label: "Approved", cls: "bg-blue-400/10 text-blue-400 border-blue-400/20" },
    rejected: { label: "Rejected", cls: "bg-red-400/10 text-red-400 border-red-400/20" },
    paid:     { label: "Paid",     cls: "bg-green-400/10 text-green-400 border-green-400/20" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-zinc-700 text-zinc-300 border-zinc-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}>
      {label}
    </span>
  );
}

export default function AffiliateDashboard() {
  const router = useRouter();
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showPayoutForm, setShowPayoutForm] = useState(false);

  // Payout form state
  const [payoutForm, setPayoutForm] = useState({ amount: "", bankName: "", accountNumber: "", accountName: "" });
  const [payoutLoading, setPayoutLoading] = useState(false);

  // Bank form state
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankForm, setBankForm] = useState({ bankName: "", accountNumber: "", accountName: "" });
  const [bankLoading, setBankLoading] = useState(false);

  const load = useCallback(async () => {
    const [meRes, refRes, payRes] = await Promise.all([
      fetch("/api/affiliate/me"),
      fetch("/api/affiliate/referrals"),
      fetch("/api/affiliate/payout"),
    ]);
    if (meRes.status === 401) {
      router.replace("/affiliate/login");
      return;
    }
    if (meRes.ok) {
      const { affiliate: a } = await meRes.json();
      setAffiliate(a);
      setBankForm({
        bankName: a.bank_name ?? "",
        accountNumber: a.account_number ?? "",
        accountName: a.account_name ?? "",
      });
      setPayoutForm((f) => ({ ...f, bankName: a.bank_name ?? "", accountNumber: a.account_number ?? "", accountName: a.account_name ?? "" }));
    }
    if (refRes.ok) setReferrals((await refRes.json()).referrals ?? []);
    if (payRes.ok) setPayouts((await payRes.json()).payouts ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const referralLink = affiliate
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/onboarding?ref=${affiliate.referral_code}`
    : "";

  function copyLink() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleLogout() {
    await fetch("/api/affiliate/logout", { method: "POST" });
    router.push("/affiliate/login");
  }

  async function submitPayout(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(payoutForm.amount);
    if (!amount || amount < MIN_PAYOUT) {
      toast.error(`Minimum payout is ${fmt(MIN_PAYOUT)}`);
      return;
    }
    setPayoutLoading(true);
    try {
      const res = await fetch("/api/affiliate/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, bankName: payoutForm.bankName, accountNumber: payoutForm.accountNumber, accountName: payoutForm.accountName }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      toast.success("Payout request submitted!");
      setShowPayoutForm(false);
      load();
    } catch { toast.error("Something went wrong"); }
    finally { setPayoutLoading(false); }
  }

  async function saveBankDetails(e: React.FormEvent) {
    e.preventDefault();
    setBankLoading(true);
    try {
      const res = await fetch("/api/affiliate/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankForm),
      });
      if (!res.ok) { toast.error("Failed to save"); return; }
      toast.success("Bank details saved");
      setShowBankForm(false);
      load();
    } catch { toast.error("Something went wrong"); }
    finally { setBankLoading(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (!affiliate) return null;

  const hasPendingPayout = payouts.some((p) => p.status === "pending");
  const canRequestPayout = affiliate.payout_balance >= MIN_PAYOUT && !hasPendingPayout;

  const inputClass =
    "w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center">
              <span className="text-black font-black text-sm">D</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-none">{affiliate.name}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{affiliate.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total referrals",  value: affiliate.total_referrals,  icon: Users,       color: "text-blue-400",   bg: "bg-blue-400/10" },
            { label: "Active referrals", value: affiliate.active_referrals, icon: BadgeCheck,  color: "text-green-400",  bg: "bg-green-400/10" },
            { label: "Total earned",     value: fmt(affiliate.earnings_total), icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-400/10" },
            { label: "Available",        value: fmt(affiliate.payout_balance), icon: Wallet,    color: "text-purple-400", bg: "bg-purple-400/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-xs text-zinc-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Referral link */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="font-bold text-white mb-1">Your referral link</h2>
          <p className="text-zinc-500 text-xs mb-4">Share this link. When a vendor signs up and pays their setup fee, you earn ₦1,000.</p>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 truncate">
              {referralLink}
            </div>
            <button onClick={copyLink}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                copied ? "bg-green-500 text-white" : "bg-amber-400 text-black hover:bg-amber-300"
              }`}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-zinc-500">Code:</span>
            <span className="font-mono font-bold text-amber-400 text-sm">{affiliate.referral_code}</span>
          </div>
        </div>

        {/* Payout section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-bold text-white mb-1">Request payout</h2>
              <p className="text-zinc-500 text-xs">Minimum {fmt(MIN_PAYOUT)} · Paid to your bank account</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-purple-400">{fmt(affiliate.payout_balance)}</p>
              <p className="text-xs text-zinc-500">available balance</p>
            </div>
          </div>

          {hasPendingPayout && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs mb-4">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              You have a pending payout request under review.
            </div>
          )}

          {!canRequestPayout && !hasPendingPayout && affiliate.payout_balance < MIN_PAYOUT && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs mb-4">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              You need {fmt(MIN_PAYOUT - affiliate.payout_balance)} more to reach the minimum payout.
            </div>
          )}

          {!showPayoutForm && canRequestPayout && (
            <button onClick={() => setShowPayoutForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-sm transition-colors">
              <Wallet className="w-4 h-4" /> Request payout
            </button>
          )}

          {showPayoutForm && (
            <form onSubmit={submitPayout} className="space-y-3 border-t border-zinc-700 pt-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Amount (₦)</label>
                  <input className={inputClass} type="number" min={MIN_PAYOUT} max={affiliate.payout_balance}
                    placeholder={String(MIN_PAYOUT)} value={payoutForm.amount}
                    onChange={(e) => setPayoutForm((f) => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Bank name</label>
                  <input className={inputClass} placeholder="Opay, GTBank…" value={payoutForm.bankName}
                    onChange={(e) => setPayoutForm((f) => ({ ...f, bankName: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Account number</label>
                  <input className={inputClass + " font-mono"} placeholder="0123456789" value={payoutForm.accountNumber}
                    onChange={(e) => setPayoutForm((f) => ({ ...f, accountNumber: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Account name</label>
                  <input className={inputClass} placeholder="Jane Okafor" value={payoutForm.accountName}
                    onChange={(e) => setPayoutForm((f) => ({ ...f, accountName: e.target.value }))} required />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={payoutLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white font-bold text-sm transition-colors">
                  {payoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit request"}
                </button>
                <button type="button" onClick={() => setShowPayoutForm(false)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Bank details */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-white mb-1">Bank details</h2>
              <p className="text-zinc-500 text-xs">Used for payout transfers</p>
            </div>
            {!showBankForm && (
              <button onClick={() => setShowBankForm(true)}
                className="text-xs text-amber-400 font-semibold hover:underline">
                {affiliate.bank_name ? "Edit" : "Add"}
              </button>
            )}
          </div>
          {!showBankForm && affiliate.bank_name ? (
            <div className="text-sm text-zinc-300 space-y-1">
              <p><span className="text-zinc-500">Bank:</span> {affiliate.bank_name}</p>
              <p><span className="text-zinc-500">Account:</span> <span className="font-mono">{affiliate.account_number}</span></p>
              <p><span className="text-zinc-500">Name:</span> {affiliate.account_name}</p>
            </div>
          ) : !showBankForm ? (
            <p className="text-zinc-500 text-sm">No bank details added yet.</p>
          ) : (
            <form onSubmit={saveBankDetails} className="space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Bank name</label>
                  <input className={inputClass} placeholder="Opay" value={bankForm.bankName}
                    onChange={(e) => setBankForm((f) => ({ ...f, bankName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Account number</label>
                  <input className={inputClass + " font-mono"} placeholder="0123456789" value={bankForm.accountNumber}
                    onChange={(e) => setBankForm((f) => ({ ...f, accountNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Account name</label>
                  <input className={inputClass} placeholder="Jane Okafor" value={bankForm.accountName}
                    onChange={(e) => setBankForm((f) => ({ ...f, accountName: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={bankLoading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-400 text-black font-bold text-sm hover:bg-amber-300 disabled:opacity-50 transition-colors">
                  {bankLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                </button>
                <button type="button" onClick={() => setShowBankForm(false)}
                  className="px-5 py-2 rounded-xl border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Referrals list */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="font-bold text-white mb-4">
            Your referrals
            <span className="ml-2 text-sm font-normal text-zinc-500">{referrals.length} total</span>
          </h2>
          {referrals.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No referrals yet. Share your link to get started!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.map((r) => (
                <div key={r.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {r.store_name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{r.store_name}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <StatusPill status={r.status} />
                  {r.commission_amount && (
                    <span className="text-sm font-black text-green-400 ml-1">{fmt(r.commission_amount)}</span>
                  )}
                  <a href={`/store/${r.store_slug}`} target="_blank" rel="noopener noreferrer"
                    className="text-zinc-600 hover:text-zinc-400 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payout history */}
        {payouts.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-4">Payout history</h2>
            <div className="space-y-2">
              {payouts.map((p) => (
                <div key={p.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{fmt(p.amount)}</p>
                    <p className="text-xs text-zinc-500">
                      {p.bank_name} · {p.account_number}
                    </p>
                    {p.admin_note && (
                      <p className="text-xs text-zinc-400 mt-0.5 italic">{p.admin_note}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <StatusPill status={p.status} />
                    <p className="text-[10px] text-zinc-600 mt-1">
                      {new Date(p.requested_at).toLocaleDateString("en-NG")}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-700 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

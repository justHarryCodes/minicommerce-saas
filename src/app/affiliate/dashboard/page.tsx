"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Copy, Check, LogOut, Wallet, Users, TrendingUp, Clock,
  ChevronRight, Loader2, ExternalLink, BadgeCheck, AlertCircle,
  ArrowRight,
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
const fmt = (n: number) => "₦" + Number(n).toLocaleString();

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:  { label: "Pending",  cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    active:   { label: "Active",   cls: "bg-green-50 text-green-700 border-green-200" },
    approved: { label: "Approved", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200" },
    paid:     { label: "Paid",     cls: "bg-green-50 text-green-700 border-green-200" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}>
      {label}
    </span>
  );
}

const inputClass =
  "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all";

export default function AffiliateDashboard() {
  const router = useRouter();
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ amount: "", bankName: "", accountNumber: "", accountName: "" });
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankForm, setBankForm] = useState({ bankName: "", accountNumber: "", accountName: "" });
  const [bankLoading, setBankLoading] = useState(false);

  const load = useCallback(async () => {
    const [meRes, refRes, payRes] = await Promise.all([
      fetch("/api/affiliate/me"),
      fetch("/api/affiliate/referrals"),
      fetch("/api/affiliate/payout"),
    ]);
    if (meRes.status === 401) { router.replace("/affiliate/login"); return; }
    if (meRes.ok) {
      const { affiliate: a } = await meRes.json();
      setAffiliate(a);
      setBankForm({ bankName: a.bank_name ?? "", accountNumber: a.account_number ?? "", accountName: a.account_name ?? "" });
      setPayoutForm((f) => ({ ...f, bankName: a.bank_name ?? "", accountNumber: a.account_number ?? "", accountName: a.account_name ?? "" }));
    }
    if (refRes.ok) setReferrals((await refRes.json()).referrals ?? []);
    if (payRes.ok) setPayouts((await payRes.json()).payouts ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const referralLink = affiliate && typeof window !== "undefined"
    ? `${window.location.origin}/onboarding?ref=${affiliate.referral_code}`
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
    if (!amount || amount < MIN_PAYOUT) { toast.error(`Minimum payout is ${fmt(MIN_PAYOUT)}`); return; }
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }
  if (!affiliate) return null;

  const hasPendingPayout = payouts.some((p) => p.status === "pending");
  const canRequestPayout = affiliate.payout_balance >= MIN_PAYOUT && !hasPendingPayout;
  const pendingReferrals = referrals.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/affiliate">
              <Image src="/logo.png" alt="Duka" width={80} height={32} className="h-7 w-auto object-contain" />
            </Link>
            <span className="text-gray-300 hidden sm:block">|</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:block">Affiliate Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-gray-900 leading-none">{affiliate.name}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{affiliate.email}</p>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-100">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Welcome strip ── */}
        <div className="bg-amber-400 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
          <div>
            <p className="text-black/60 text-xs font-semibold uppercase tracking-widest">Welcome back</p>
            <h1 className="text-xl sm:text-2xl font-black text-black">{affiliate.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 bg-black/10 rounded-xl">
              <p className="text-lg font-black text-black">{affiliate.active_referrals}</p>
              <p className="text-[10px] text-black/60 font-semibold">Active</p>
            </div>
            <div className="text-center px-4 py-2 bg-black/10 rounded-xl">
              <p className="text-lg font-black text-black">{fmt(affiliate.earnings_total)}</p>
              <p className="text-[10px] text-black/60 font-semibold">Earned</p>
            </div>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total referrals",  value: affiliate.total_referrals,  icon: Users,       bg: "bg-blue-50",   color: "text-blue-600" },
            { label: "Active referrals", value: affiliate.active_referrals, icon: BadgeCheck,  bg: "bg-green-50",  color: "text-green-600" },
            { label: "Total earned",     value: fmt(affiliate.earnings_total), icon: TrendingUp, bg: "bg-amber-50", color: "text-amber-600" },
            { label: "Available",        value: fmt(affiliate.payout_balance), icon: Wallet,    bg: "bg-purple-50", color: "text-purple-600" },
          ].map(({ label, value, icon: Icon, bg, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_8px_rgba(0,0,0,0.04)] p-5">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-2xl font-black text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Referral link ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_8px_rgba(0,0,0,0.04)] p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-bold text-gray-900 mb-1">Your referral link</h2>
              <p className="text-gray-400 text-xs">Share this link. Earn ₦2,000 when a vendor activates.</p>
            </div>
            <span className="shrink-0 bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full font-mono">
              {affiliate.referral_code}
            </span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono text-gray-500 truncate">
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

          {/* Share shortcuts */}
          <div className="flex flex-wrap gap-2 mt-3">
            <a href={`https://wa.me/?text=${encodeURIComponent(`Start selling online on Duka! Use my link to get started: ${referralLink}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors">
              📱 WhatsApp
            </a>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Start selling online with Duka! ${referralLink}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors">
              𝕏 Share
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors">
              📘 Facebook
            </a>
          </div>
        </div>

        {/* ── Payout section ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_8px_rgba(0,0,0,0.04)] p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="font-bold text-gray-900 mb-1">Request payout</h2>
              <p className="text-gray-400 text-xs">Minimum {fmt(MIN_PAYOUT)} · Sent to your bank account</p>
            </div>
            <div className="sm:text-right">
              <p className="text-2xl font-black text-purple-600">{fmt(affiliate.payout_balance)}</p>
              <p className="text-xs text-gray-400">available balance</p>
              {affiliate.payout_balance < MIN_PAYOUT && affiliate.payout_balance > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {fmt(MIN_PAYOUT - affiliate.payout_balance)} more needed
                </p>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-purple-400 rounded-full transition-all"
              style={{ width: `${Math.min(100, (affiliate.payout_balance / MIN_PAYOUT) * 100)}%` }} />
          </div>

          {hasPendingPayout && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs mb-4">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              You have a payout request under review. We&apos;ll transfer it shortly.
            </div>
          )}

          {!canRequestPayout && !hasPendingPayout && affiliate.payout_balance < MIN_PAYOUT && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-xs mb-4">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Refer {Math.ceil((MIN_PAYOUT - affiliate.payout_balance) / 2000)} more vendor{Math.ceil((MIN_PAYOUT - affiliate.payout_balance) / 2000) !== 1 ? "s" : ""} to unlock your first payout.
            </div>
          )}

          {!showPayoutForm && canRequestPayout && (
            <button onClick={() => setShowPayoutForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-colors">
              <Wallet className="w-4 h-4" /> Request payout
            </button>
          )}

          {showPayoutForm && (
            <form onSubmit={submitPayout} className="space-y-3 border-t border-gray-100 pt-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Amount (₦)</label>
                  <input className={inputClass} type="number" min={MIN_PAYOUT} max={affiliate.payout_balance}
                    placeholder={String(MIN_PAYOUT)} value={payoutForm.amount}
                    onChange={(e) => setPayoutForm((f) => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Bank name</label>
                  <input className={inputClass} placeholder="Opay, GTBank…" value={payoutForm.bankName}
                    onChange={(e) => setPayoutForm((f) => ({ ...f, bankName: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Account number</label>
                  <input className={inputClass + " font-mono"} placeholder="0123456789" value={payoutForm.accountNumber}
                    onChange={(e) => setPayoutForm((f) => ({ ...f, accountNumber: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Account name</label>
                  <input className={inputClass} placeholder="Jane Okafor" value={payoutForm.accountName}
                    onChange={(e) => setPayoutForm((f) => ({ ...f, accountName: e.target.value }))} required />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={payoutLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-sm transition-colors">
                  {payoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit request"}
                </button>
                <button type="button" onClick={() => setShowPayoutForm(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Bank details ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_8px_rgba(0,0,0,0.04)] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900 mb-1">Bank details</h2>
              <p className="text-gray-400 text-xs">Used for payout transfers</p>
            </div>
            {!showBankForm && (
              <button onClick={() => setShowBankForm(true)}
                className="text-xs text-amber-600 font-semibold hover:underline">
                {affiliate.bank_name ? "Edit" : "Add"}
              </button>
            )}
          </div>
          {!showBankForm && affiliate.bank_name ? (
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { label: "Bank", value: affiliate.bank_name },
                { label: "Account", value: affiliate.account_number, mono: true },
                { label: "Name", value: affiliate.account_name },
              ].map(({ label, value, mono }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                  <p className={`text-sm font-semibold text-gray-900 ${mono ? "font-mono" : ""}`}>{value}</p>
                </div>
              ))}
            </div>
          ) : !showBankForm ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-gray-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Add your bank details to request payouts
            </div>
          ) : (
            <form onSubmit={saveBankDetails} className="space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Bank name</label>
                  <input className={inputClass} placeholder="Opay" value={bankForm.bankName}
                    onChange={(e) => setBankForm((f) => ({ ...f, bankName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Account number</label>
                  <input className={inputClass + " font-mono"} placeholder="0123456789" value={bankForm.accountNumber}
                    onChange={(e) => setBankForm((f) => ({ ...f, accountNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Account name</label>
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
                  className="px-5 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Referrals ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-bold text-gray-900">Your referrals</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {affiliate.active_referrals} active · {pendingReferrals} pending
              </p>
            </div>
            <span className="text-xs font-bold text-gray-400">{referrals.length} total</span>
          </div>

          {referrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 text-2xl">🔗</div>
              <p className="font-semibold text-gray-900 mb-1">No referrals yet</p>
              <p className="text-sm text-gray-400 mb-5">Share your link and start earning ₦2,000 per activation</p>
              <button onClick={copyLink}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-black font-bold text-sm hover:bg-amber-300 transition-colors">
                <Copy className="w-4 h-4" /> Copy my link
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {referrals.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-6 py-4">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-sm font-black text-amber-700 shrink-0">
                    {r.store_name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.store_name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <StatusPill status={r.status} />
                  {r.commission_amount && (
                    <span className="text-sm font-black text-green-600">{fmt(r.commission_amount)}</span>
                  )}
                  <a href={`/store/${r.store_slug}`} target="_blank" rel="noopener noreferrer"
                    className="text-gray-300 hover:text-gray-500 transition-colors ml-1">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Payout history ── */}
        {payouts.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Payout history</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{fmt(p.amount)}</p>
                    <p className="text-xs text-gray-400">
                      {p.bank_name} · <span className="font-mono">{p.account_number}</span>
                    </p>
                    {p.admin_note && <p className="text-xs text-red-400 mt-0.5 italic">{p.admin_note}</p>}
                  </div>
                  <div className="text-right">
                    <StatusPill status={p.status} />
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(p.requested_at).toLocaleDateString("en-NG")}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Promote tip ── */}
        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-bold text-amber-900 mb-1">💡 Tip: promote in WhatsApp groups</p>
            <p className="text-sm text-amber-700">
              Business groups, trade associations, market communities — anywhere entrepreneurs gather is a gold mine for referrals.
            </p>
          </div>
          <Link href="/affiliate" className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 whitespace-nowrap">
            Learn more <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </main>
    </div>
  );
}

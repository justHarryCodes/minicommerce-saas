"use client";

import { useState } from "react";
import { Check, X, Loader2, Banknote } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Payout {
  id: string;
  amount: number;
  status: string;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  admin_note: string | null;
  requested_at: string;
  processed_at: string | null;
}

interface Props {
  affiliateId: string;
  payouts: Payout[];
  isActive: boolean;
}

export function PayoutActions({ affiliateId, payoutId, onDone }: { affiliateId: string; payoutId: string; onDone: () => void }) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  async function act(action: "approve" | "reject") {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/affiliates/${affiliateId}/payouts/${payoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNote: note || undefined }),
      });
      if (!res.ok) { toast.error("Failed"); return; }
      toast.success(action === "approve" ? "Payout approved" : "Payout rejected");
      onDone();
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(null); setShowRejectForm(false); }
  }

  return (
    <div className="flex flex-col gap-2">
      {showRejectForm ? (
        <div className="flex flex-col gap-2 mt-1">
          <input
            className="px-2.5 py-1.5 rounded-lg border text-xs w-full"
            style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text-primary)" }}
            placeholder="Reason for rejection (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={() => act("reject")} disabled={!!loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-400 disabled:opacity-50">
              {loading === "reject" ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              Confirm reject
            </button>
            <button onClick={() => { setShowRejectForm(false); setNote(""); }}
              className="px-3 py-1.5 rounded-lg border text-xs"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => act("approve")} disabled={!!loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-400 disabled:opacity-50">
            {loading === "approve" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Approve
          </button>
          <button onClick={() => setShowRejectForm(true)} disabled={!!loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500/20 disabled:opacity-50">
            <X className="w-3 h-3" /> Reject
          </button>
        </div>
      )}
    </div>
  );
}

export function SuspendToggle({ affiliateId, isActive }: { affiliateId: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/affiliates/${affiliateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) { toast.error("Failed"); return; }
      toast.success(isActive ? "Affiliate suspended" : "Affiliate activated");
      router.refresh();
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <button onClick={toggle} disabled={loading}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 ${
        isActive
          ? "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20"
          : "bg-green-500/10 border border-green-500/20 text-green-600 hover:bg-green-500/20"
      }`}>
      {loading && <Loader2 className="w-3 h-3 animate-spin" />}
      {isActive ? "Suspend account" : "Activate account"}
    </button>
  );
}

export function MarkPaidButton({ affiliateId, payoutId, onDone }: { affiliateId: string; payoutId: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false);

  async function markPaid() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/affiliates/${affiliateId}/payouts/${payoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_paid" }),
      });
      if (!res.ok) { toast.error("Failed"); return; }
      toast.success("Marked as paid");
      onDone();
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <button onClick={markPaid} disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-xs font-bold hover:bg-green-500/20 disabled:opacity-50 transition-colors">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Banknote className="w-3 h-3" />}
      Mark as paid
    </button>
  );
}

export function PayoutRowActions({ affiliateId, payouts }: Props) {
  const router = useRouter();
  return (
    <div className="space-y-2">
      {payouts.map((p) => (
        <div key={p.id} className="rounded-xl border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>₦{Number(p.amount).toLocaleString()}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {p.bank_name} · {p.account_number} · {p.account_name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Requested {new Date(p.requested_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              {p.admin_note && <p className="text-xs text-red-400 mt-1 italic">{p.admin_note}</p>}
            </div>
            <div className="shrink-0">
              {p.status === "pending" ? (
                <PayoutActions affiliateId={affiliateId} payoutId={p.id} onDone={() => router.refresh()} />
              ) : p.status === "approved" ? (
                <MarkPaidButton affiliateId={affiliateId} payoutId={p.id} onDone={() => router.refresh()} />
              ) : (
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                  p.status === "rejected" ? "bg-red-400/10 text-red-500 border-red-400/20"
                  : "bg-green-400/10 text-green-600 border-green-400/20"
                }`}>
                  {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

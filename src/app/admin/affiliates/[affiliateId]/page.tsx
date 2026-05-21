import { verifyAdminSession } from "@/lib/admin-auth";
import { query, queryOne } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Clock } from "lucide-react";
import { SuspendToggle, PayoutRowActions } from "./AffiliateDetailClient";

interface Params { params: Promise<{ affiliateId: string }> }

export const metadata = { title: "Affiliate Detail — Admin" };

export default async function AffiliateDetailPage({ params }: Params) {
  const admin = await verifyAdminSession();
  if (!admin) notFound();

  const { affiliateId } = await params;

  const affiliate = await queryOne<{
    id: string; name: string; email: string; referral_code: string
    earnings_total: number; payout_balance: number; total_referrals: number
    active_referrals: number; is_active: boolean; bank_name: string | null
    account_number: string | null; account_name: string | null; created_at: string
  }>(
    `SELECT id, name, email, referral_code, earnings_total, payout_balance,
            total_referrals, active_referrals, is_active,
            bank_name, account_number, account_name, created_at
     FROM affiliates WHERE id = $1`,
    [affiliateId]
  );
  if (!affiliate) notFound();

  const referrals = await query<{
    id: string; store_name: string; store_slug: string; status: string
    commission_amount: number | null; created_at: string; rewarded_at: string | null
  }>(
    `SELECT ar.id, s.name AS store_name, s.slug AS store_slug,
            ar.status, ar.commission_amount, ar.created_at, ar.rewarded_at
     FROM affiliate_referrals ar
     JOIN stores s ON s.id = ar.store_id
     WHERE ar.affiliate_id = $1
     ORDER BY ar.created_at DESC`,
    [affiliateId]
  );

  const payouts = await query<{
    id: string; amount: number; status: string
    bank_name: string | null; account_number: string | null; account_name: string | null
    admin_note: string | null; requested_at: string; processed_at: string | null
  }>(
    `SELECT id, amount, status, bank_name, account_number, account_name,
            admin_note, requested_at, processed_at
     FROM affiliate_payouts WHERE affiliate_id = $1
     ORDER BY requested_at DESC`,
    [affiliateId]
  );

  const pendingPayouts = payouts.filter((p) => p.status === "pending");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/admin/affiliates"
        className="inline-flex items-center gap-1.5 text-sm font-semibold"
        style={{ color: "var(--text-muted)" }}>
        <ArrowLeft className="w-4 h-4" /> Affiliates
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-black shrink-0"
            style={{ backgroundColor: "var(--accent)" }}>
            {affiliate.name[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{affiliate.name}</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{affiliate.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg"
                style={{ backgroundColor: "var(--accent)", color: "#000" }}>
                {affiliate.referral_code}
              </span>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                affiliate.is_active
                  ? "bg-green-400/10 text-green-600 border-green-400/20"
                  : "bg-red-400/10 text-red-500 border-red-400/20"
              }`}>
                {affiliate.is_active ? "Active" : "Suspended"}
              </span>
            </div>
          </div>
        </div>
        <SuspendToggle affiliateId={affiliateId} isActive={affiliate.is_active} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total referrals",  value: affiliate.total_referrals },
          { label: "Active referrals", value: affiliate.active_referrals },
          { label: "Total earned",     value: `₦${Number(affiliate.earnings_total).toLocaleString()}` },
          { label: "Available balance",value: `₦${Number(affiliate.payout_balance).toLocaleString()}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border p-4"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Bank details */}
      {affiliate.bank_name && (
        <div className="rounded-2xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <h2 className="font-bold text-sm mb-3" style={{ color: "var(--text-primary)" }}>Bank details</h2>
          <div className="grid sm:grid-cols-3 gap-3 text-sm" style={{ color: "var(--text-primary)" }}>
            <div><span style={{ color: "var(--text-muted)" }}>Bank:</span> {affiliate.bank_name}</div>
            <div><span style={{ color: "var(--text-muted)" }}>Account:</span> <span className="font-mono">{affiliate.account_number}</span></div>
            <div><span style={{ color: "var(--text-muted)" }}>Name:</span> {affiliate.account_name}</div>
          </div>
        </div>
      )}

      {/* Pending payouts */}
      {pendingPayouts.length > 0 && (
        <div className="rounded-2xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-yellow-500" />
            <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              Pending payout requests ({pendingPayouts.length})
            </h2>
          </div>
          <PayoutRowActions affiliateId={affiliateId} payouts={pendingPayouts} isActive={affiliate.is_active} />
        </div>
      )}

      {/* Referrals */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
            Referrals <span className="font-normal ml-1" style={{ color: "var(--text-muted)" }}>{referrals.length} total</span>
          </h2>
        </div>
        {referrals.length === 0 ? (
          <div className="px-5 py-8 text-sm text-center" style={{ color: "var(--text-muted)" }}>No referrals yet</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0"
                  style={{ backgroundColor: "var(--accent)" }}>
                  {r.store_name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{r.store_name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {r.commission_amount && (
                    <span className="text-sm font-black text-green-600">₦{Number(r.commission_amount).toLocaleString()}</span>
                  )}
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                    r.status === "active"
                      ? "bg-green-400/10 text-green-600 border-green-400/20"
                      : "bg-yellow-400/10 text-yellow-600 border-yellow-400/20"
                  }`}>
                    {r.status === "active" ? <BadgeCheck className="w-3 h-3 mr-1" /> : null}
                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processed payout history (excludes pending — already shown above) */}
      {payouts.filter((p) => p.status !== "pending").length > 0 && (
        <div className="rounded-2xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <h2 className="font-bold text-sm mb-4" style={{ color: "var(--text-primary)" }}>Payout history</h2>
          <PayoutRowActions affiliateId={affiliateId} payouts={payouts.filter((p) => p.status !== "pending")} isActive={affiliate.is_active} />
        </div>
      )}
    </div>
  );
}

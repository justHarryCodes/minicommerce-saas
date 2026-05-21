import { verifyAdminSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { UserCheck, TrendingUp, ChevronRight } from "lucide-react";

export const metadata = { title: "Affiliates — Admin" };

interface AffiliateRow {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  earnings_total: number;
  payout_balance: number;
  total_referrals: number;
  active_referrals: number;
  is_active: boolean;
  created_at: string;
  pending_payouts: string;
}

export default async function AdminAffiliatesPage() {
  const admin = await verifyAdminSession();
  if (!admin) notFound();

  const affiliates = await query<AffiliateRow>(
    `SELECT a.id, a.name, a.email, a.referral_code,
            a.earnings_total, a.payout_balance,
            a.total_referrals, a.active_referrals,
            a.is_active, a.created_at,
            COUNT(ap.id) FILTER (WHERE ap.status = 'pending') AS pending_payouts
     FROM affiliates a
     LEFT JOIN affiliate_payouts ap ON ap.affiliate_id = a.id
     GROUP BY a.id
     ORDER BY a.created_at DESC`
  );

  const totalEarned = affiliates.reduce((s, a) => s + Number(a.earnings_total), 0);
  const pendingTotal = affiliates.reduce((s, a) => s + Number(a.payout_balance), 0);
  const pendingPayoutsCount = affiliates.reduce((s, a) => s + Number(a.pending_payouts), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>Affiliates</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Manage affiliate marketers and payout requests
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total affiliates", value: affiliates.length },
          { label: "Active referrals", value: affiliates.reduce((s, a) => s + a.active_referrals, 0) },
          { label: "Total commissions paid", value: `₦${totalEarned.toLocaleString()}` },
          { label: "Pending payouts", value: pendingPayoutsCount > 0 ? `${pendingPayoutsCount} (₦${pendingTotal.toLocaleString()})` : "0" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Affiliates table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        {affiliates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <UserCheck className="w-10 h-10" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>No affiliates yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: "var(--border)" }}>
                  {["Affiliate", "Code", "Referrals", "Earned", "Balance", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {affiliates.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0"
                          style={{ backgroundColor: "var(--accent)" }}>
                          {a.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{a.name}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold px-2 py-1 rounded-lg"
                        style={{ backgroundColor: "var(--accent)", color: "#000" }}>
                        {a.referral_code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div style={{ color: "var(--text-primary)" }}>
                        <span className="font-bold">{a.active_referrals}</span>
                        <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>
                          / {a.total_referrals}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold" style={{ color: "var(--text-primary)" }}>
                      ₦{Number(a.earnings_total).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-purple-500">
                      ₦{Number(a.payout_balance).toLocaleString()}
                      {Number(a.pending_payouts) > 0 && (
                        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-400/10 text-yellow-500">
                          {a.pending_payouts} pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        a.is_active
                          ? "bg-green-400/10 text-green-600 border-green-400/20"
                          : "bg-red-400/10 text-red-500 border-red-400/20"
                      }`}>
                        {a.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/affiliates/${a.id}`}
                        className="flex items-center gap-1 text-xs font-semibold hover:underline"
                        style={{ color: "var(--accent)" }}>
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
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

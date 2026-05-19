import { verifyAdminSession } from '@/lib/admin-auth'
import { query } from '@/lib/db'
import Link from 'next/link'
import { Users, TrendingUp, ShieldOff, Info, ClipboardCheck } from 'lucide-react'

export const metadata = { title: 'Overview' }

function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n)
}

export default async function AdminDashboardPage() {
  await verifyAdminSession() // layout already guards, but double-check

  const [totalRow, activeRow, suspendedRow, pendingApprovalRow, revenueRow, recentVendors] =
    await Promise.all([
      query<{ count: string }>('SELECT COUNT(*) as count FROM stores WHERE is_active = true', []),
      query<{ count: string }>(`SELECT COUNT(*) as count FROM stores WHERE is_active = true AND status = 'active'`, []),
      query<{ count: string }>(`SELECT COUNT(*) as count FROM stores WHERE is_active = true AND status = 'suspended'`, []),
      query<{ count: string }>(`SELECT COUNT(*) as count FROM stores WHERE status = 'pending_approval'`, []),
      query<{ total: string }>(`SELECT COALESCE(SUM(amount),0) as total FROM subscription_payments WHERE payment_status = 'paid' AND created_at >= date_trunc('month', NOW())`, []),
      query<{
        id: string; name: string; slug: string; status: string
        subscription_status: string; created_at: string
      }>(`SELECT id, name, slug, status, subscription_status, created_at FROM stores WHERE is_active = true ORDER BY created_at DESC LIMIT 10`, []),
    ])

  const stats = [
    {
      label: 'Total Vendors', value: totalRow[0]?.count ?? '0', icon: Users, color: '#3b82f6',
      tip: 'All stores that have registered on Duka, whether active or not.',
    },
    {
      label: 'Active Vendors', value: activeRow[0]?.count ?? '0', icon: TrendingUp, color: '#22c55e',
      tip: 'Stores currently live — their products are visible to shoppers.',
    },
    {
      label: 'Suspended', value: suspendedRow[0]?.count ?? '0', icon: ShieldOff, color: '#ef4444',
      tip: 'Stores you have suspended. Their products are hidden from shoppers. Go to Vendors → Manage to review.',
    },
    {
      label: 'Awaiting Approval', value: pendingApprovalRow[0]?.count ?? '0', icon: ClipboardCheck, color: '#3b82f6',
      tip: 'Vendors who have paid the setup fee and are waiting for you to confirm their registration. Go to Vendors → click Manage → Confirm Registration.',
    },
  ]

  const revenueThisMonth = Number(revenueRow[0]?.total ?? 0)

  const STATUS_COLORS: Record<string, string> = {
    active: '#22c55e',
    pending_approval: '#3b82f6',
    suspended: '#ef4444',
    restricted: '#f97316',
    pending_payment: '#f59e0b',
  }

  const SUB_LABELS: Record<string, string> = {
    none: 'None',
    setup_fee_pending: 'Setup Pending',
    setup_fee_paid: 'Setup Paid',
    subscribed: 'Subscribed',
    expired: 'Expired',
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>Overview</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Platform health at a glance</p>
      </div>

      {/* Quick-start guide */}
      <div className="rounded-2xl border p-5 mb-8 flex gap-4"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <Info className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
        <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>How the admin panel works</p>
          <ul className="space-y-1 text-xs leading-relaxed list-none">
            <li>📋 <strong>Overview</strong> — this page. Check the stat cards daily for anything that needs attention.</li>
            <li>🏪 <strong>Vendors</strong> — browse all stores. Click <em>Manage</em> on any vendor to confirm registration, activate, suspend, or restrict.</li>
            <li>📋 <strong>Plans</strong> — create and manage subscription plans vendors pay monthly to list products. Enable plan subscriptions in Settings.</li>
            <li>⚙️ <strong>Settings</strong> — toggle platform-wide features: setup fees, plan subscriptions, and new registrations.</li>
          </ul>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            All admin actions are audit-logged automatically — you can review them on each vendor's detail page.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, tip }) => (
          <div key={label} className="rounded-2xl border p-5"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>
            <p className="text-3xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>{value}</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{tip}</p>
          </div>
        ))}
      </div>

      {/* Revenue */}
      <div className="rounded-2xl border p-6 mb-8"
        style={{ background: 'var(--accent)', borderColor: 'transparent' }}>
        <p className="text-sm font-semibold text-black/60 uppercase tracking-wide mb-1">Revenue this month</p>
        <p className="text-4xl font-black text-black">{fmt(revenueThisMonth)}</p>
        <p className="text-sm text-black/60 mt-1">From setup fees + monthly subscriptions</p>
      </div>

      {/* Recent vendors */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Recent Vendors</h2>
          <Link href="/admin/vendors" className="text-sm font-semibold hover:underline"
            style={{ color: 'var(--accent)' }}>View all →</Link>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {recentVendors.map((v) => (
            <Link key={v.id} href={`/admin/vendors/${v.id}`}
              className="flex items-center justify-between px-6 py-4 hover:opacity-80 transition-opacity">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{v.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(v.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ background: STATUS_COLORS[v.status] ?? '#71717a' }}>
                  {v.status}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {SUB_LABELS[v.subscription_status] ?? v.subscription_status}
                </span>
              </div>
            </Link>
          ))}
          {recentVendors.length === 0 && (
            <div className="px-6 py-10 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No vendors yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

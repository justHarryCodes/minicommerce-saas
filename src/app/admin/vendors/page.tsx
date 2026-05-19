import { verifyAdminSession } from '@/lib/admin-auth'
import { query } from '@/lib/db'
import Link from 'next/link'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export const metadata = { title: 'Vendors' }

interface SearchParams { status?: string }

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:          { bg: '#22c55e18', text: '#16a34a' },
  suspended:       { bg: '#ef444418', text: '#dc2626' },
  restricted:      { bg: '#f9731618', text: '#ea580c' },
  pending_payment: { bg: '#f59e0b18', text: '#d97706' },
}

const SUB_LABELS: Record<string, string> = {
  none:              'No subscription',
  setup_fee_pending: 'Setup pending',
  setup_fee_paid:    'Setup paid',
  subscribed:        'Subscribed',
  expired:           'Expired',
}

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await verifyAdminSession()
  const { status } = await searchParams

  const params: unknown[] = []
  let where = 'WHERE is_active = true'
  if (status && status !== 'all') {
    params.push(status)
    where += ` AND status = $${params.length}`
  }

  const vendors = await query<{
    id: string
    name: string
    slug: string
    owner_email: string | null
    primary_category: string | null
    status: string
    subscription_status: string
    subscription_expires_at: string | null
    created_at: string
  }>(`SELECT id, name, slug, owner_email, primary_category, status, subscription_status,
             subscription_expires_at, created_at
      FROM stores ${where} ORDER BY created_at DESC`, params)

  const filters = ['all', 'active', 'suspended', 'restricted', 'pending_payment']

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>Vendors</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {vendors.length} vendor{vendors.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => {
          const active = (status ?? 'all') === f
          return (
            <Link key={f} href={f === 'all' ? '/admin/vendors' : `/admin/vendors?status=${f}`}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all capitalize"
              style={{
                background: active ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: active ? '#000' : 'var(--text-secondary)',
              }}>
              {f.replace('_', ' ')}
            </Link>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        {vendors.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-4xl mb-3">🏪</p>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No vendors found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {['Store', 'Email', 'Category', 'Status', 'Subscription', 'Joined', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {vendors.map((v) => {
                  const sc = STATUS_COLORS[v.status] ?? { bg: '#71717a18', text: '#71717a' }
                  return (
                    <tr key={v.id} className="hover:opacity-80 transition-opacity">
                      <td className="px-4 py-3">
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{v.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>/{v.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p style={{ color: 'var(--text-secondary)' }}>{v.owner_email ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p style={{ color: 'var(--text-secondary)' }}>{v.primary_category ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                          style={{ background: sc.bg, color: sc.text }}>
                          {v.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {SUB_LABELS[v.subscription_status] ?? v.subscription_status}
                        </p>
                        {v.subscription_expires_at && (
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            until {new Date(v.subscription_expires_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {new Date(v.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/vendors/${v.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                          style={{ background: 'var(--accent)', color: '#000' }}>
                          Manage
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { verifyAdminSession } from '@/lib/admin-auth'
import { queryOne, query } from '@/lib/db'
import { adminAuth } from '@/lib/firebase-admin'
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react'
import VendorActions from './VendorActions'

interface RouteParams { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: RouteParams) {
  const { id } = await params
  const store = await queryOne<{ name: string }>('SELECT name FROM stores WHERE id = $1', [id])
  return { title: store?.name ?? 'Vendor' }
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n)
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:          { bg: '#22c55e18', text: '#16a34a' },
  suspended:       { bg: '#ef444418', text: '#dc2626' },
  restricted:      { bg: '#f9731618', text: '#ea580c' },
  pending_payment: { bg: '#f59e0b18', text: '#d97706' },
}

const SUB_LABELS: Record<string, string> = {
  none:              'No subscription',
  setup_fee_pending: 'Setup fee pending',
  setup_fee_paid:    'Setup fee paid',
  subscribed:        'Subscribed',
  expired:           'Expired',
}

export default async function VendorDetailPage({ params }: RouteParams) {
  await verifyAdminSession()
  const { id } = await params

  const store = await queryOne<{
    id: string; name: string; slug: string; description: string | null
    owner_id: string; owner_email: string | null; primary_category: string | null
    status: string; subscription_status: string
    setup_fee_paid_at: string | null; subscription_expires_at: string | null
    nin_number: string | null; nin_verified: boolean
    nin_verified_at: string | null; nin_verified_by: string | null
    created_at: string; is_active: boolean
  }>(`SELECT id, name, slug, description, owner_id, owner_email, primary_category,
             status, subscription_status, setup_fee_paid_at, subscription_expires_at,
             nin_number, nin_verified, nin_verified_at, nin_verified_by,
             created_at, is_active
      FROM stores WHERE id = $1`, [id])

  if (!store) notFound()

  // Try to get owner's email from Firebase
  let ownerEmail = store.owner_email
  if (!ownerEmail) {
    try {
      const fbUser = await adminAuth.getUser(store.owner_id)
      ownerEmail = fbUser.email ?? null
    } catch { /* Firebase user may not exist */ }
  }

  const payments = await query<{
    id: string; type: string; amount: number; payment_status: string
    period_start: string | null; period_end: string | null; created_at: string
  }>(`SELECT id, type, amount, payment_status, period_start, period_end, created_at
      FROM subscription_payments WHERE store_id = $1 ORDER BY created_at DESC LIMIT 20`, [id])

  const auditLog = await query<{
    action: string; admin_email: string | null; details: unknown; created_at: string
  }>(`SELECT action, admin_email, details, created_at
      FROM admin_audit_log WHERE target_id = $1 ORDER BY created_at DESC LIMIT 15`, [id])

  const sc = STATUS_COLORS[store.status] ?? { bg: '#71717a18', text: '#71717a' }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back */}
      <Link href="/admin/vendors"
        className="inline-flex items-center gap-1.5 text-sm font-semibold mb-6 hover:underline"
        style={{ color: 'var(--text-secondary)' }}>
        <ArrowLeft className="w-4 h-4" /> Back to Vendors
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>{store.name}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>/{store.slug}</p>
        </div>
        <span className="px-3 py-1.5 rounded-full text-sm font-semibold capitalize mt-1"
          style={{ background: sc.bg, color: sc.text }}>
          {store.status.replace('_', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Store info */}
          <div className="rounded-2xl border p-6" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
            <h2 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Store Info</h2>
            <dl className="space-y-3 text-sm">
              {[
                ['Owner Email', ownerEmail ?? '—'],
                ['Firebase UID', store.owner_id],
                ['Category', store.primary_category ?? '—'],
                ['Description', store.description ?? '—'],
                ['Registered', new Date(store.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <dt className="w-28 shrink-0 font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</dt>
                  <dd className="break-all" style={{ color: 'var(--text-primary)' }}>{value}</dd>
                </div>
              ))}
            </dl>
            <a href={`/store/${store.slug}`} target="_blank" rel="noopener noreferrer"
              className="inline-block mt-4 text-xs font-semibold hover:underline"
              style={{ color: 'var(--accent)' }}>
              View storefront →
            </a>
          </div>

          {/* Payment history */}
          <div className="rounded-2xl border p-6" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
            <h2 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Payment History</h2>
            {payments.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No payments yet</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'var(--bg-tertiary)' }}>
                    <div>
                      <p className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                        {p.type.replace('_', ' ')}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(p.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {p.period_end && ` · until ${new Date(p.period_end).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(Number(p.amount))}</p>
                      <span className="text-xs font-semibold"
                        style={{ color: p.payment_status === 'paid' ? '#16a34a' : p.payment_status === 'failed' ? '#dc2626' : '#d97706' }}>
                        {p.payment_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — actions */}
        <div className="space-y-6">
          <VendorActions storeId={store.id} currentStatus={store.status} />

          {/* Subscription info */}
          <div className="rounded-2xl border p-5" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
            <h3 className="font-bold mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>Subscription</h3>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              {SUB_LABELS[store.subscription_status] ?? store.subscription_status}
            </p>
            {store.subscription_expires_at && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Expires {new Date(store.subscription_expires_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          {/* Audit log */}
          {auditLog.length > 0 && (
            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
              <h3 className="font-bold mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>Admin Activity</h3>
              <div className="space-y-2">
                {auditLog.map((log, i) => (
                  <div key={i} className="text-xs border-b pb-2 last:border-0 last:pb-0"
                    style={{ borderColor: 'var(--border)' }}>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    <p style={{ color: 'var(--text-muted)' }}>
                      by {log.admin_email ?? 'admin'} · {new Date(log.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

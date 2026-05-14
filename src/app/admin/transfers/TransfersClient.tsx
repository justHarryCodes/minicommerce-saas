'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, Loader2, ArrowUpRight, Clock, Ban } from 'lucide-react'

interface Transfer {
  id: string
  type: string
  amount: number
  payment_reference: string
  payment_status: string
  created_at: string
  store_name: string
  store_slug: string
  store_id: string
  plan_name: string | null
}

const TYPE_LABELS: Record<string, string> = {
  setup_fee: 'Setup Fee',
  monthly:   'Monthly Subscription',
  plan:      'Plan Subscription',
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending_transfer: { label: 'Awaiting Confirmation', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  paid:             { label: 'Confirmed',             cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  rejected:         { label: 'Rejected',              cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
}

function fmt(n: number) {
  return `₦${Number(n).toLocaleString('en-NG')}`
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function TransfersClient({ initialTransfers }: { initialTransfers: Transfer[] }) {
  const [transfers, setTransfers] = useState<Transfer[]>(initialTransfers)
  const [actingId, setActingId] = useState<string | null>(null)
  const [tab, setTab] = useState<'pending' | 'all'>('pending')

  const pending = transfers.filter(t => t.payment_status === 'pending_transfer')
  const displayed = tab === 'pending' ? pending : transfers

  async function handleAction(id: string, action: 'confirm' | 'reject') {
    if (action === 'reject' && !confirm('Reject this transfer? The vendor will need to re-submit.')) return
    setActingId(id)
    try {
      const res = await fetch(`/api/admin/transfers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setTransfers(prev =>
        prev.map(t =>
          t.id === id
            ? { ...t, payment_status: action === 'confirm' ? 'paid' : 'rejected' }
            : t
        )
      )
      toast.success(action === 'confirm' ? 'Transfer confirmed — payment fulfilled' : 'Transfer rejected')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Bank Transfer Payments</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Vendors who paid via bank transfer and clicked "I've made this transfer"
          </p>
        </div>
        {pending.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            <Clock className="w-4 h-4" />
            {pending.length} pending
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
        {([['pending', `Pending (${pending.length})`], ['all', 'All']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {displayed.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-16 text-center">
          <CheckCircle className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="font-semibold text-zinc-900 dark:text-white mb-1">
            {tab === 'pending' ? 'No pending transfers' : 'No bank transfers yet'}
          </p>
          <p className="text-sm text-zinc-400">
            {tab === 'pending' ? 'All transfers have been reviewed.' : 'Vendors who pay by bank transfer will appear here.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  {['Store', 'Payment type', 'Amount', 'Reference', 'Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {displayed.map(t => {
                  const badge = STATUS_BADGE[t.payment_status] ?? { label: t.payment_status, cls: 'bg-zinc-100 text-zinc-600' }
                  const isPending = t.payment_status === 'pending_transfer'
                  const acting = actingId === t.id
                  return (
                    <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900 dark:text-white">{t.store_name}</span>
                          <a
                            href={`/admin/vendors`}
                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {TYPE_LABELS[t.type] ?? t.type}
                          {t.plan_name && <span className="text-zinc-400 ml-1">({t.plan_name})</span>}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-zinc-900 dark:text-white">{fmt(t.amount)}</td>
                      <td className="px-5 py-4 font-mono text-xs text-zinc-500 dark:text-zinc-400">{t.payment_reference}</td>
                      <td className="px-5 py-4 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtDate(t.created_at)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {isPending ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAction(t.id, 'confirm')}
                              disabled={acting}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
                            >
                              {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              Confirm
                            </button>
                            <button
                              onClick={() => handleAction(t.id, 'reject')}
                              disabled={acting}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                            >
                              {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-300 dark:text-zinc-600 flex items-center gap-1">
                            <Ban className="w-3.5 h-3.5" /> —
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

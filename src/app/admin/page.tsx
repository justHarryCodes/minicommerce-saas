import Link from 'next/link'
import { AlertCircle, ArrowRight, ArrowUpRight, Megaphone, Target, TrendingUp } from 'lucide-react'
import { verifyAdminSession } from '@/lib/admin-auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Overview' }

// Admin command centre: what needs doing now, how Duka is doing, and where
// growth will come from (leads). Every number links to where you act on it.

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`
const short = (n: number) => (n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}m` : n >= 10_000 ? `₦${Math.round(n / 1000)}k` : naira(n))
const pct = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : now > 0 ? 100 : 0)

type Day = { d: string; n: number }

/** 14 days, filling the gaps with zero. */
function days14(rows: { d: string; n: number | string }[]): Day[] {
  const by = new Map(rows.map((r) => [String(r.d).slice(0, 10), Number(r.n)]))
  return Array.from({ length: 14 }, (_, i) => {
    const t = new Date(Date.now() - (13 - i) * 86_400_000).toISOString().slice(0, 10)
    return { d: t, n: by.get(t) ?? 0 }
  })
}

function Bars({ data, money, label }: { data: Day[]; money?: boolean; label: string }) {
  const max = Math.max(1, ...data.map((x) => x.n))
  const total = data.reduce((s, x) => s + x.n, 0)
  return (
    <div className="rounded-xl border p-4" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{money ? short(total) : total.toLocaleString()}</p>
      </div>
      <div className="flex h-24 items-end gap-1" role="img" aria-label={`${label}: ${data.map((x) => `${x.d} ${x.n}`).join(', ')}`}>
        {data.map((x) => (
          <div key={x.d} className="group relative flex h-full flex-1 items-end">
            <div className="w-full rounded-t bg-amber-400/80 transition-colors group-hover:bg-amber-500" style={{ height: `${Math.max(x.n ? 6 : 2, (x.n / max) * 100)}%`, opacity: x.n ? 1 : 0.25 }} />
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
              {new Date(x.d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}: {money ? naira(x.n) : x.n}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
        <span>{new Date(data[0].d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
        <span>Today</span>
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, delta, href }: { label: string; value: string; sub?: string; delta?: number | null; href?: string }) {
  const body = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
        {delta != null && delta !== 0 && (
          <span className={`text-[11px] font-bold ${delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{delta > 0 ? '▲' : '▼'} {Math.abs(delta)}%</span>
        )}
      </div>
      {sub && <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </>
  )
  const cls = 'block rounded-xl border p-3.5 transition-colors'
  const style = { background: 'var(--bg)', borderColor: 'var(--border)' }
  return href ? (
    <Link href={href} className={`${cls} hover:border-amber-400`} style={style}>{body}</Link>
  ) : (
    <div className={cls} style={style}>{body}</div>
  )
}

export default async function AdminOverview() {
  await verifyAdminSession()

  const safe = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[])
  const [k, signups, gmv, top, recent, attention, subs, leads] = await Promise.all([
    query<{ total: number; new7: number; prev7: number; live: number; gmv30: number; gmvPrev30: number; orders30: number }>(
      `SELECT
         (SELECT COUNT(*)::int FROM stores WHERE is_active = true AND deleted_at IS NULL) AS total,
         (SELECT COUNT(*)::int FROM stores WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '7 days') AS new7,
         (SELECT COUNT(*)::int FROM stores WHERE deleted_at IS NULL AND created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days') AS prev7,
         (SELECT COUNT(*)::int FROM stores s WHERE s.is_active = true AND s.deleted_at IS NULL AND EXISTS (SELECT 1 FROM products p WHERE p.store_id = s.id AND p.is_active = true)) AS live,
         (SELECT COALESCE(SUM(COALESCE(total_amount, total)), 0)::float FROM orders WHERE payment_status = 'paid' AND created_at > NOW() - INTERVAL '30 days') AS gmv30,
         (SELECT COALESCE(SUM(COALESCE(total_amount, total)), 0)::float FROM orders WHERE payment_status = 'paid' AND created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days') AS "gmvPrev30",
         (SELECT COUNT(*)::int FROM orders WHERE payment_status = 'paid' AND created_at > NOW() - INTERVAL '30 days') AS orders30`,
    ),
    safe(query<{ d: string; n: number }>(`SELECT created_at::date::text AS d, COUNT(*)::int AS n FROM stores WHERE created_at > NOW() - INTERVAL '14 days' GROUP BY 1`)),
    safe(query<{ d: string; n: number }>(`SELECT created_at::date::text AS d, SUM(COALESCE(total_amount, total))::float AS n FROM orders WHERE payment_status = 'paid' AND created_at > NOW() - INTERVAL '14 days' GROUP BY 1`)),
    safe(query<{ id: string; name: string; category: string | null; revenue: number; orders: number }>(
      `SELECT s.id, s.name, s.primary_category AS category, SUM(COALESCE(o.total_amount, o.total))::float AS revenue, COUNT(*)::int AS orders
         FROM orders o JOIN stores s ON s.id = o.store_id
        WHERE o.payment_status = 'paid' AND o.created_at > NOW() - INTERVAL '30 days'
        GROUP BY s.id ORDER BY revenue DESC LIMIT 6`,
    )),
    safe(query<{ id: string; name: string; category: string | null; created_at: string; products: number }>(
      `SELECT s.id, s.name, s.primary_category AS category, s.created_at,
              (SELECT COUNT(*)::int FROM products p WHERE p.store_id = s.id AND p.is_active = true) AS products
         FROM stores s WHERE s.deleted_at IS NULL ORDER BY s.created_at DESC LIMIT 6`,
    )),
    query<{ approvals: number; transfers: number; data: number }>(
      `SELECT
         (SELECT COUNT(*)::int FROM stores WHERE status = 'pending_approval') AS approvals,
         (SELECT COUNT(*)::int FROM subscription_payments WHERE payment_method = 'bank_transfer' AND payment_status = 'pending_transfer') AS transfers,
         COALESCE((SELECT COUNT(*)::int FROM data_deletion_requests WHERE status IN ('received', 'in_progress')), 0) AS data`,
    ).catch(() =>
      query<{ approvals: number; transfers: number; data: number }>(
        `SELECT (SELECT COUNT(*)::int FROM stores WHERE status = 'pending_approval') AS approvals,
                (SELECT COUNT(*)::int FROM subscription_payments WHERE payment_method = 'bank_transfer' AND payment_status = 'pending_transfer') AS transfers,
                0 AS data`,
      ),
    ),
    safe(query<{ yearly: number; monthly: number; mrr: number }>(
      `WITH paid AS (
         SELECT sp.store_id, sp.amount, sp.created_at, COALESCE(to_jsonb(sp) ->> 'billing_cycle', 'monthly') AS cycle
           FROM subscription_payments sp WHERE sp.type = 'plan' AND sp.payment_status = 'paid'
       ), cur AS (
         SELECT DISTINCT ON (p.store_id) p.store_id, p.cycle FROM paid p JOIN stores s ON s.id = p.store_id AND s.plan_expires_at > NOW()
          ORDER BY p.store_id, p.created_at DESC
       )
       SELECT (SELECT COUNT(*) FROM cur WHERE cycle = 'yearly')::int AS yearly,
              (SELECT COUNT(*) FROM cur WHERE cycle = 'monthly')::int AS monthly,
              (SELECT COALESCE(SUM(amount), 0) FROM paid WHERE created_at >= date_trunc('month', NOW()))::float AS mrr`,
    )),
    safe(query<{ unfinished: number; upgrade: number }>(
      `SELECT
         (SELECT COUNT(*)::int FROM stores s WHERE s.is_active = true AND s.deleted_at IS NULL
            AND ((SELECT COUNT(*) FROM products p WHERE p.store_id = s.id AND p.is_active = true) < 2
                 OR NOT (s.duka_pay_status = 'active' OR COALESCE(s.bank_account_number, '') <> ''))) AS unfinished,
         (SELECT COUNT(*)::int FROM stores s LEFT JOIN plans pl ON pl.id = s.current_plan_id
           WHERE s.is_active = true AND s.deleted_at IS NULL
             AND NOT (s.current_plan_id IS NOT NULL AND s.plan_expires_at > NOW() AND COALESCE(pl.price_monthly, 0) > 0)
             AND EXISTS (SELECT 1 FROM orders o WHERE o.store_id = s.id AND o.payment_status = 'paid' AND o.created_at > NOW() - INTERVAL '30 days')) AS upgrade`,
    )),
  ])

  const m = k[0]
  const a = attention[0] ?? { approvals: 0, transfers: 0, data: 0 }
  const s = subs[0] ?? { yearly: 0, monthly: 0, mrr: 0 }
  const l = leads[0] ?? { unfinished: 0, upgrade: 0 }
  const todo = [
    a.approvals > 0 && { n: a.approvals, label: 'stores waiting for approval', href: '/admin/vendors' },
    a.transfers > 0 && { n: a.transfers, label: 'bank transfers to confirm', href: '/admin/transfers' },
    a.data > 0 && { n: a.data, label: 'data deletion requests', href: '/admin/data-requests' },
  ].filter(Boolean) as { n: number; label: string; href: string }[]

  return (
    <div className="space-y-4">
      {/* Needs attention */}
      {todo.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-900/60 dark:bg-amber-950/30">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <span className="text-[13px] font-semibold text-amber-900 dark:text-amber-200">Needs you:</span>
          {todo.map((t) => (
            <Link key={t.href} href={t.href} className="rounded-full bg-white px-2.5 py-0.5 text-[12px] font-semibold text-amber-900 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-100">
              {t.n} {t.label} →
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>✓ Nothing waiting on you. Approvals, transfers and data requests are all clear.</p>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Vendors" value={m.total.toLocaleString()} sub={`+${m.new7} this week`} delta={pct(m.new7, m.prev7)} href="/admin/vendors" />
        <Kpi label="Live stores" value={m.live.toLocaleString()} sub={`${m.total ? Math.round((m.live / m.total) * 100) : 0}% have products`} href="/admin/vendors" />
        <Kpi label="Sales on Duka · 30d" value={short(m.gmv30)} sub={`${m.orders30.toLocaleString()} paid orders`} delta={pct(m.gmv30, m.gmvPrev30)} />
        <Kpi label="Plan revenue · month" value={short(s.mrr)} sub={`${s.monthly} monthly · ${s.yearly} yearly`} href="/admin/plans" />
        <Kpi label="Unfinished stores" value={l.unfinished.toLocaleString()} sub="to activate" href="/admin/leads?tab=unfinished" />
        <Kpi label="Upgrade prospects" value={l.upgrade.toLocaleString()} sub="Free, already selling" href="/admin/leads?tab=upgrade" />
      </div>

      {/* Trends */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Bars data={days14(signups)} label="New stores · 14 days" />
        <Bars data={days14(gmv)} money label="Sales across Duka · 14 days" />
      </div>

      {/* Growth actions + lists */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="space-y-2 rounded-xl border p-4" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Grow</p>
          {[
            { href: '/admin/leads?tab=unfinished', icon: Target, t: 'Activate unfinished stores', d: `${l.unfinished} haven't got products or a payout account` },
            { href: '/admin/leads?tab=upgrade', icon: TrendingUp, t: 'Pitch upgrades', d: `${l.upgrade} Free stores are already making sales` },
            { href: '/admin/campaigns/new', icon: Megaphone, t: 'Send a campaign', d: 'Email, push or a dashboard banner, by category, plan, activity or location' },
          ].map((x) => (
            <Link key={x.href} href={x.href} className="flex items-start gap-3 rounded-lg p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><x.icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{x.t}</span>
                <span className="block text-[12px]" style={{ color: 'var(--text-muted)' }}>{x.d}</span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            </Link>
          ))}
        </div>

        <div className="rounded-xl border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <p className="px-4 pt-4 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Top stores · 30 days</p>
          <ul className="p-2">
            {top.map((t, i) => (
              <li key={t.id}>
                <Link href={`/admin/vendors/${t.id}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <span className="w-4 text-[12px] font-bold" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                    <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>{t.orders} orders{t.category ? ` · ${t.category}` : ''}</span>
                  </span>
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{short(t.revenue)}</span>
                </Link>
              </li>
            ))}
            {!top.length && <li className="px-2 py-6 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>No paid orders in the last 30 days.</li>}
          </ul>
        </div>

        <div className="rounded-xl border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-4 pt-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Newest vendors</p>
            <Link href="/admin/vendors" className="text-[12px] font-semibold hover:underline" style={{ color: 'var(--text-secondary)' }}>All →</Link>
          </div>
          <ul className="p-2">
            {recent.map((v) => (
              <li key={v.id}>
                <Link href={`/admin/vendors/${v.id}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{v.name}</span>
                    <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(v.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}{v.category ? ` · ${v.category}` : ''}
                    </span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${v.products ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                    {v.products ? `${v.products} products` : 'No products'}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

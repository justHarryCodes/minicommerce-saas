import { redirect } from 'next/navigation'
import { verifyAdminSession } from '@/lib/admin-auth'
import AdminSidebar from './AdminSidebar'

export const dynamic = 'force-dynamic'

export const metadata = { title: { default: 'Admin', template: '%s | Admin — ShopForge' } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await verifyAdminSession()

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center max-w-sm p-8 rounded-2xl border" style={{ borderColor: 'var(--border)' }}>
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
            Access Denied
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            You don&apos;t have admin privileges. Contact a super admin to get access.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold text-black"
            style={{ background: 'var(--accent)' }}
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      <AdminSidebar admin={admin} />
      <div className="lg:pl-60 flex flex-col min-h-screen">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

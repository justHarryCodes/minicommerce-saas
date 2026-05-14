import { verifyAdminSession } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import TransfersClient from './TransfersClient'

export default async function TransfersPage() {
  const admin = await verifyAdminSession()
  if (!admin) redirect('/admin/login')

  const transfers = await query(
    `SELECT
       sp.id, sp.type, sp.amount, sp.payment_reference, sp.payment_status,
       sp.plan_id, sp.created_at,
       s.name  AS store_name,
       s.slug  AS store_slug,
       s.id    AS store_id,
       p.name  AS plan_name
     FROM subscription_payments sp
     JOIN stores s ON s.id = sp.store_id
     LEFT JOIN plans p ON p.id = sp.plan_id
     WHERE sp.payment_method = 'bank_transfer'
     ORDER BY
       CASE sp.payment_status WHEN 'pending_transfer' THEN 0 ELSE 1 END,
       sp.created_at DESC`,
    []
  )

  return <TransfersClient initialTransfers={transfers as unknown as Parameters<typeof TransfersClient>[0]['initialTransfers']} />
}

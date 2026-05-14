import { verifyAdminSession, getPlatformSettings } from '@/lib/admin-auth'
import { query } from '@/lib/db'
import SettingsClient from './SettingsClient'

export const metadata = { title: 'Platform Settings' }

export default async function AdminSettingsPage() {
  await verifyAdminSession()
  const [settings, bankAccounts] = await Promise.all([
    getPlatformSettings(),
    query<{ id: string; bank_name: string; account_number: string; account_name: string; is_active: boolean; sort_order: number }>(
      'SELECT id, bank_name, account_number, account_name, is_active, sort_order FROM platform_bank_accounts ORDER BY sort_order, created_at',
      []
    ),
  ])
  return <SettingsClient initialSettings={settings} initialBankAccounts={bankAccounts} />
}

import { verifyAdminSession, getPlatformSettings } from '@/lib/admin-auth'
import SettingsClient from './SettingsClient'

export const metadata = { title: 'Platform Settings' }

export default async function AdminSettingsPage() {
  await verifyAdminSession()
  const settings = await getPlatformSettings()
  return <SettingsClient initialSettings={settings} />
}

import { redirect } from 'next/navigation'
import { verifySession, getUserStore } from '@/lib/auth'
import { queryOne, queryMany } from '@/lib/db'
import ReferralClient from './ReferralClient'

export const metadata = { title: 'Refer & Earn' }

export default async function ReferralPage() {
  const user = await verifySession()
  if (!user) redirect('/auth/login')
  const store = await getUserStore(user.firebaseUid)
  if (!store) redirect('/onboarding')

  const storeRow = await queryOne<{ referral_code: string; referral_credits: number }>(
    'SELECT referral_code, referral_credits FROM stores WHERE id = $1',
    [store.id]
  )
  const referrals = await queryMany<{ status: string; created_at: string; store_name: string | null }>(
    `SELECT r.status, r.created_at, s.name as store_name
     FROM referrals r LEFT JOIN stores s ON s.id = r.referred_store_id
     WHERE r.referrer_store_id = $1 ORDER BY r.created_at DESC`,
    [store.id]
  )

  return (
    <ReferralClient
      referralCode={storeRow?.referral_code ?? ''}
      referralCredits={storeRow?.referral_credits ?? 0}
      referrals={referrals}
    />
  )
}

import { cookies } from 'next/headers'
import { adminAuth } from './firebase-admin'
import { queryOne } from './db'
import { randomBytes } from 'crypto'

const COOKIE_NAME = 'af_session'
const SESSION_DURATION_MS = 60 * 60 * 24 * 14 * 1000 // 14 days

export interface AffiliateSession {
  id: string
  email: string
  name: string
  referralCode: string
  firebaseUid: string
}

export async function verifyAffiliateSession(): Promise<AffiliateSession | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(COOKIE_NAME)?.value
    if (!sessionCookie) return null

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)

    const affiliate = await queryOne<{
      id: string
      name: string
      referral_code: string
      is_active: boolean
    }>(
      'SELECT id, name, referral_code, is_active FROM affiliates WHERE firebase_uid = $1',
      [decoded.uid]
    )
    if (!affiliate || !affiliate.is_active) return null

    return {
      id: affiliate.id,
      email: decoded.email ?? '',
      name: affiliate.name,
      referralCode: affiliate.referral_code,
      firebaseUid: decoded.uid,
    }
  } catch {
    return null
  }
}

export async function createAffiliateSessionCookie(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_DURATION_MS })
}

export function setAffiliateCookieHeader(sessionCookie: string) {
  return {
    name: COOKIE_NAME,
    value: sessionCookie,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  }
}

export function clearAffiliateCookieHeader() {
  return { name: COOKIE_NAME, value: '', maxAge: 0, path: '/' }
}

export function generateReferralCode(): string {
  return 'AF' + randomBytes(3).toString('hex').toUpperCase()
}

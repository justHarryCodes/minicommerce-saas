// ─── Auth helpers (server) ────────────────────────────────────────
// Schema uses stores.owner_id = Firebase UID (TEXT) directly.
// No separate users table.
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { adminAuth } from './firebase-admin'
import { queryOne, toCamel } from './db'
import { getPlatformSettings } from './admin-auth'
import type { Store } from '@/types'

const SESSION_COOKIE = 'session'

export interface SessionUser {
  firebaseUid: string
  email: string
  displayName?: string
}

// Verify session cookie OR Bearer token (mobile app) → returns SessionUser or null
export async function verifySession(): Promise<SessionUser | null> {
  // 1. Try session cookie (web dashboard)
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
    if (sessionCookie) {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      return {
        firebaseUid: decoded.uid,
        email: decoded.email ?? '',
        displayName: decoded.name,
      };
    }
  } catch {}

  // 2. Try Bearer token (mobile app)
  try {
    const headerStore = await headers();
    const auth = headerStore.get('authorization') ?? headerStore.get('Authorization');
    if (auth?.startsWith('Bearer ')) {
      const idToken = auth.slice(7);
      const decoded = await adminAuth.verifyIdToken(idToken);
      return {
        firebaseUid: decoded.uid,
        email: decoded.email ?? '',
        displayName: decoded.name,
      };
    }
  } catch {}

  return null;
}

// Get store owned by this Firebase UID
export async function getUserStore(firebaseUid: string): Promise<Store | null> {
  const row = await queryOne(
    'SELECT * FROM stores WHERE owner_id = $1 AND is_active = true',
    [firebaseUid]
  )
  if (!row) return null
  return toCamel<Store>(row as Record<string, unknown>)
}

// Create session cookie from ID token
export async function createSessionCookie(idToken: string): Promise<string> {
  const expiresIn = 60 * 60 * 24 * 14 * 1000 // 14 days
  return adminAuth.createSessionCookie(idToken, { expiresIn })
}

// Returns a 402 NextResponse if the setup fee is required and unpaid, else null.
// Use in any dashboard mutation API route after getUserStore().
export async function requireSubscription(store: Store): Promise<NextResponse | null> {
  const settings = await getPlatformSettings()
  if (!settings.require_setup_fee) return null
  const paid =
    store.subscriptionStatus === 'setup_fee_paid' ||
    store.subscriptionStatus === 'subscribed'
  if (!paid) {
    return NextResponse.json(
      { error: 'Setup fee required. Please complete payment before using this feature.' },
      { status: 402 }
    )
  }
  return null
}

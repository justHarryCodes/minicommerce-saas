// ─── Auth helpers (server) ────────────────────────────────────────
// Schema uses stores.owner_id = Firebase UID (TEXT) directly.
// No separate users table.
import { cookies } from 'next/headers'
import { adminAuth } from './firebase-admin'
import { queryOne, toCamel } from './db'
import type { Store } from '@/types'

const SESSION_COOKIE = 'session'

export interface SessionUser {
  firebaseUid: string
  email: string
  displayName?: string
}

// Verify session cookie → returns SessionUser or null
export async function verifySession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies(); // add await here
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionCookie) return null;

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return {
      firebaseUid: decoded.uid,
      email: decoded.email ?? "",
      displayName: decoded.name,
    };
  } catch {
    return null;
  }
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

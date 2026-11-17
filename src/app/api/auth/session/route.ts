import { NextRequest, NextResponse } from 'next/server'
import { createSessionCookie, isRecentSignIn } from '@/lib/auth'
import { adminAuth } from '@/lib/firebase-admin'
import { cookies } from 'next/headers'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  // 10 login attempts per 15 minutes per IP
  const limited = await checkRateLimit(req, {
    key: 'rl:vendor-login',
    max: 10,
    window: 900,
    message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  })
  if (limited) return limited

  try {
    const { idToken } = await req.json()
    if (!idToken || typeof idToken !== 'string') return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    // checkRevoked: a token from a disabled account or a "sign out everywhere"
    // must not become a fresh session.
    const decoded = await adminAuth.verifyIdToken(idToken, true)
    const cookieStore = await cookies()

    // A session is only minted from a sign-in that just happened, or to
    // refresh a session this browser already holds for the same account
    // (AuthProvider re-syncs on every page load). A stolen ID token on its
    // own can no longer be turned into a 14-day session.
    if (!isRecentSignIn(decoded.auth_time)) {
      const existing = cookieStore.get('session')?.value
      const current = existing ? await adminAuth.verifySessionCookie(existing, true).catch(() => null) : null
      if (current?.uid !== decoded.uid) {
        return NextResponse.json({ error: 'Please sign in again.', code: 'reauth_required' }, { status: 401 })
      }
    }

    const sessionCookie = await createSessionCookie(idToken)
    cookieStore.set('session', sessionCookie, {
      httpOnly: true,
      secure: true, // always secure — both prod and dev with HTTPS
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 14,
      path: '/',
    })
    return NextResponse.json({ ok: true })
  } catch {
    // Never return raw error messages from Firebase/internal SDKs
    return NextResponse.json({ error: 'Authentication failed. Please try again.' }, { status: 401 })
  }
}

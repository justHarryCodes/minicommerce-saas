import { NextRequest, NextResponse } from 'next/server'
import { createSessionCookie } from '@/lib/auth'
import { adminAuth } from '@/lib/firebase-admin'
import { cookies } from 'next/headers'
import { verifyRecaptcha } from '@/lib/recaptcha'
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
    const { idToken, recaptchaToken } = await req.json()
    if (!idToken) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const decoded = await adminAuth.verifyIdToken(idToken)

    // Require reCAPTCHA for email/password sign-ins (Google OAuth skips this)
    if (decoded.firebase?.sign_in_provider === 'password') {
      if (!recaptchaToken) {
        return NextResponse.json({ error: 'Please complete the reCAPTCHA' }, { status: 400 })
      }
      const valid = await verifyRecaptcha(recaptchaToken)
      if (!valid) {
        return NextResponse.json({ error: 'reCAPTCHA verification failed. Please try again.' }, { status: 400 })
      }
    }

    const sessionCookie = await createSessionCookie(idToken)
    const cookieStore = await cookies()
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

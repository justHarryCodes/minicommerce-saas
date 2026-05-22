import { NextRequest, NextResponse } from 'next/server'
import { createSessionCookie } from '@/lib/auth'
import { adminAuth } from '@/lib/firebase-admin'
import { cookies } from 'next/headers'
import { verifyRecaptcha } from '@/lib/recaptcha'

export async function POST(req: NextRequest) {
  try {
    const { idToken, recaptchaToken } = await req.json()
    if (!idToken) return NextResponse.json({ error: 'No token' }, { status: 400 })

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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 14,
      path: '/',
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Auth error'
    return NextResponse.json({ error: msg }, { status: 401 })
  }
}

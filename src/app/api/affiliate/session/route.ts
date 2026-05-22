import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { queryOne } from '@/lib/db'
import { createAffiliateSessionCookie, setAffiliateCookieHeader, clearAffiliateCookieHeader } from '@/lib/affiliate-auth'
import { verifyRecaptcha } from '@/lib/recaptcha'
import { checkRateLimit } from '@/lib/rate-limit'

// POST — exchange Firebase ID token for a session cookie (login)
export async function POST(req: NextRequest) {
  // 10 attempts per 15 minutes per IP
  const limited = await checkRateLimit(req, {
    key: 'rl:affiliate-login',
    max: 10,
    window: 900,
    message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  })
  if (limited) return limited

  const { idToken, recaptchaToken } = await req.json()
  if (!idToken) return NextResponse.json({ error: 'Missing idToken' }, { status: 400 })

  let decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>
  try {
    decoded = await adminAuth.verifyIdToken(idToken)
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // Require email verification before issuing a session
  if (!decoded.email_verified) {
    return NextResponse.json(
      { error: 'Please verify your email address before signing in. Check your inbox for the verification link.' },
      { status: 403 }
    )
  }

  // Require reCAPTCHA for email/password sign-ins
  if (decoded.firebase?.sign_in_provider === 'password') {
    if (!recaptchaToken) {
      return NextResponse.json({ error: 'Please complete the reCAPTCHA' }, { status: 400 })
    }
    const valid = await verifyRecaptcha(recaptchaToken)
    if (!valid) {
      return NextResponse.json({ error: 'reCAPTCHA verification failed. Please try again.' }, { status: 400 })
    }
  }

  // Verify this Firebase user is registered as an affiliate
  const affiliate = await queryOne(
    'SELECT id FROM affiliates WHERE firebase_uid = $1 AND is_active = true',
    [decoded.uid]
  )
  if (!affiliate) {
    return NextResponse.json({ error: 'No affiliate account found for this email' }, { status: 403 })
  }

  const sessionCookie = await createAffiliateSessionCookie(idToken)
  const res = NextResponse.json({ ok: true })
  const c = setAffiliateCookieHeader(sessionCookie)
  res.cookies.set(c.name, c.value, {
    httpOnly: c.httpOnly,
    secure: true, // always secure
    sameSite: c.sameSite,
    path: c.path,
    maxAge: c.maxAge,
  })
  return res
}

// DELETE — clear session cookie (logout)
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  const c = clearAffiliateCookieHeader()
  res.cookies.set(c.name, c.value, { maxAge: c.maxAge, path: c.path })
  return res
}

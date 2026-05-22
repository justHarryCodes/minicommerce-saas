import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { queryOne } from '@/lib/db'
import {
  generateReferralCode,
  createAffiliateSessionCookie,
  setAffiliateCookieHeader,
} from '@/lib/affiliate-auth'

export async function POST(req: NextRequest) {
  const { idToken } = await req.json()
  if (!idToken) return NextResponse.json({ error: 'Missing idToken' }, { status: 400 })

  let decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>
  try {
    decoded = await adminAuth.verifyIdToken(idToken)
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  if (!decoded.email_verified) {
    return NextResponse.json({ error: 'Email not verified' }, { status: 403 })
  }

  // Find or create affiliate
  let affiliate = await queryOne<{ id: string }>(
    'SELECT id FROM affiliates WHERE firebase_uid = $1',
    [decoded.uid]
  )

  if (!affiliate) {
    // Check if email already registered under a different UID (rare edge case)
    const byEmail = await queryOne<{ id: string }>(
      'SELECT id FROM affiliates WHERE email = $1',
      [(decoded.email ?? '').toLowerCase()]
    )
    if (byEmail) {
      return NextResponse.json(
        { error: 'An affiliate account already exists for this email. Try signing in with your original method.' },
        { status: 409 }
      )
    }

    // Generate unique referral code
    let referralCode = generateReferralCode()
    while (await queryOne('SELECT id FROM affiliates WHERE referral_code = $1', [referralCode])) {
      referralCode = generateReferralCode()
    }

    const name = decoded.name ?? decoded.email?.split('@')[0] ?? 'Affiliate'
    affiliate = await queryOne<{ id: string }>(
      `INSERT INTO affiliates (firebase_uid, email, name, referral_code)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [decoded.uid, (decoded.email ?? '').toLowerCase(), name, referralCode]
    )
  }

  if (!affiliate) {
    return NextResponse.json({ error: 'Could not create affiliate account' }, { status: 500 })
  }

  const sessionCookie = await createAffiliateSessionCookie(idToken)
  const res = NextResponse.json({ ok: true })
  const c = setAffiliateCookieHeader(sessionCookie)
  res.cookies.set(c.name, c.value, {
    httpOnly: c.httpOnly,
    secure: c.secure,
    sameSite: c.sameSite,
    path: c.path,
    maxAge: c.maxAge,
  })
  return res
}

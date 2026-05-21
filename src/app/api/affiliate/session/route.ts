import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { queryOne } from '@/lib/db'
import { createAffiliateSessionCookie, setAffiliateCookieHeader, clearAffiliateCookieHeader } from '@/lib/affiliate-auth'

// POST — exchange Firebase ID token for a session cookie (login)
export async function POST(req: NextRequest) {
  const { idToken } = await req.json()
  if (!idToken) return NextResponse.json({ error: 'Missing idToken' }, { status: 400 })

  let decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>
  try {
    decoded = await adminAuth.verifyIdToken(idToken)
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
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
    secure: c.secure,
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

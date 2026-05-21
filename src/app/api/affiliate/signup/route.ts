import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { query, queryOne } from '@/lib/db'
import {
  generateReferralCode,
  createAffiliateSessionCookie,
  setAffiliateCookieHeader,
} from '@/lib/affiliate-auth'
import { z } from 'zod'

const Schema = z.object({
  idToken: z.string().min(1),
  name:    z.string().min(2).max(100),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 422 })

  const { idToken, name } = parsed.data

  let decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>
  try {
    decoded = await adminAuth.verifyIdToken(idToken)
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const existing = await queryOne(
    'SELECT id FROM affiliates WHERE firebase_uid = $1 OR email = $2',
    [decoded.uid, (decoded.email ?? '').toLowerCase()]
  )
  if (existing) {
    return NextResponse.json({ error: 'An affiliate account already exists for this email' }, { status: 409 })
  }

  // Generate unique referral code
  let referralCode = generateReferralCode()
  while (await queryOne('SELECT id FROM affiliates WHERE referral_code = $1', [referralCode])) {
    referralCode = generateReferralCode()
  }

  await query(
    `INSERT INTO affiliates (firebase_uid, email, name, referral_code)
     VALUES ($1, $2, $3, $4)`,
    [decoded.uid, (decoded.email ?? '').toLowerCase(), name, referralCode]
  )

  const sessionCookie = await createAffiliateSessionCookie(idToken)
  const res = NextResponse.json({ ok: true }, { status: 201 })
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

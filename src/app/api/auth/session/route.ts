import { NextRequest, NextResponse } from 'next/server'
import { createSessionCookie } from '@/lib/auth'
import { adminAuth } from '@/lib/firebase-admin'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json()
    if (!idToken) return NextResponse.json({ error: 'No token' }, { status: 400 })

    // Verify the ID token is valid
    await adminAuth.verifyIdToken(idToken)

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

// Login is handled by /api/affiliate/session (POST with Firebase idToken).
// This route is kept as a named redirect for backwards compatibility.
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Use /api/affiliate/session instead' },
    { status: 410 }
  )
}

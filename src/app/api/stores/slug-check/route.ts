import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'

const RESERVED_SLUGS = new Set([
  'api', 'www', 'store', 'admin', 'dashboard', 'auth', 'onboarding',
  'login', 'logout', 'signup', 'register', 'checkout', 'account',
  'settings', 'profile', 'help', 'support', 'about', 'terms', 'privacy',
  'static', 'public', 'assets', 'images', 'media', 'uploads',
])

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'No slug' }, { status: 400 })

  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ available: false })
  }

  const row = await queryOne('SELECT id FROM stores WHERE slug = $1', [slug])
  return NextResponse.json({ available: !row })
}

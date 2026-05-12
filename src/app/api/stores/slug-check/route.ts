import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'No slug' }, { status: 400 })

  const row = await queryOne('SELECT id FROM stores WHERE slug = $1', [slug])
  return NextResponse.json({ available: !row })
}

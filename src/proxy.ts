import { NextRequest, NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const hostname = req.headers.get('host') ?? ''
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? ''

  // ── Subdomain routing ──────────────────────────────────────────────────────
  // If the request comes in on {slug}.awarizonmall.com, rewrite it internally
  // to /store/{slug}/... so the existing storefront layout (and VisitTracker)
  // handles it transparently.
  if (
    rootDomain &&
    hostname !== rootDomain &&
    hostname !== `www.${rootDomain}` &&
    hostname.endsWith(`.${rootDomain}`)
  ) {
    const slug = hostname.slice(0, hostname.length - rootDomain.length - 1)
    if (slug) {
      const url = req.nextUrl.clone()
      url.pathname = `/store/${slug}${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(url)
    }
  }

  // ── Admin route protection ─────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    const session = req.cookies.get('session')?.value
    if (!session) {
      const url = new URL('/auth/login', req.url)
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  // Run on all routes except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

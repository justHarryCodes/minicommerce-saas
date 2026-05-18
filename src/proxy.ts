import { NextRequest, NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Normalise — always bare domain, never www-prefixed
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'awarizon.shop')
    .toLowerCase()
    .replace(/^www\./, '')

  // ── Subdomain detection ──────────────────────────────────────────────────
  // x-forwarded-host preserves the original subdomain on Vercel wildcard
  // domains. May contain multiple comma-separated values from intermediate
  // proxies — take only the first entry.
  const rawHost =
    req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? ''

  const hostname = rawHost.split(',')[0].trim().split(':')[0].toLowerCase()

  const isSubdomain =
    !!rootDomain &&
    hostname.endsWith(`.${rootDomain}`) &&
    !hostname.startsWith('www.') &&
    !hostname.startsWith('localhost')

  if (isSubdomain) {
    const slug = hostname.slice(0, hostname.length - rootDomain.length - 1)

    if (slug) {
      const reqHeaders = new Headers(req.headers)
      reqHeaders.set('x-store-slug', slug)
      reqHeaders.set('x-is-subdomain', '1')

      // API routes — never rewrite, just forward headers
      if (pathname.startsWith('/api/')) {
        return NextResponse.next({ request: { headers: reqHeaders } })
      }

      // Guard: already has the store prefix — slash boundary prevents
      // "foo" matching "/store/foobar/…"
      if (
        pathname.startsWith(`/store/${slug}/`) ||
        pathname === `/store/${slug}`
      ) {
        return NextResponse.next({ request: { headers: reqHeaders } })
      }

      // Rewrite to www.<rootDomain> so Vercel treats it as a true internal
      // rewrite instead of triggering an apex→www external redirect.
      const url = req.nextUrl.clone()
      if (process.env.NODE_ENV === 'production') {
        url.hostname = `www.${rootDomain}`
      }
      url.pathname = `/store/${slug}${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(url, { request: { headers: reqHeaders } })
    }
  }

  // ── Admin route protection ───────────────────────────────────────────────
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
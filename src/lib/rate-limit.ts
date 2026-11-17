import { safeRedis } from '@/lib/redis'
import { NextRequest, NextResponse } from 'next/server'

/**
 * The visitor's IP, from headers the visitor cannot forge.
 *
 * Traffic reaches the server through Cloudflare, which sets CF-Connecting-IP
 * to the real client address (overwriting anything the client sent). The
 * FIRST X-Forwarded-For entry is whatever the client wrote, so trusting it let
 * anyone dodge every rate limit by sending a new fake IP each request. As a
 * fallback, use the address our own proxy saw (X-Real-IP) or the last
 * X-Forwarded-For entry, which is the one added nearest to the server.
 */
export function getClientIp(req: NextRequest | Request): string {
  const h = req.headers
  const cf = h.get('cf-connecting-ip')?.trim()
  if (cf) return cf
  const real = h.get('x-real-ip')?.trim()
  if (real) return real
  const chain = h.get('x-forwarded-for')?.split(',').map((x) => x.trim()).filter(Boolean)
  return chain?.length ? chain[chain.length - 1] : '0.0.0.0'
}

/**
 * Fixed-window rate limiter backed by Redis.
 * Returns true when the request is within limit, false when exceeded.
 * Fails open (returns true) if Redis is unavailable so legitimate traffic
 * is never blocked by infrastructure issues.
 *
 * @param key    Unique key, e.g. `rl:login:1.2.3.4`
 * @param max    Max requests per window
 * @param window Window size in seconds
 */
export async function rateLimit(
  key: string,
  max: number,
  window: number
): Promise<boolean> {
  // Fails open (and fast) — never block or slow traffic on a Redis outage
  const current = await safeRedis(async (r) => {
    const n = await r.incr(key)
    if (n === 1) await r.expire(key, window)
    return n
  }, 0)
  return current <= max
}

/**
 * Convenience wrapper: returns a 429 response when rate limit is exceeded,
 * or null when the request is within limit.
 */
export async function checkRateLimit(
  req: NextRequest,
  opts: { key: string; max: number; window: number; message?: string }
): Promise<NextResponse | null> {
  const ip = getClientIp(req)
  const allowed = await rateLimit(`${opts.key}:${ip}`, opts.max, opts.window)
  if (!allowed) {
    return NextResponse.json(
      { error: opts.message ?? 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(opts.window) },
      }
    )
  }
  return null
}

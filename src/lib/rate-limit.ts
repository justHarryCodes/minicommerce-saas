import { redis } from '@/lib/redis'
import { NextRequest, NextResponse } from 'next/server'

/** Extract the best-available client IP from a Next.js request. */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0'
  )
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
  try {
    const current = await redis.incr(key)
    if (current === 1) await redis.expire(key, window)
    return current <= max
  } catch {
    return true // fail open — never block on Redis outage
  }
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

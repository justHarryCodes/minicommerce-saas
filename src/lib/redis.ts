// ─── Redis client (ioredis) ───────────────────────────────────────
import Redis from 'ioredis'

declare global {
  var _redis: Redis | undefined
}

function createRedis(): Redis {
  const client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    // Fail fast: a cache must never be slower than the database it fronts
    connectTimeout: 2_000,
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 500, 10_000),
  })
  let lastLog = 0
  client.on('error', (err) => {
    // One line a minute while Redis is down, not one per command
    if (Date.now() - lastLog > 60_000) {
      lastLog = Date.now()
      console.error('[Redis]', (err as Error).message ?? err)
    }
  })
  return client
}

// Always reuse a cached client via `global` — see the matching comment in
// lib/db.ts for why this can't be dev-only on serverless hosting (Vercel):
// a fresh Redis client per module evaluation is harmless on a traditional
// long-running server but piles up unclosed connections across cold
// invocations there.
export const redis: Redis = (global._redis ??= createRedis())

// ─── Fail-fast wrapper ────────────────────────────────────────────
// Every Redis call goes through here. Each operation gets OP_TIMEOUT_MS;
// after FAILS_TO_TRIP failures in a row Redis is skipped entirely for
// BREAKER_MS, so an outage costs a quarter-second once instead of hanging
// every page (seen: 168 s to first byte with Redis unreachable).
const OP_TIMEOUT_MS = 250
const FAILS_TO_TRIP = 3
const BREAKER_MS = 30_000
let consecutiveFails = 0
let skipUntil = 0

export async function safeRedis<T>(op: (r: Redis) => Promise<T>, fallback: T): Promise<T> {
  if (Date.now() < skipUntil) return fallback
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const result = await Promise.race([
      op(redis),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('redis timeout')), OP_TIMEOUT_MS)
      }),
    ])
    consecutiveFails = 0
    return result
  } catch {
    if (++consecutiveFails >= FAILS_TO_TRIP) {
      skipUntil = Date.now() + BREAKER_MS
      consecutiveFails = 0
    }
    return fallback
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** For tests: forget breaker state. */
export function resetRedisBreaker(): void {
  consecutiveFails = 0
  skipUntil = 0
}

// ─── Cache helpers ────────────────────────────────────────────────
const DEFAULT_TTL = 300 // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
  const val = await safeRedis((r) => r.get(key), null)
  if (!val) return null
  try {
    return JSON.parse(val) as T
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttl = DEFAULT_TTL): Promise<void> {
  await safeRedis((r) => r.set(key, JSON.stringify(value), 'EX', ttl), null)
}

export async function cacheDel(key: string): Promise<void> {
  l1Delete(key)
  await safeRedis((r) => r.del(key), 0)
}

/** SCAN-based (KEYS blocks Redis while it walks the whole keyspace). */
export async function cacheDelPattern(pattern: string): Promise<void> {
  await safeRedis(async (r) => {
    let cursor = '0'
    do {
      const [next, keys] = await r.scan(cursor, 'MATCH', pattern, 'COUNT', 200)
      cursor = next
      if (keys.length) await r.del(...keys)
    } while (cursor !== '0')
  }, undefined)
}

// ─── Cache key builders ───────────────────────────────────────────
export const CacheKey = {
  store:      (slug: string)         => `store:${slug}`,
  products:   (storeId: string)      => `products:${storeId}`,
  product:    (storeId: string, slug: string) => `product:${storeId}:${slug}`,
  categories: (storeId: string)      => `categories:${storeId}`,
  storeInvalidate: (storeId: string, slug: string) => [
    `store:${slug}`,
    `products:${storeId}`,
    `categories:${storeId}`,
  ],
}

// ─── Aliases used by storefront layout/pages ─────────────────────
export const cacheKey = {
  storeMeta:       (slug: string)    => `store:${slug}`,
  storeProducts:   (storeId: string) => `products:${storeId}`,
  storeCategories: (storeId: string) => `categories:${storeId}`,
  productDetail:   (storeId: string, slug: string) => `product:${storeId}:${slug}`,
  publicPlans:     () => 'plans:public',
}

export const TTL = {
  STORE_META:      300,   // 5 min
  PRODUCT_LIST:    120,   // 2 min
  CATEGORY_LIST:   600,   // 10 min
  PRODUCT_DETAIL:  300,   // 5 min
  REEL_FEED:       120,   // 2 min
  REEL_TRENDING:   300,   // 5 min
}

// Reel-specific cache/rate-limit keys
export const reelKey = {
  storeFeed:   (storeId: string)               => `reels:feed:${storeId}`,
  trending:    ()                               => `reels:trending`,
  hourlyRate:  (storeId: string)               => `reels:rate:${storeId}`,
  monthlyUsed: (storeId: string, y: number, m: number) => `reels:monthly:${storeId}:${y}:${m}`,
}

// ─── In-process layer for getOrSet ───────────────────────────────
// A page and its layout/metadata often ask for the same key (the store row)
// in one request. Concurrent callers share one in-flight lookup, and a hit
// is kept in memory for L1_MS so hot keys don't cost a Redis round trip
// every time. cacheDel() clears the local copy straight away; other server
// processes see changes within L1_MS.
const L1_MS = 10_000
const L1_MAX = 1000
const l1 = new Map<string, { value: unknown; expires: number }>()
const inflight = new Map<string, Promise<unknown>>()

function l1Get<T>(key: string): T | undefined {
  const hit = l1.get(key)
  if (!hit) return undefined
  if (hit.expires < Date.now()) {
    l1.delete(key)
    return undefined
  }
  return hit.value as T
}

function l1Set(key: string, value: unknown, ttlSeconds: number) {
  if (l1.size >= L1_MAX) {
    const first = l1.keys().next().value
    if (first !== undefined) l1.delete(first)
  }
  l1.set(key, { value, expires: Date.now() + Math.min(L1_MS, ttlSeconds * 1000) })
}

export function l1Delete(key: string): void {
  l1.delete(key)
}

export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T | null>,
  ttl = DEFAULT_TTL
): Promise<T | null> {
  const local = l1Get<T>(key)
  if (local !== undefined) return local
  const pending = inflight.get(key)
  if (pending) return pending as Promise<T | null>

  const run = (async () => {
    const cached = await cacheGet<T>(key)
    if (cached !== null) {
      l1Set(key, cached, ttl)
      return cached
    }
    const value = await fetcher()
    if (value !== null) {
      l1Set(key, value, ttl)
      await cacheSet(key, value, ttl)
    }
    return value
  })()
  inflight.set(key, run)
  try {
    return await run
  } finally {
    inflight.delete(key)
  }
}

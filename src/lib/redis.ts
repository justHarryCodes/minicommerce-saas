// ─── Redis client (ioredis) ───────────────────────────────────────
import Redis from 'ioredis'

declare global {
  var _redis: Redis | undefined
}

function createRedis(): Redis {
  const client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
  })
  client.on('error', (err) => console.error('[Redis]', err))
  return client
}

export const redis: Redis =
  process.env.NODE_ENV === 'development'
    ? (global._redis ??= createRedis())
    : createRedis()

// ─── Cache helpers ────────────────────────────────────────────────
const DEFAULT_TTL = 300 // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get(key)
    return val ? (JSON.parse(val) as T) : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttl = DEFAULT_TTL): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl)
  } catch (err) {
    console.error('[Redis] cacheSet error', err)
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch {}
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length) await redis.del(...keys)
  } catch {}
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
}

export const TTL = {
  STORE_META:     300,   // 5 min
  PRODUCT_LIST:   120,   // 2 min
  CATEGORY_LIST:  600,   // 10 min
  PRODUCT_DETAIL: 300,   // 5 min
}

export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T | null>,
  ttl = DEFAULT_TTL
): Promise<T | null> {
  const cached = await cacheGet<T>(key)
  if (cached !== null) return cached
  const value = await fetcher()
  if (value !== null) await cacheSet(key, value, ttl)
  return value
}

// Per-store cache for storefront reads (product lists, featured, category
// tiles, product pages…). Every cached entry is keyed by the store's cache
// *version*; any write that changes what shoppers see bumps the version, so
// the next request reads fresh data — no key scanning, no stale lists.
//
// Two levels: a small in-process map (no network at all for hot stores)
// in front of Redis (shared between server processes). A short TTL is the
// safety net for any write path that forgets to bump.
import { cacheDel, cacheGet, cacheKey, cacheSet, safeRedis } from './redis'
import { queryOne } from './db'

const TTL_SECONDS = 120
const MEMORY_MAX = 500
const VERSION_MEMO_MS = 1_000

type Entry = { value: unknown; expires: number }
const memory = new Map<string, Entry>()
const versions = new Map<string, { v: string; at: number }>()

const versionKey = (storeId: string) => `sv:${storeId}`

/** Current cache version for a store ("0" before its first change). */
async function storeVersion(storeId: string): Promise<string> {
  const memo = versions.get(storeId)
  if (memo && Date.now() - memo.at < VERSION_MEMO_MS) return memo.v
  // Redis down: keep the in-process version (memory entries still expire)
  const v = (await safeRedis((r) => r.get(versionKey(storeId)), memo?.v ?? null)) ?? '0'
  versions.set(storeId, { v, at: Date.now() })
  return v
}

function remember(key: string, value: unknown, ttlMs: number) {
  if (memory.size >= MEMORY_MAX) {
    // Drop the oldest insertion (Map keeps insertion order)
    const first = memory.keys().next().value
    if (first !== undefined) memory.delete(first)
  }
  memory.set(key, { value, expires: Date.now() + ttlMs })
}

/**
 * Cached read for one store. `key` names the query (e.g. "home",
 * "products:shoes"); the result must be JSON-serialisable.
 */
export async function storeCached<T>(storeId: string, key: string, fetcher: () => Promise<T>, ttlSeconds = TTL_SECONDS): Promise<T> {
  const full = `sc:${storeId}:${await storeVersion(storeId)}:${key}`
  const hit = memory.get(full)
  if (hit && hit.expires > Date.now()) return hit.value as T

  const shared = await cacheGet<T>(full)
  if (shared !== null) {
    remember(full, shared, Math.min(ttlSeconds * 1000, 30_000))
    return shared
  }

  const value = await fetcher()
  remember(full, value, Math.min(ttlSeconds * 1000, 30_000))
  void cacheSet(full, value, ttlSeconds)
  return value
}

/**
 * Call after any write that changes what shoppers see for this store:
 * products, stock, categories, reviews, store settings, theme. Also drops
 * the cached store row (looked up by slug in the storefront layout).
 */
export async function invalidateStore(storeId: string, slug?: string | null): Promise<void> {
  versions.delete(storeId)
  for (const k of memory.keys()) if (k.startsWith(`sc:${storeId}:`)) memory.delete(k)
  // Redis down: memory was cleared above; the TTL bounds anything shared
  const v = await safeRedis((r) => r.incr(versionKey(storeId)), null)
  if (v !== null) versions.set(storeId, { v: String(v), at: Date.now() })
  let s = slug
  if (s === undefined) {
    const row = await queryOne<{ slug: string }>('SELECT slug FROM stores WHERE id = $1', [storeId]).catch(() => null)
    s = row?.slug ?? null
  }
  if (s) await cacheDel(cacheKey.storeMeta(s))
}

/** Fire-and-forget form for hot paths (checkout) — never delays the response. */
export function invalidateStoreSoon(storeId: string, slug?: string | null): void {
  void invalidateStore(storeId, slug).catch(() => {})
}

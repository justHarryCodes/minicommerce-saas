// What a secondary storefront page (store pages, blog) needs to render the
// same footer as the home page: the store, its base path, theme, top
// categories and the published-page links.
import { headers } from 'next/headers'
import { query, queryOne } from './db'
import { getOrSet, cacheKey, TTL } from './redis'
import { getRequestTheme } from './themes/server'
import { footerPages, pageLinksFor } from './store-pages'
import type { Category, Store } from '@/types'

/** The store row for a slug — shared Redis cache (also used by the layout). */
export async function getCachedStore(slug: string): Promise<Store | null> {
  return getOrSet<Store>(
    cacheKey.storeMeta(slug),
    () => queryOne<Store>('SELECT * FROM stores WHERE slug = $1 AND is_active = true', [slug]),
    TTL.STORE_META
  )
}

/** pg DATE (local-midnight Date) or string → "YYYY-MM-DD", safe to cache as JSON. */
export function dateOnly(v: unknown): string | null {
  if (!v) return null
  if (v instanceof Date) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
  }
  return String(v).slice(0, 10)
}

export async function loadStoreChrome(paramSlug: string) {
  const h = await headers()
  const slug = h.get('x-store-slug') ?? paramSlug
  const storeBase = h.get('x-is-subdomain') === '1' ? '' : `/store/${slug}`

  const store = await getCachedStore(slug)
  if (!store || store.is_active === false) return null

  const [categories, theme, pages] = await Promise.all([
    getOrSet<Category[]>(
      cacheKey.storeCategories(store.id),
      () => query<Category>('SELECT * FROM categories WHERE store_id = $1 ORDER BY sort_order ASC, name ASC', [store.id]) as Promise<Category[]>,
      TTL.CATEGORY_LIST
    ),
    getRequestTheme(store),
    footerPages(store.id),
  ])

  return {
    store,
    slug,
    storeBase,
    theme,
    topCategories: (categories ?? []).filter((c) => !c.parent_id),
    footerLinks: pageLinksFor(pages, storeBase),
  }
}

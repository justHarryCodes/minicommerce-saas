// What a secondary storefront page (store pages, blog) needs to render the
// same footer as the home page: the store, its base path, theme, top
// categories and the published-page links.
import { headers } from 'next/headers'
import { query, queryOne } from './db'
import { getOrSet, cacheKey, TTL } from './redis'
import { getRequestTheme } from './themes/server'
import { footerPages, pageLinksFor } from './store-pages'
import type { Category, Store } from '@/types'

export async function loadStoreChrome(paramSlug: string) {
  const h = await headers()
  const slug = h.get('x-store-slug') ?? paramSlug
  const storeBase = h.get('x-is-subdomain') === '1' ? '' : `/store/${slug}`

  const store = await getOrSet<Store>(
    cacheKey.storeMeta(slug),
    () => queryOne<Store>('SELECT * FROM stores WHERE slug = $1 AND is_active = true', [slug]),
    TTL.STORE_META
  )
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

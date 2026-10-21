// Store pages (About, FAQ, policies…) and blog posts. Published pages are
// cached per store for the footer; every write clears that cache.
import { query, queryOne } from './db'
import { cacheDel, getOrSet } from './redis'
import { slugify } from './utils'
import { PAGE_TEMPLATES, type PageTemplateId, type StorePage, type FooterPageLink } from './store-pages-shared'

export * from './store-pages-shared'

const footerKey = (storeId: string) => `store:pages:${storeId}`

/** Published pages for the footer, plus whether the blog has any posts. */
export async function footerPages(storeId: string): Promise<{ pages: FooterPageLink[]; hasBlog: boolean }> {
  const v = await getOrSet(
    footerKey(storeId),
    async () => {
      const rows = await query<{ kind: 'page' | 'post'; slug: string; title: string }>(
        `SELECT kind, slug, title FROM store_pages
         WHERE store_id = $1 AND is_published = true AND (kind = 'post' OR show_in_footer = true)
         ORDER BY kind, sort_order, title`,
        [storeId]
      )
      return {
        pages: rows.filter((r) => r.kind === 'page').map((r) => ({ slug: r.slug, title: r.title })),
        hasBlog: rows.some((r) => r.kind === 'post'),
      }
    },
    300
  )
  return v ?? { pages: [], hasBlog: false }
}

export async function clearPagesCache(storeId: string): Promise<void> {
  await cacheDel(footerKey(storeId))
}

export async function publishedPage(storeId: string, kind: 'page' | 'post', slug: string): Promise<StorePage | null> {
  return queryOne<StorePage>(
    'SELECT * FROM store_pages WHERE store_id = $1 AND kind = $2 AND slug = $3 AND is_published = true',
    [storeId, kind, slug]
  )
}

export async function publishedPosts(storeId: string, limit = 50): Promise<StorePage[]> {
  return query<StorePage>(
    `SELECT id, kind, slug, title, excerpt, cover_url, published_at, body
     FROM store_pages WHERE store_id = $1 AND kind = 'post' AND is_published = true
     ORDER BY published_at DESC NULLS LAST LIMIT $2`,
    [storeId, limit]
  )
}

/** A free slug for this store & kind: "about", "about-2", … */
export async function uniqueSlug(storeId: string, kind: 'page' | 'post', wanted: string, exceptId?: string): Promise<string> {
  const base = slugify(wanted).slice(0, 60) || (kind === 'post' ? 'post' : 'page')
  const taken = new Set(
    (
      await query<{ slug: string }>(
        `SELECT slug FROM store_pages WHERE store_id = $1 AND kind = $2 AND slug LIKE $3 AND ($4::uuid IS NULL OR id <> $4)`,
        [storeId, kind, `${base}%`, exceptId ?? null]
      )
    ).map((r) => r.slug)
  )
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
}

export function templateBody(id: PageTemplateId, storeName: string): { title: string; slug: string; body: string } {
  const t = PAGE_TEMPLATES[id]
  return { title: t.title, slug: t.slug, body: t.body.split('{store}').join(storeName) }
}

/** Footer link list from footerPages(): pages first, then the blog. */
export function pageLinksFor(f: { pages: FooterPageLink[]; hasBlog: boolean }, storeBase: string): { href: string; label: string }[] {
  return [
    ...f.pages.map((p) => ({ href: `${storeBase}/pages/${p.slug}`, label: p.title })),
    ...(f.hasBlog ? [{ href: `${storeBase}/blog`, label: 'Blog' }] : []),
  ]
}

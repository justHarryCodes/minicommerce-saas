// Product catalog feeds for Google Merchant Center (Shopping / free
// listings) and Meta Commerce Manager (Facebook & Instagram Shops). Both
// read the same RSS 2.0 + g: namespace format; Meta also accepts CSV.

export interface FeedProduct {
  id: string
  slug: string
  name: string
  description: string | null
  short_description?: string | null
  price: number | string
  compare_price?: number | string | null
  stock_quantity?: number | null
  image_url?: string | null
  images?: string[] | null
  brand?: string | null
  gtin?: string | null
  google_category?: string | null
  category_name?: string | null
  sold_out_until?: string | Date | null
}

export interface FeedStore {
  name: string
  description?: string | null
  url: string // public store URL, no trailing slash
}

export interface FeedItem {
  id: string
  title: string
  description: string
  link: string
  imageLink: string | null
  additionalImages: string[]
  availability: 'in_stock' | 'out_of_stock'
  price: string
  salePrice: string | null
  brand: string
  gtin: string | null
  googleCategory: string | null
  productType: string | null
}

const money = (n: number) => `${n.toFixed(2)} NGN`

function isSoldOutToday(v: string | Date | null | undefined, today: string): boolean {
  if (!v) return false
  const d = typeof v === 'string' ? v.slice(0, 10) : `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
  return d >= today
}

/** Normalise one product. Returns null for anything a catalog would reject (no image, no price). */
export function toFeedItem(p: FeedProduct, store: FeedStore, today: string): FeedItem | null {
  const imgs = [p.image_url, ...(p.images ?? [])].filter((u): u is string => !!u && /^https:\/\//i.test(u))
  const unique = [...new Set(imgs)]
  const price = Number(p.price)
  if (!unique.length || !(price > 0)) return null
  const compare = p.compare_price != null ? Number(p.compare_price) : 0
  const onSale = compare > price
  const description = (p.description || p.short_description || p.name).replace(/\s+/g, ' ').trim().slice(0, 4900)
  const inStock = (p.stock_quantity ?? 0) > 0 && !isSoldOutToday(p.sold_out_until, today)
  return {
    id: p.id,
    title: p.name.slice(0, 150),
    description,
    link: `${store.url}/products/${encodeURIComponent(p.slug || p.id)}`,
    imageLink: unique[0],
    additionalImages: unique.slice(1, 11),
    availability: inStock ? 'in_stock' : 'out_of_stock',
    // Catalogs want the regular price in `price` and the current one in `sale_price`
    price: money(onSale ? compare : price),
    salePrice: onSale ? money(price) : null,
    brand: (p.brand || store.name).slice(0, 70),
    gtin: p.gtin && /^\d{8,14}$/.test(p.gtin) ? p.gtin : null,
    googleCategory: p.google_category || null,
    productType: p.category_name || null,
  }
}

export function xmlEscape(s: string): string {
  // Also drop control characters XML 1.0 forbids
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!)
}

export function rssFeed(store: FeedStore, items: FeedItem[]): string {
  const tag = (name: string, v: string | null | undefined) => (v ? `<${name}>${xmlEscape(v)}</${name}>` : '')
  const body = items
    .map(
      (i) => `<item>
${tag('g:id', i.id)}
${tag('g:title', i.title)}
${tag('g:description', i.description)}
${tag('g:link', i.link)}
${tag('g:image_link', i.imageLink)}
${i.additionalImages.map((u) => tag('g:additional_image_link', u)).join('\n')}
${tag('g:availability', i.availability)}
${tag('g:price', i.price)}
${tag('g:sale_price', i.salePrice)}
${tag('g:brand', i.brand)}
${tag('g:condition', 'new')}
${i.gtin ? tag('g:gtin', i.gtin) : tag('g:identifier_exists', 'no')}
${tag('g:google_product_category', i.googleCategory)}
${tag('g:product_type', i.productType)}
</item>`.replace(/\n{2,}/g, '\n')
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
${tag('title', store.name)}
${tag('link', store.url)}
${tag('description', store.description || `Products from ${store.name}`)}
${body}
</channel>
</rss>
`
}

const CSV_COLUMNS = ['id', 'title', 'description', 'availability', 'condition', 'price', 'sale_price', 'link', 'image_link', 'additional_image_link', 'brand', 'gtin', 'google_product_category', 'product_type'] as const

function csvCell(v: string): string {
  // Neutralise spreadsheet formula injection, then quote
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
  return `"${safe.replace(/"/g, '""')}"`
}

export function csvFeed(items: FeedItem[]): string {
  const rows = items.map((i) =>
    [
      i.id, i.title, i.description, i.availability.replace('_', ' '), 'new', i.price, i.salePrice ?? '', i.link,
      i.imageLink ?? '', i.additionalImages.join(','), i.brand, i.gtin ?? '', i.googleCategory ?? '', i.productType ?? '',
    ]
      .map(csvCell)
      .join(',')
  )
  return [CSV_COLUMNS.join(','), ...rows].join('\n') + '\n'
}

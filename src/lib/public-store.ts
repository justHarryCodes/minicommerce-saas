import type { Store } from '@/types'
import { keySpecs, parseProductDetails } from './product-details'

// Fields a shopper's browser may receive. Anything passed to a client
// component is embedded in the page HTML, so the full store row must never
// go there: it holds the owner's id and email, NIN, bank and billing data.
// An allowlist (not a blocklist) so new columns stay private by default.
const PUBLIC_FIELDS = [
  'id', 'name', 'slug', 'description', 'logo_url', 'phone', 'whatsapp', 'email', 'address',
  'social_links', 'business_hours', 'opening_hours', 'return_policy', 'banner_images',
  'primary_category', 'delivery_time_frame', 'custom_domain', 'prep_time_minutes',
  'allow_preorders', 'is_active',
] as const

export function toPublicStore(store: Store): Store {
  const src = store as unknown as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of PUBLIC_FIELDS) if (src[k] !== undefined) out[k] = src[k]
  return out as unknown as Store
}

/**
 * What a product card needs. Product rows are handed to client components,
 * so the full row (long descriptions, every image, size-guide JSON, …) used
 * to be embedded in the page twice — HTML and hydration data — for every
 * product on the page.
 */
export function toCardProduct<P extends Record<string, unknown>>(p: P): P {
  const images = Array.isArray(p.images) ? (p.images as string[]).slice(0, 2) : []
  const description = typeof p.description === 'string' ? p.description.slice(0, 300) : p.description
  const pick: Record<string, unknown> = {
    id: p.id, slug: p.slug, name: p.name, price: p.price, compare_price: p.compare_price,
    image_url: p.image_url, images, stock_quantity: p.stock_quantity, sold_out_today: p.sold_out_today,
    short_description: p.short_description, description, is_bookable: p.is_bookable, has_sizes: p.has_sizes,
    category_id: p.category_id, created_at: p.created_at, duration_minutes: p.duration_minutes,
    // Three headline specs for catalog-style category pages
    specs: p.details ? keySpecs(parseProductDetails(p.details), 3) : undefined,
  }
  for (const k of Object.keys(pick)) if (pick[k] === undefined) delete pick[k]
  return pick as P
}

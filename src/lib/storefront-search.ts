import { query } from '@/lib/db'
import type { Product } from '@/types'

/** Escape LIKE wildcards so "50%" or "a_b" match literally. */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`
}

/**
 * In-stock products in one store matching a query: name first, then
 * category, then description. Scoped to the store id, so results can
 * never come from another shop.
 */
export async function searchProducts(storeId: string, q: string, limit = 24): Promise<Product[]> {
  const term = q.trim().slice(0, 80)
  if (term.length < 2) return []
  return query<Product>(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id AND c.store_id = p.store_id
     WHERE p.store_id = $1
       AND p.is_active = true
       AND (p.stock_quantity > 0 OR p.is_bookable = true)
       AND (p.name ILIKE $2 OR p.description ILIKE $2 OR p.short_description ILIKE $2 OR c.name ILIKE $2)
     ORDER BY
       CASE WHEN p.name ILIKE $2 THEN 0 WHEN c.name ILIKE $2 THEN 1 ELSE 2 END,
       p.sort_order, p.created_at DESC
     LIMIT $3`,
    [storeId, likePattern(term), Math.min(Math.max(limit, 1), 100)],
  ) as Promise<Product[]>
}

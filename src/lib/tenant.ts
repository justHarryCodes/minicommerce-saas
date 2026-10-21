// Cross-store reference checks. Every id a merchant sends that points at
// another row (a category, a product to feature or tag) must belong to the
// same store — otherwise one shop's data could surface inside another's.
import { query, queryOne } from './db'

/** Error message if the category/subcategory isn't this store's, else null. */
export async function foreignCategory(
  storeId: string,
  categoryId: unknown,
  subcategoryId: unknown
): Promise<string | null> {
  if (categoryId) {
    const ok = await queryOne('SELECT 1 FROM categories WHERE id = $1 AND store_id = $2', [String(categoryId), storeId])
    if (!ok) return 'Category not found'
  }
  if (subcategoryId) {
    const ok = await queryOne(
      `SELECT 1 FROM categories WHERE id = $1 AND store_id = $2 AND parent_id IS NOT NULL
         AND ($3::uuid IS NULL OR parent_id = $3::uuid)`,
      [String(subcategoryId), storeId, categoryId ? String(categoryId) : null]
    )
    if (!ok) return 'Subcategory not found'
  }
  return null
}

/** Keep only the product ids that belong to this store, in the order given. */
export async function ownProductIds(storeId: string, ids: string[]): Promise<string[]> {
  if (!ids.length) return []
  const rows = await query<{ id: string }>('SELECT id FROM products WHERE store_id = $1 AND id = ANY($2::uuid[])', [storeId, ids])
  const mine = new Set(rows.map((r) => r.id))
  return ids.filter((id, i) => mine.has(id) && ids.indexOf(id) === i)
}

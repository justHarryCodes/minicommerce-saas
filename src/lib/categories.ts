import { queryOne, query } from './db'

const UNCATEGORIZED_NAME = 'Uncategorized'
const UNCATEGORIZED_SLUG = 'uncategorized'

// Returns the ID of the store's "Uncategorized" category, creating it if needed.
// ON CONFLICT targets (store_id, slug) — the unique constraint from the base schema.
// sort_order 9999 keeps it at the bottom of any ordered list.
export async function ensureUncategorized(storeId: string): Promise<string> {
  // ON CONFLICT targets the partial unique index uq_categories_store_slug_null_parent
  // (store_id, slug) WHERE parent_id IS NULL — added via migration.
  await query(
    `INSERT INTO categories (store_id, parent_id, name, slug, sort_order)
     VALUES ($1, NULL, $2, $3, 9999)
     ON CONFLICT (store_id, slug) WHERE parent_id IS NULL DO NOTHING`,
    [storeId, UNCATEGORIZED_NAME, UNCATEGORIZED_SLUG]
  )

  const row = await queryOne<{ id: string }>(
    `SELECT id FROM categories WHERE store_id = $1 AND slug = $2 AND parent_id IS NULL`,
    [storeId, UNCATEGORIZED_SLUG]
  )

  if (!row) throw new Error('Failed to resolve Uncategorized category')
  return row.id
}

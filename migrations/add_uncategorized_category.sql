-- Step 1: Partial unique index so that top-level categories (parent_id IS NULL)
-- can never have duplicate slugs within the same store.
-- This also lets the application layer use ON CONFLICT safely in the future.
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_store_slug_null_parent
  ON categories (store_id, slug)
  WHERE parent_id IS NULL;

-- Step 2: Backfill a default "Uncategorized" category for every existing
-- active store that does not already have one.
INSERT INTO categories (store_id, parent_id, name, slug, sort_order)
SELECT
  s.id,
  NULL,
  'Uncategorized',
  'uncategorized',
  9999
FROM stores s
WHERE s.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.store_id = s.id
      AND c.slug = 'uncategorized'
      AND c.parent_id IS NULL
  );

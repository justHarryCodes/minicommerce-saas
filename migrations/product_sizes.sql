-- Product size/variant support (e.g. clothing S/M/L/XL, shoe sizes) with
-- per-size stock tracking.
--
-- Design: `products.stock_quantity` stays the single source of truth for
-- "is this product orderable at all" everywhere that doesn't care about
-- size-level detail (search, discover, reels, bookmarks, featured lists —
-- all the places across the app that already read product.stock_quantity).
-- When a product has sizes, stock_quantity is kept in sync as the SUM of
-- its product_sizes rows by the application layer (product write API +
-- order placement), so nothing that predates this feature needs to change.
--
-- `has_sizes` is a denormalized flag (kept in sync alongside stock_quantity)
-- so product-list queries across the app (`SELECT *` / `SELECT p.*`) get it
-- for free without every listing endpoint needing a join or subquery to know
-- whether a product requires size selection before it can be added to cart.

ALTER TABLE products ADD COLUMN IF NOT EXISTS has_sizes BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS product_sizes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, label)
);

CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON product_sizes(product_id);

-- Records which size a customer bought, alongside the existing order_items
-- row. Nullable — most stores/products never use sizes at all.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size TEXT;

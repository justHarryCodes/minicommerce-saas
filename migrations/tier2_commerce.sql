-- Tier 2: product variants, inventory history + low-stock alerts, analytics
-- (traffic sources, search terms) and custom domains. Additive only.

-- ── Product variants ────────────────────────────────────────────────────────
-- Variants extend product_sizes rather than replacing it: `label` (e.g.
-- "M / Red") stays the key the cart, order_items.size and stock decrements
-- already use. `options` holds the structured values ({"Size":"M","Colour":"Red"});
-- legacy size-only rows keep options = '{}' and are read as {"Size": label}.
ALTER TABLE products ADD COLUMN IF NOT EXISTS option_names TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE product_sizes ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE product_sizes ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2) CHECK (price IS NULL OR price >= 0);
ALTER TABLE product_sizes ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE product_sizes ADD COLUMN IF NOT EXISTS sku TEXT;

-- ── Inventory ───────────────────────────────────────────────────────────────
ALTER TABLE stores ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 3
  CHECK (low_stock_threshold >= 0);
-- Per-product override (NULL = use the store default)
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER
  CHECK (low_stock_threshold IS NULL OR low_stock_threshold >= 0);
-- Set when a cancelled order's stock has been put back (makes it idempotent)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_restored_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
  product_name  TEXT NOT NULL,
  variant_label TEXT,
  change        INTEGER NOT NULL,
  stock_after   INTEGER,
  reason        TEXT NOT NULL CHECK (reason IN ('order', 'order_cancelled', 'manual', 'created')),
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_store ON inventory_movements(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id, created_at DESC);

-- ── Analytics ───────────────────────────────────────────────────────────────
-- Where the day's first visit came from: whatsapp, instagram, facebook,
-- tiktok, twitter, google, duka, other, direct
ALTER TABLE store_visits ADD COLUMN IF NOT EXISTS source TEXT;

CREATE TABLE IF NOT EXISTS search_queries (
  id         BIGSERIAL PRIMARY KEY,
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  query      TEXT NOT NULL,
  results    INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_search_queries_store ON search_queries(store_id, created_at DESC);

-- Orders are now aggregated per store over date ranges (analytics, customers)
CREATE INDEX IF NOT EXISTS idx_orders_store_created ON orders(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_store_phone ON orders(store_id, customer_phone);

-- ── Custom domains ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_domains (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  hostname        TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'failed')),
  cf_hostname_id  TEXT,
  ssl_status      TEXT,
  verification    JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_error      TEXT,
  last_checked_at TIMESTAMPTZ,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Denormalised copy of the active hostname for cheap link building
ALTER TABLE stores ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

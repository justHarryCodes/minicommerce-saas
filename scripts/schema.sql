-- ═══════════════════════════════════════════
-- Storefront SaaS - PostgreSQL Schema
-- ═══════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ───────────────────────────────────────────────────────
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Stores ──────────────────────────────────────────────────────
CREATE TABLE stores (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                VARCHAR(255) NOT NULL,
  slug                VARCHAR(100) UNIQUE NOT NULL,
  description         TEXT,
  logo_url            TEXT,
  phone               VARCHAR(30),
  whatsapp            VARCHAR(30),
  primary_category    VARCHAR(100),
  -- Theme
  theme_mode          VARCHAR(20) DEFAULT 'both'   CHECK (theme_mode IN ('light','dark','both')),
  accent_color        VARCHAR(7)  DEFAULT '#eab308',
  -- Payment
  payment_methods     TEXT[]      DEFAULT ARRAY['paystack','transfer'],
  bank_name           VARCHAR(100),
  account_number      VARCHAR(50),
  account_name        VARCHAR(150),
  paystack_public_key TEXT,
  -- Meta
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Categories ──────────────────────────────────────────────────
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(255) NOT NULL,
  image_url  TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

-- ─── Subcategories ───────────────────────────────────────────────
CREATE TABLE subcategories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL,
  image_url   TEXT,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

-- ─── Products ─────────────────────────────────────────────────────
CREATE TABLE products (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id      UUID REFERENCES categories(id) ON DELETE SET NULL,
  subcategory_id   UUID REFERENCES subcategories(id) ON DELETE SET NULL,
  name             VARCHAR(255) NOT NULL,
  slug             VARCHAR(255) NOT NULL,
  description      TEXT,
  short_description VARCHAR(500),
  price            NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  compare_price    NUMERIC(12,2),
  stock_quantity   INT DEFAULT 0 CHECK (stock_quantity >= 0),
  is_in_stock      BOOLEAN DEFAULT TRUE,
  images           TEXT[]  DEFAULT ARRAY[]::TEXT[],
  is_active        BOOLEAN DEFAULT TRUE,
  is_featured      BOOLEAN DEFAULT FALSE,
  sort_order       INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

-- ─── Orders ───────────────────────────────────────────────────────
CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id          UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_number      VARCHAR(20) UNIQUE NOT NULL,
  -- Customer info
  customer_name     VARCHAR(255) NOT NULL,
  customer_email    VARCHAR(255),
  customer_phone    VARCHAR(30) NOT NULL,
  delivery_address  TEXT NOT NULL,
  delivery_city     VARCHAR(100),
  delivery_state    VARCHAR(100),
  delivery_note     TEXT,
  -- Financials
  subtotal          NUMERIC(12,2) NOT NULL,
  delivery_fee      NUMERIC(12,2) DEFAULT 0,
  total_amount      NUMERIC(12,2) NOT NULL,
  -- Payment
  payment_method    VARCHAR(30) NOT NULL CHECK (payment_method IN ('paystack','transfer')),
  payment_status    VARCHAR(30) DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_reference VARCHAR(255),
  -- Order status
  order_status      VARCHAR(30) DEFAULT 'pending' CHECK (order_status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
  -- Meta
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Order Items ──────────────────────────────────────────────────
CREATE TABLE order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  product_image TEXT,
  price        NUMERIC(12,2) NOT NULL,
  quantity     INT NOT NULL CHECK (quantity > 0),
  subtotal     NUMERIC(12,2) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────
CREATE INDEX idx_stores_user_id   ON stores(user_id);
CREATE INDEX idx_stores_slug      ON stores(slug);
CREATE INDEX idx_categories_store ON categories(store_id);
CREATE INDEX idx_subcats_cat      ON subcategories(category_id);
CREATE INDEX idx_products_store   ON products(store_id);
CREATE INDEX idx_products_cat     ON products(category_id);
CREATE INDEX idx_orders_store     ON orders(store_id);
CREATE INDEX idx_orders_number    ON orders(order_number);
CREATE INDEX idx_order_items_ord  ON order_items(order_id);

-- ─── Updated-at trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_upd     BEFORE UPDATE ON users       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stores_upd    BEFORE UPDATE ON stores      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_cats_upd      BEFORE UPDATE ON categories  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subcats_upd   BEFORE UPDATE ON subcategories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_upd  BEFORE UPDATE ON products    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_upd    BEFORE UPDATE ON orders      FOR EACH ROW EXECUTE FUNCTION update_updated_at();

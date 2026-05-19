-- ─────────────────────────────────────────────────────────────────
-- Shoppable Reels migration
-- Run once against your Postgres database
-- ─────────────────────────────────────────────────────────────────

-- 1. Reels table
CREATE TABLE IF NOT EXISTS reels (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id             UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title                VARCHAR(100),
  description          TEXT,
  cloudinary_public_id TEXT        NOT NULL,
  video_url            TEXT        NOT NULL,
  thumbnail_url        TEXT,
  duration_seconds     INTEGER,
  view_count           INTEGER     NOT NULL DEFAULT 0,
  share_count          INTEGER     NOT NULL DEFAULT 0,
  is_active            BOOLEAN     NOT NULL DEFAULT true,
  is_featured          BOOLEAN     NOT NULL DEFAULT false,  -- admin-curated for discovery
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reels_store_id    ON reels (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reels_featured    ON reels (is_featured, view_count DESC) WHERE is_active = true;

-- 2. Reel ↔ Product linkage
CREATE TABLE IF NOT EXISTS reel_products (
  reel_id    UUID NOT NULL REFERENCES reels(id)    ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (reel_id, product_id)
);

-- 3. View tracking (lightweight — one row per view event)
CREATE TABLE IF NOT EXISTS reel_views (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id    UUID        NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  session_id TEXT,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reel_views_reel_id ON reel_views (reel_id, viewed_at DESC);

-- 4. Per-store monthly upload limit override (NULL = use global setting)
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS reels_monthly_limit INTEGER DEFAULT NULL;

-- 5. Global default in platform_settings (key/value store — insert default if not present)
INSERT INTO platform_settings (key, value)
VALUES ('reels_monthly_limit', '20'::jsonb)
ON CONFLICT (key) DO NOTHING;

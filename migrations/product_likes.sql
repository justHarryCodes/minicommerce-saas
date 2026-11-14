-- Discover feed: anonymous product likes (one per device / visitor id).
-- The app also creates this table on first use.
CREATE TABLE IF NOT EXISTS product_likes (
  product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  visitor_id TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, visitor_id)
);

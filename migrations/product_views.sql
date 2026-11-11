-- Product views: one row per (product, anonymous visitor, day).
-- Powers "Customers also viewed" on product pages and the "Most viewed" /
-- "Viewed but not bought" reports in Analytics. visitor_id is the random
-- id the storefront already keeps in the browser (sf_vid) — no personal data.
CREATE TABLE IF NOT EXISTS product_views (
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  visitor_id  TEXT NOT NULL,
  viewed_on   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, visitor_id, viewed_on)
);

-- Co-views: "which products did this product's viewers also open?"
CREATE INDEX IF NOT EXISTS product_views_visitor_idx ON product_views (store_id, visitor_id, viewed_on);
-- Reports: views per product over a date range
CREATE INDEX IF NOT EXISTS product_views_store_day_idx ON product_views (store_id, viewed_on);

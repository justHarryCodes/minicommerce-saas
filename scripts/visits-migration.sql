-- Store visitor tracking
-- Run this migration to enable per-store visitor analytics

CREATE TABLE IF NOT EXISTS store_visits (
  id         BIGSERIAL PRIMARY KEY,
  store_id   UUID    NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  visitor_id TEXT    NOT NULL,                          -- stable random UUID from visitor's localStorage
  visited_at DATE    NOT NULL DEFAULT CURRENT_DATE,     -- date-only for daily de-dup
  UNIQUE (store_id, visitor_id, visited_at)             -- one row per visitor per store per day
);

CREATE INDEX IF NOT EXISTS idx_store_visits_store_id   ON store_visits (store_id);
CREATE INDEX IF NOT EXISTS idx_store_visits_visited_at ON store_visits (visited_at);

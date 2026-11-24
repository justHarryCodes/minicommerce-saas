-- Growth engine, phase 2: automatic follow-up emails (see src/lib/growth-automations.ts).

-- Which follow-ups a store has switched on, e.g.
-- {"welcomeReminder": true, "reviewRequest": true, "winBack": false, "winBackPercent": 10}
ALTER TABLE stores ADD COLUMN IF NOT EXISTS growth_automations JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Every follow-up sent, once per (store, flow, ref): never the same email twice
CREATE TABLE IF NOT EXISTS growth_messages (
  id          BIGSERIAL PRIMARY KEY,
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  flow        TEXT NOT NULL,
  ref         TEXT NOT NULL,
  email       TEXT NOT NULL,
  contact_id  UUID,
  order_id    UUID,
  coupon_code TEXT,
  status      TEXT NOT NULL DEFAULT 'sending',
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, flow, ref)
);
CREATE INDEX IF NOT EXISTS idx_growth_messages_store ON growth_messages (store_id, created_at DESC);

-- "Stop emails from this store" (one click from any follow-up)
CREATE TABLE IF NOT EXISTS growth_unsubscribes (
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (store_id, email)
);

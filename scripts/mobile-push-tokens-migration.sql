CREATE TABLE IF NOT EXISTS vendor_push_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  firebase_uid TEXT        NOT NULL,
  token        TEXT        NOT NULL,
  platform     TEXT        NOT NULL DEFAULT 'android',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (firebase_uid)
);

CREATE INDEX IF NOT EXISTS idx_vendor_push_tokens_store ON vendor_push_tokens(store_id);

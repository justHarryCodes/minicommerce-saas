-- Duka Vendor Grant & Support Fund (see src/lib/grants.ts).

-- One funding round (normally one a month). The newest round is the one
-- shown on /grant; the admin opens/closes it and sets the countdown.
CREATE TABLE IF NOT EXISTS grant_rounds (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  amount       NUMERIC(12, 2) NOT NULL DEFAULT 50000,
  min_products INTEGER NOT NULL DEFAULT 30,
  is_open      BOOLEAN NOT NULL DEFAULT false,
  closes_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One application per store per round. It only counts ("submitted") once the
-- applicant clicks the link sent to the store owner's email.
CREATE TABLE IF NOT EXISTS grant_applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id         UUID NOT NULL REFERENCES grant_rounds(id) ON DELETE CASCADE,
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  store_link       TEXT NOT NULL,
  story            TEXT,
  product_count    INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified', 'submitted', 'shortlisted', 'selected', 'rejected')),
  token_hash       TEXT,
  token_expires_at TIMESTAMPTZ,
  verified_at      TIMESTAMPTZ,
  admin_note       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (round_id, store_id)
);
CREATE INDEX IF NOT EXISTS idx_grant_applications_round ON grant_applications (round_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grant_applications_token ON grant_applications (token_hash) WHERE token_hash IS NOT NULL;

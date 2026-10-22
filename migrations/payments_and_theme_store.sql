-- One row per Paystack checkout we start. Settlement (webhook, return page
-- or the reconcile job) claims a row exactly once, so a payment can't be
-- applied twice, and nothing is fulfilled unless Paystack confirms the
-- exact amount was paid for that reference.
CREATE TABLE IF NOT EXISTS payment_attempts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference         TEXT NOT NULL UNIQUE,
  kind              TEXT NOT NULL CHECK (kind IN ('order', 'subscription', 'theme')),
  store_id          UUID REFERENCES stores(id) ON DELETE CASCADE,
  -- order id · subscription type ("plan:<id>", "monthly", "setup_fee") · theme id
  target_id         TEXT NOT NULL,
  amount            NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency          TEXT NOT NULL DEFAULT 'NGN',
  email             TEXT,
  authorization_url TEXT,
  -- success: settled and applied · duplicate: paid, but the thing was
  -- already paid for by another attempt (needs a refund) · failed: Paystack
  -- says it failed/was abandoned
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'duplicate')),
  paystack_status   TEXT,
  settled_via       TEXT CHECK (settled_via IN ('webhook', 'callback', 'reconcile')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_checked_at   TIMESTAMPTZ,
  settled_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_target ON payment_attempts(kind, target_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_pending ON payment_attempts(status, created_at) WHERE status = 'pending';

-- Premium themes bought one at a time (₦2,500 each, no Pro plan needed).
CREATE TABLE IF NOT EXISTS theme_purchases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  theme_id     TEXT NOT NULL,
  amount       NUMERIC(12, 2) NOT NULL,
  reference    TEXT NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, theme_id)
);

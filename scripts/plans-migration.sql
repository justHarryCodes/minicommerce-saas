-- ── Plans ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT         NOT NULL,
  description   TEXT,
  price_monthly INTEGER      NOT NULL DEFAULT 0,   -- NGN
  max_products  INTEGER      NOT NULL DEFAULT 100,
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO plans (name, description, price_monthly, max_products, sort_order)
VALUES ('Basic', 'Up to 100 products listed at a time', 5000, 100, 0)
ON CONFLICT DO NOTHING;

-- ── Store plan tracking ─────────────────────────────────────────────────────
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS current_plan_id           UUID         REFERENCES plans(id),
  ADD COLUMN IF NOT EXISTS plan_expires_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_confirmed    BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_confirmed_by TEXT;

-- Mark already-active stores as confirmed so existing vendors aren't blocked
UPDATE stores SET registration_confirmed = true WHERE status = 'active';

-- ── Plan reference on payment rows ─────────────────────────────────────────
ALTER TABLE subscription_payments
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id);

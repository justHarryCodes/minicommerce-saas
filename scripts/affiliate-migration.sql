-- Affiliate marketers
CREATE TABLE IF NOT EXISTS affiliates (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT          UNIQUE NOT NULL,
  password_hash    TEXT          NOT NULL,
  name             TEXT          NOT NULL,
  referral_code    TEXT          UNIQUE NOT NULL,
  earnings_total   NUMERIC(10,2) NOT NULL DEFAULT 0,
  payout_balance   NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_referrals  INT           NOT NULL DEFAULT 0,
  active_referrals INT           NOT NULL DEFAULT 0,
  is_active        BOOLEAN       NOT NULL DEFAULT true,
  bank_name        TEXT,
  account_number   TEXT,
  account_name     TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Stores signed up through an affiliate link
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id      UUID          NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  store_id          UUID          NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status            TEXT          NOT NULL DEFAULT 'pending',
  commission_amount NUMERIC(10,2),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  rewarded_at       TIMESTAMPTZ,
  UNIQUE(store_id)
);

-- Payout requests
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id   UUID          NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount         NUMERIC(10,2) NOT NULL,
  status         TEXT          NOT NULL DEFAULT 'pending',
  bank_name      TEXT,
  account_number TEXT,
  account_name   TEXT,
  admin_note     TEXT,
  requested_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  processed_at   TIMESTAMPTZ
);

ALTER TABLE stores ADD COLUMN IF NOT EXISTS referred_by_affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_id ON affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_store_id     ON affiliate_referrals(store_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id   ON affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_stores_referred_by_affiliate_id  ON stores(referred_by_affiliate_id);

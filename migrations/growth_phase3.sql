-- Growth engine, phase 3: broadcasts and shopper referrals.
-- See src/lib/growth-broadcasts.ts and src/lib/growth-referrals.ts.

-- A one-off email to a store's list ("New arrivals are in")
CREATE TABLE IF NOT EXISTS broadcasts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  product_ids UUID[] NOT NULL DEFAULT '{}',
  coupon_code TEXT,
  audience    TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'buyers', 'not_bought')),
  status      TEXT NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'cancelled')),
  recipients  INTEGER NOT NULL DEFAULT 0,
  sent        INTEGER NOT NULL DEFAULT 0,
  failed      INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_broadcasts_store ON broadcasts (store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS broadcast_recipients (
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  name         TEXT,
  contact_id   UUID,
  status       TEXT NOT NULL DEFAULT 'pending',
  error        TEXT,
  sent_at      TIMESTAMPTZ,
  PRIMARY KEY (broadcast_id, email)
);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_pending ON broadcast_recipients (broadcast_id, status);

-- Shopper referrals: {"enabled": true, "friendPercent": 10, "reward": 1000}
ALTER TABLE stores ADD COLUMN IF NOT EXISTS referral_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- A buyer with a share link. Their code is also the friend's discount code.
CREATE TABLE IF NOT EXISTS shopper_referrers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  phone_key      TEXT NOT NULL,
  name           TEXT,
  email          TEXT,
  code           TEXT NOT NULL,
  credit_card_id UUID REFERENCES gift_cards(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, phone_key),
  UNIQUE (store_id, code)
);

-- A friend's first order through a referral; rewarded once it's delivered
CREATE TABLE IF NOT EXISTS shopper_referrals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  referrer_id      UUID NOT NULL REFERENCES shopper_referrers(id) ON DELETE CASCADE,
  order_id         UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  friend_phone_key TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rewarded', 'void')),
  reward           NUMERIC(12, 2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rewarded_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_shopper_referrals_referrer ON shopper_referrals (referrer_id, status);

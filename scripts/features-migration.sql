-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  code             TEXT        NOT NULL,
  discount_type    TEXT        NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value   NUMERIC     NOT NULL,
  min_order_amount NUMERIC     NOT NULL DEFAULT 0,
  max_uses         INTEGER,
  uses_count       INTEGER     NOT NULL DEFAULT 0,
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, code)
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id     UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_name  TEXT        NOT NULL,
  customer_email TEXT,
  rating         INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body           TEXT,
  is_approved    BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_store_id   ON reviews(store_id);

-- Referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_store_id   UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  referred_store_id   UUID        REFERENCES stores(id) ON DELETE SET NULL,
  status              TEXT        NOT NULL DEFAULT 'signed_up' CHECK (status IN ('signed_up','rewarded')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Store additions
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS referral_code        TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_store_id UUID REFERENCES stores(id),
  ADD COLUMN IF NOT EXISTS referral_credits      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_policy         TEXT;

-- Generate referral codes for existing stores (8-char uppercase hex)
UPDATE stores
SET referral_code = UPPER(SUBSTRING(MD5(id::text) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Orders: coupon tracking
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_code     TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════
-- Admin System Migration
-- Run this once against your PostgreSQL database.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Extend stores table ──────────────────────────────────────
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS owner_email        TEXT,
  ADD COLUMN IF NOT EXISTS status             VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'restricted', 'pending_payment')),
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30) NOT NULL DEFAULT 'none'
    CHECK (subscription_status IN ('none', 'setup_fee_pending', 'setup_fee_paid', 'subscribed', 'expired')),
  ADD COLUMN IF NOT EXISTS setup_fee_paid_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nin_number          VARCHAR(20),
  ADD COLUMN IF NOT EXISTS nin_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nin_verified_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nin_verified_by     TEXT;   -- admin firebase_uid

CREATE INDEX IF NOT EXISTS idx_stores_status              ON stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_subscription_status ON stores(subscription_status);

-- ── 2. Admin users ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT        UNIQUE NOT NULL,
  email        TEXT        NOT NULL,
  name         TEXT,
  role         VARCHAR(20) NOT NULL DEFAULT 'admin'
    CHECK (role IN ('super_admin', 'admin')),
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Platform settings (feature flags + config values) ────────
CREATE TABLE IF NOT EXISTS platform_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      JSONB        NOT NULL,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_by TEXT                              -- admin firebase_uid who last changed it
);

-- Seed defaults (won't overwrite if already present)
INSERT INTO platform_settings (key, value) VALUES
  ('require_setup_fee',          'true'),
  ('setup_fee_amount',           '10000'),
  ('setup_fee_duration_months',  '2'),
  ('require_subscription',       'true'),
  ('monthly_fee_amount',         '5000'),
  ('require_nin_verification',   'false'),
  ('allow_new_registrations',    'true')
ON CONFLICT (key) DO NOTHING;

-- ── 4. Subscription / billing payments ─────────────────────────
CREATE TABLE IF NOT EXISTS subscription_payments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type             VARCHAR(20) NOT NULL CHECK (type IN ('setup_fee', 'monthly')),
  amount           NUMERIC(10,2) NOT NULL,
  payment_reference TEXT       UNIQUE,
  payment_status   VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed')),
  period_start     TIMESTAMPTZ,
  period_end       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_payments_store_id ON subscription_payments(store_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_reference ON subscription_payments(payment_reference);

-- ── 5. Admin audit log ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_uid    TEXT        NOT NULL,
  admin_email  TEXT,
  action       VARCHAR(100) NOT NULL,
  target_type  VARCHAR(50),
  target_id    TEXT,
  details      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin_uid  ON admin_audit_log(admin_uid);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_id  ON admin_audit_log(target_id);

-- ── 6. How to create your first admin user ──────────────────────
-- After running this migration, insert your first admin manually:
--
--   INSERT INTO admin_users (firebase_uid, email, name, role)
--   VALUES ('<your-firebase-uid>', '<your-email>', '<your-name>', 'super_admin');
--
-- You can find your Firebase UID by logging in to the app and
-- checking the "session" cookie payload, or from Firebase Console.

-- Tier 1 checkout: delivery zones & fees, pay on delivery, customer order
-- messages, abandoned-checkout recovery. Additive only — no existing data
-- is rewritten except backfilling orders.total_amount and access tokens.

-- ── Store settings ──────────────────────────────────────────────────────────
-- delivery_zones: [{ "id": "lekki", "name": "Lekki / Ajah", "fee": 2000 }, …]
ALTER TABLE stores ADD COLUMN IF NOT EXISTS delivery_zones JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS free_delivery_threshold NUMERIC(12, 2)
  CHECK (free_delivery_threshold IS NULL OR free_delivery_threshold >= 0);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS pickup_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS pickup_address TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS pod_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS pod_deposit_percent INTEGER NOT NULL DEFAULT 0
  CHECK (pod_deposit_percent BETWEEN 0 AND 90);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS customer_notifications_enabled BOOLEAN NOT NULL DEFAULT true;

-- ── Orders ──────────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method TEXT NOT NULL DEFAULT 'delivery'
  CHECK (delivery_method IN ('delivery', 'pickup'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_zone TEXT;
-- Pay on delivery: the part charged online up front (0 = pay everything on delivery)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;
-- Unguessable token for customer-facing receipt links
ALTER TABLE orders ADD COLUMN IF NOT EXISTS access_token TEXT;
UPDATE orders SET access_token = replace(gen_random_uuid()::text, '-', '') WHERE access_token IS NULL;
ALTER TABLE orders ALTER COLUMN access_token SET DEFAULT replace(gen_random_uuid()::text, '-', '');

-- total_amount is what Paystack charges; older inserts only set `total`.
UPDATE orders SET total_amount = total WHERE total_amount IS NULL;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('paystack', 'transfer', 'bank_transfer', 'pay_on_delivery'));

-- 'rejected' was already used by the dashboard ("payment not received") but
-- missing here, so that update always failed. 'deposit_paid' is new (POD).
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'pending_confirmation', 'deposit_paid', 'paid', 'failed', 'refunded', 'rejected'));

-- ── Customer message log ────────────────────────────────────────────────────
-- One row per (order, event, channel): the unique key makes sends
-- idempotent when e.g. the Paystack callback and webhook both fire.
CREATE TABLE IF NOT EXISTS order_notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event      TEXT NOT NULL,
  channel    TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  status     TEXT NOT NULL CHECK (status IN ('sending', 'sent', 'failed')),
  error      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, event, channel)
);

-- ── Abandoned checkouts ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  token            TEXT NOT NULL UNIQUE,
  customer_name    TEXT,
  customer_phone   TEXT NOT NULL,
  customer_email   TEXT,
  items            JSONB NOT NULL,
  subtotal         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'recovered', 'dismissed')),
  order_id         UUID REFERENCES orders(id) ON DELETE SET NULL,
  reminder_sent_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_store ON checkout_sessions(store_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_reminders ON checkout_sessions(status, reminder_sent_at, updated_at);

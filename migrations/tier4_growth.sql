-- Tier 4 growth: team accounts with roles, store pages & blog, gift cards
-- / store credit, loyalty rewards, sales-channel feeds and in-person (POS)
-- sales. Additive only.

-- ── Team members (login accounts, not the bookable staff_members) ──────────
-- An owner invites by email; the invite link is accepted by a signed-in
-- user whose Firebase email matches. firebase_uid stays NULL until then.
CREATE TABLE IF NOT EXISTS store_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  name         TEXT,
  role         TEXT NOT NULL CHECK (role IN ('manager', 'staff')),
  firebase_uid TEXT,
  invite_token TEXT UNIQUE,
  status       TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'removed')),
  invited_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at  TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_store_members_email
  ON store_members(store_id, lower(email)) WHERE status <> 'removed';
CREATE INDEX IF NOT EXISTS idx_store_members_uid ON store_members(firebase_uid) WHERE status = 'active';

-- ── Store pages & blog ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_pages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL DEFAULT 'page' CHECK (kind IN ('page', 'post')),
  slug         TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL DEFAULT '',
  excerpt      TEXT,
  cover_url    TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  show_in_footer BOOLEAN NOT NULL DEFAULT true,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, kind, slug)
);
CREATE INDEX IF NOT EXISTS idx_store_pages_public ON store_pages(store_id, kind, is_published, published_at DESC);

-- ── Gift cards & store credit ───────────────────────────────────────────────
-- Store credit is a gift card issued to a named customer (e.g. a refund).
CREATE TABLE IF NOT EXISTS gift_cards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  kind            TEXT NOT NULL DEFAULT 'gift_card' CHECK (kind IN ('gift_card', 'store_credit')),
  initial_amount  NUMERIC(12, 2) NOT NULL CHECK (initial_amount > 0),
  balance         NUMERIC(12, 2) NOT NULL CHECK (balance >= 0),
  recipient_name  TEXT,
  recipient_phone TEXT,
  recipient_email TEXT,
  note            TEXT,
  expires_at      DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, code)
);

-- Every balance change, so the merchant can see where credit went.
CREATE TABLE IF NOT EXISTS gift_card_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id  UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  change        NUMERIC(12, 2) NOT NULL,
  balance_after NUMERIC(12, 2) NOT NULL,
  reason        TEXT NOT NULL CHECK (reason IN ('issued', 'redeemed', 'refunded', 'adjusted')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gift_card_ledger_card ON gift_card_ledger(gift_card_id, created_at DESC);

-- ── Loyalty: every Nth paid order gets X% off ──────────────────────────────
ALTER TABLE stores ADD COLUMN IF NOT EXISTS loyalty_every_n INTEGER
  CHECK (loyalty_every_n IS NULL OR loyalty_every_n BETWEEN 2 AND 50);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS loyalty_percent INTEGER NOT NULL DEFAULT 10
  CHECK (loyalty_percent BETWEEN 1 AND 90);

-- ── Orders: credit applied, loyalty reward, sales channel ──────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_card_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_card_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_card_restored_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_discount NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'online';
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_channel_check;
ALTER TABLE orders ADD CONSTRAINT orders_channel_check CHECK (channel IN ('online', 'pos'));
-- Who rang up an in-person sale (Firebase uid of the owner or a member)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by TEXT;

-- POS takes cash and card-terminal payments; gift cards can cover a whole order.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('paystack', 'transfer', 'bank_transfer', 'pay_on_delivery', 'cash', 'card_terminal', 'gift_card'));

-- ── Sales channels: product feeds ──────────────────────────────────────────
ALTER TABLE stores ADD COLUMN IF NOT EXISTS feeds_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gtin TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS google_category TEXT;

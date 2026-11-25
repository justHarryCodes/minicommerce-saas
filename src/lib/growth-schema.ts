// Creates the growth engine's tables and columns on first use, so nothing
// breaks if code is deployed before migrations/growth_engine.sql has run
// (builds don't run migrations). Keep these in step with growth_engine.sql,
// growth_automations.sql and growth_phase3.sql: a test checks it.
import { query } from "./db";

export const GROWTH_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS store_contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  phone             TEXT NOT NULL,
  phone_key         TEXT NOT NULL,
  email             TEXT,
  name              TEXT,
  source            TEXT NOT NULL DEFAULT 'welcome' CHECK (source IN ('welcome', 'checkout', 'manual')),
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  consent_at        TIMESTAMPTZ,
  unsubscribed_at   TIMESTAMPTZ,
  visitor_id        TEXT,
  first_source      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, phone_key)
)`,
  "CREATE INDEX IF NOT EXISTS idx_store_contacts_store_created ON store_contacts (store_id, created_at DESC)",
  "ALTER TABLE stores ADD COLUMN IF NOT EXISTS welcome_offer_enabled BOOLEAN NOT NULL DEFAULT false",
  "ALTER TABLE stores ADD COLUMN IF NOT EXISTS welcome_offer_percent INTEGER NOT NULL DEFAULT 10",
  "ALTER TABLE stores ADD COLUMN IF NOT EXISTS welcome_offer_headline TEXT",
  "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'standard'",
  "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES store_contacts(id) ON DELETE SET NULL",
  "ALTER TABLE orders ADD COLUMN IF NOT EXISTS visitor_id TEXT",
  "ALTER TABLE orders ADD COLUMN IF NOT EXISTS first_source TEXT",
  "CREATE INDEX IF NOT EXISTS idx_store_visits_visitor ON store_visits (store_id, visitor_id, visited_at)",
  // phase 2: migrations/growth_automations.sql
  "ALTER TABLE stores ADD COLUMN IF NOT EXISTS growth_automations JSONB NOT NULL DEFAULT '{}'::jsonb",
  `CREATE TABLE IF NOT EXISTS growth_messages (
  id          BIGSERIAL PRIMARY KEY,
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  flow        TEXT NOT NULL,
  ref         TEXT NOT NULL,
  email       TEXT NOT NULL,
  contact_id  UUID,
  order_id    UUID,
  coupon_code TEXT,
  status      TEXT NOT NULL DEFAULT 'sending',
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, flow, ref)
)`,
  "CREATE INDEX IF NOT EXISTS idx_growth_messages_store ON growth_messages (store_id, created_at DESC)",
  `CREATE TABLE IF NOT EXISTS growth_unsubscribes (
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (store_id, email)
)`,
  // phase 3: migrations/growth_phase3.sql
  `CREATE TABLE IF NOT EXISTS broadcasts (
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
)`,
  `CREATE INDEX IF NOT EXISTS idx_broadcasts_store ON broadcasts (store_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS broadcast_recipients (
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  name         TEXT,
  contact_id   UUID,
  status       TEXT NOT NULL DEFAULT 'pending',
  error        TEXT,
  sent_at      TIMESTAMPTZ,
  PRIMARY KEY (broadcast_id, email)
)`,
  `CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_pending ON broadcast_recipients (broadcast_id, status)`,
  `ALTER TABLE stores ADD COLUMN IF NOT EXISTS referral_settings JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `CREATE TABLE IF NOT EXISTS shopper_referrers (
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
)`,
  `CREATE TABLE IF NOT EXISTS shopper_referrals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  referrer_id      UUID NOT NULL REFERENCES shopper_referrers(id) ON DELETE CASCADE,
  order_id         UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  friend_phone_key TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rewarded', 'void')),
  reward           NUMERIC(12, 2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rewarded_at      TIMESTAMPTZ
)`,
  `CREATE INDEX IF NOT EXISTS idx_shopper_referrals_referrer ON shopper_referrals (referrer_id, status)`,
  `ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS theme TEXT`,
];

let ready: Promise<void> | null = null;

export function ensureGrowthSchema(): Promise<void> {
  ready ??= (async () => {
    for (const s of GROWTH_STATEMENTS) await query(s);
  })().catch((e) => {
    ready = null; // try again next time
    throw e;
  });
  return ready;
}

/** true once the schema is in place; false (never throws) if it couldn't be made. */
export function growthSchemaReady(): Promise<boolean> {
  return ensureGrowthSchema().then(
    () => true,
    () => false,
  );
}

-- Growth engine, phase 1: capture contacts, attribute orders, welcome offers.
-- See src/lib/growth.ts.

-- People who asked to hear from a store (welcome offer, or ticked the box at
-- checkout). One row per store + phone. Buyers who didn't opt in stay in the
-- order-derived Customers list but are never marketed to.
CREATE TABLE IF NOT EXISTS store_contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  phone             TEXT NOT NULL,
  phone_key         TEXT NOT NULL,             -- 2348012345678 (lib/phone toNgInternational)
  email             TEXT,
  name              TEXT,
  source            TEXT NOT NULL DEFAULT 'welcome' CHECK (source IN ('welcome', 'checkout', 'manual')),
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  consent_at        TIMESTAMPTZ,
  unsubscribed_at   TIMESTAMPTZ,
  visitor_id        TEXT,                       -- the storefront's anonymous sf_vid when they signed up
  first_source      TEXT,                       -- traffic source that first brought them (whatsapp, instagram…)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, phone_key)
);
CREATE INDEX IF NOT EXISTS idx_store_contacts_store_created ON store_contacts (store_id, created_at DESC);

-- The welcome offer a store shows new visitors
ALTER TABLE stores ADD COLUMN IF NOT EXISTS welcome_offer_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS welcome_offer_percent INTEGER NOT NULL DEFAULT 10;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS welcome_offer_headline TEXT;

-- Coupons the engine makes (one per person) are kept apart from the
-- vendor's own codes: they don't count towards plan limits or clutter Coupons
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES store_contacts(id) ON DELETE SET NULL;

-- Which visit an order came from, so the engine can tell which channel and
-- offer actually brought buyers (not just visitors)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS visitor_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS first_source TEXT;
CREATE INDEX IF NOT EXISTS idx_store_visits_visitor ON store_visits (store_id, visitor_id, visited_at);

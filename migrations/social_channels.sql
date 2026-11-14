-- WhatsApp (and later Instagram / Messenger) selling.
-- The app also creates these tables on first use (src/lib/meta/db.ts).

-- A store's connected account on a channel
CREATE TABLE IF NOT EXISTS social_connections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  channel      TEXT NOT NULL CHECK (channel IN ('whatsapp', 'instagram', 'messenger')),
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  external_id  TEXT NOT NULL,          -- WhatsApp phone number ID / Page ID / IG user ID
  account_id   TEXT,                   -- WhatsApp Business Account ID
  display_name TEXT,
  display_phone TEXT,
  token_enc    TEXT,                   -- encrypted access token (NULL for the env test number)
  token_source TEXT NOT NULL DEFAULT 'oauth' CHECK (token_source IN ('oauth', 'env_test')),
  meta_user_id TEXT,
  catalog_id   TEXT,
  last_error   TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, channel),
  UNIQUE (channel, external_id)
);

-- One shopper chatting with one store
CREATE TABLE IF NOT EXISTS social_conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  channel          TEXT NOT NULL,
  customer_ref     TEXT NOT NULL,      -- WhatsApp ID (phone) / PSID / IGSID
  customer_name    TEXT,
  state            JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_inbound_at  TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, channel, customer_ref)
);

CREATE TABLE IF NOT EXISTS social_messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES social_conversations(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  external_id     TEXT,
  type            TEXT NOT NULL,
  body            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Meta can deliver the same message twice: process it once
CREATE UNIQUE INDEX IF NOT EXISTS social_messages_external_id ON social_messages (external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS social_messages_conversation ON social_messages (conversation_id, created_at DESC);

-- "Complete your order" links: a chat cart handed to the store's checkout
CREATE TABLE IF NOT EXISTS social_cart_links (
  token           TEXT PRIMARY KEY,
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES social_conversations(id) ON DELETE SET NULL,
  items           JSONB NOT NULL,
  order_id        UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);
CREATE INDEX IF NOT EXISTS social_cart_links_order ON social_cart_links (order_id) WHERE order_id IS NOT NULL;

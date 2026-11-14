// Creates the social selling tables on first use, so nothing breaks before
// migrations/social_channels.sql has run. Keep the two in step.

import { query } from "@/lib/db";

const STATEMENTS = [
  "CREATE TABLE IF NOT EXISTS social_connections (\n  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,\n  channel      TEXT NOT NULL CHECK (channel IN ('whatsapp', 'instagram', 'messenger')),\n  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),\n  external_id  TEXT NOT NULL,          -- WhatsApp phone number ID / Page ID / IG user ID\n  account_id   TEXT,                   -- WhatsApp Business Account ID\n  display_name TEXT,\n  display_phone TEXT,\n  token_enc    TEXT,                   -- encrypted access token (NULL for the env test number)\n  token_source TEXT NOT NULL DEFAULT 'oauth' CHECK (token_source IN ('oauth', 'env_test')),\n  meta_user_id TEXT,\n  catalog_id   TEXT,\n  last_error   TEXT,\n  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n  UNIQUE (store_id, channel),\n  UNIQUE (channel, external_id)\n)",
  "CREATE TABLE IF NOT EXISTS social_conversations (\n  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,\n  channel          TEXT NOT NULL,\n  customer_ref     TEXT NOT NULL,      -- WhatsApp ID (phone) / PSID / IGSID\n  customer_name    TEXT,\n  state            JSONB NOT NULL DEFAULT '{}'::jsonb,\n  last_inbound_at  TIMESTAMPTZ,\n  last_outbound_at TIMESTAMPTZ,\n  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n  UNIQUE (store_id, channel, customer_ref)\n)",
  "CREATE TABLE IF NOT EXISTS social_messages (\n  id              BIGSERIAL PRIMARY KEY,\n  conversation_id UUID NOT NULL REFERENCES social_conversations(id) ON DELETE CASCADE,\n  direction       TEXT NOT NULL CHECK (direction IN ('in', 'out')),\n  external_id     TEXT,\n  type            TEXT NOT NULL,\n  body            JSONB NOT NULL DEFAULT '{}'::jsonb,\n  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()\n)",
  "CREATE UNIQUE INDEX IF NOT EXISTS social_messages_external_id ON social_messages (external_id) WHERE external_id IS NOT NULL",
  "CREATE INDEX IF NOT EXISTS social_messages_conversation ON social_messages (conversation_id, created_at DESC)",
  "CREATE TABLE IF NOT EXISTS social_cart_links (\n  token           TEXT PRIMARY KEY,\n  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,\n  conversation_id UUID REFERENCES social_conversations(id) ON DELETE SET NULL,\n  items           JSONB NOT NULL,\n  order_id        UUID,\n  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n  opened_at       TIMESTAMPTZ,\n  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'\n)",
  "CREATE INDEX IF NOT EXISTS social_cart_links_order ON social_cart_links (order_id) WHERE order_id IS NOT NULL"
];

let ready: Promise<void> | null = null;

export function ensureSocialTables(): Promise<void> {
  ready ??= (async () => {
    for (const s of STATEMENTS) await query(s);
  })().catch((e) => {
    ready = null; // try again next time
    throw e;
  });
  return ready;
}

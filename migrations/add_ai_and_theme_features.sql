-- AI assist + theme presets (Phase 1 — see plan: AI + UX foundation)

ALTER TABLE stores ADD COLUMN IF NOT EXISTS ai_assistant_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS storefront_font TEXT NOT NULL DEFAULT 'inter';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS storefront_card_style TEXT NOT NULL DEFAULT 'rounded'
  CHECK (storefront_card_style IN ('rounded', 'sharp'));

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  feature    TEXT NOT NULL,
  provider   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_store_id ON ai_usage_log(store_id);

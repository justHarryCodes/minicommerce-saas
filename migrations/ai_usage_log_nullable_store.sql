-- AI store-structure suggestion (categories/subcategories from a free-text
-- description) is usable during onboarding, before a store row exists yet —
-- unlike the other two AI features (product description, category
-- suggestion), which only ever run against an already-created store.
-- ai_usage_log.store_id was NOT NULL, which would reject the log write for
-- that pre-store-creation call. DROP NOT NULL is naturally idempotent in
-- Postgres (a no-op if the column is already nullable), no guard needed.
ALTER TABLE ai_usage_log ALTER COLUMN store_id DROP NOT NULL;

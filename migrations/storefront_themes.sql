-- Full storefront themes: a chosen theme from src/lib/themes/catalog.ts plus
-- the merchant's overrides on top of it (validated app-side by
-- customizationSchema). NULL theme id = legacy store, rendered as
-- "Duka Classic" using the older accent/font/card-style columns.

ALTER TABLE stores ADD COLUMN IF NOT EXISTS storefront_theme_id TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS storefront_customization JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ── Storefront theme columns ─────────────────────────────────────────────────
-- Separate storefront-facing theme from any future dashboard theme.
-- Seeded from the existing theme_mode / accent_color values so no data is lost.

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS storefront_theme_mode  VARCHAR(20) DEFAULT 'both'
    CHECK (storefront_theme_mode IN ('light', 'dark', 'both')),
  ADD COLUMN IF NOT EXISTS storefront_accent_color VARCHAR(7)  DEFAULT '#f59e0b',
  ADD COLUMN IF NOT EXISTS payment_preference      VARCHAR(20) DEFAULT 'paystack'
    CHECK (payment_preference IN ('paystack', 'bank_transfer', 'both')),
  ADD COLUMN IF NOT EXISTS bank_account_number     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_account_name       VARCHAR(150);

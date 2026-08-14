-- Merchant-initiated account deletion (Phase 2 — foundation hardening)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

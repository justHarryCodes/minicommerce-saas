-- ── Platform bank accounts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_bank_accounts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name    TEXT        NOT NULL,
  account_number TEXT      NOT NULL,
  account_name TEXT        NOT NULL,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the initial account
INSERT INTO platform_bank_accounts (bank_name, account_number, account_name, sort_order)
VALUES ('UBA', '1028602229', 'Awarizon Ltd', 0)
ON CONFLICT DO NOTHING;

-- ── Add payment_method to subscription_payments ──────────────────────────────
ALTER TABLE subscription_payments
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'paystack';

-- ── Extend payment_status to include pending_transfer and rejected ────────────
DO $$
DECLARE c TEXT;
BEGIN
  SELECT tc.constraint_name INTO c
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
  WHERE tc.table_name = 'subscription_payments'
    AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%payment_status%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE subscription_payments DROP CONSTRAINT %I', c);
  END IF;
END$$;

ALTER TABLE subscription_payments
  ADD CONSTRAINT subscription_payments_payment_status_check
  CHECK (payment_status IN ('pending', 'pending_transfer', 'paid', 'failed', 'rejected'));

-- Yearly plan billing. Each plan payment records whether it bought one
-- month or a year (12 months at the admin's yearly discount, default 20%).
-- Existing payments were all monthly.
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_payments_billing_cycle_check') THEN
    ALTER TABLE subscription_payments
      ADD CONSTRAINT subscription_payments_billing_cycle_check CHECK (billing_cycle IN ('monthly', 'yearly'));
  END IF;
END $$;

-- Admin reports: yearly vs monthly subscribers
CREATE INDEX IF NOT EXISTS subscription_payments_cycle_idx
  ON subscription_payments (billing_cycle, payment_status) WHERE type = 'plan';

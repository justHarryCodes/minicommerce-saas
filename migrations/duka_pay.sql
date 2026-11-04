-- Duka Pay: shoppers pay with card / transfer / USSD on Duka's Paystack
-- account; each store has a Paystack subaccount, so Paystack settles the
-- store's share straight to the store's bank and Duka keeps its fee.

-- Payout account (Paystack subaccount) per store
ALTER TABLE stores ADD COLUMN IF NOT EXISTS settlement_bank_code TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS paystack_subaccount_code TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS duka_pay_status TEXT NOT NULL DEFAULT 'not_connected';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS duka_pay_connected_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE stores ADD CONSTRAINT stores_duka_pay_status_check
    CHECK (duka_pay_status IN ('not_connected', 'active', 'disabled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS stores_paystack_subaccount_code_key
  ON stores (paystack_subaccount_code) WHERE paystack_subaccount_code IS NOT NULL;

-- What each checkout was split as, and what Paystack actually split
ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS subaccount_code TEXT;
-- Duka's fee asked for at checkout (Naira)
ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(12, 2);
-- From Paystack's fees_split once paid (Naira)
ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS paystack_fee NUMERIC(12, 2);
ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS platform_share NUMERIC(12, 2);
ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS store_share NUMERIC(12, 2);
ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS channel TEXT;

CREATE INDEX IF NOT EXISTS payment_attempts_store_success_idx
  ON payment_attempts (store_id, settled_at) WHERE status = 'success';

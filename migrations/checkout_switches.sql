-- Checkout payments become three independent switches: Duka Pay, bank
-- transfer and pay on delivery (pod_enabled already exists). The old
-- payment_preference ('paystack' | 'bank_transfer' | 'both') couldn't say
-- "only pay on delivery", so each method gets its own column.
ALTER TABLE stores ADD COLUMN IF NOT EXISTS duka_pay_enabled BOOLEAN;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS bank_transfer_enabled BOOLEAN;

-- Carry every store's current choice over exactly (only rows not yet set)
UPDATE stores
SET duka_pay_enabled = COALESCE(payment_preference, 'both') IN ('paystack', 'both')
WHERE duka_pay_enabled IS NULL;
UPDATE stores
SET bank_transfer_enabled = COALESCE(payment_preference, 'both') IN ('bank_transfer', 'both')
WHERE bank_transfer_enabled IS NULL;

-- New stores: Duka Pay on, manual transfer off
ALTER TABLE stores ALTER COLUMN duka_pay_enabled SET DEFAULT true;
ALTER TABLE stores ALTER COLUMN duka_pay_enabled SET NOT NULL;
ALTER TABLE stores ALTER COLUMN bank_transfer_enabled SET DEFAULT false;
ALTER TABLE stores ALTER COLUMN bank_transfer_enabled SET NOT NULL;

-- Fix orders.payment_method CHECK constraint to allow 'bank_transfer'
-- The code maps client 'transfer' → 'bank_transfer' before inserting,
-- but the original constraint only allowed 'transfer'. This caused every
-- bank transfer order to fail with a constraint violation.
DO $$
DECLARE c TEXT;
BEGIN
  SELECT tc.constraint_name INTO c
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
  WHERE tc.table_name = 'orders'
    AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%payment_method%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', c);
  END IF;
END$$;

ALTER TABLE orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('paystack', 'transfer', 'bank_transfer'));

-- Also add delivery_note to orders if missing (collected in checkout form but not inserted)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_note TEXT;

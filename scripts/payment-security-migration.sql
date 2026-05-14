-- ── Payment Security Fixes ──────────────────────────────────────────────────
-- Fix 1: subscription_payments.type CHECK did not include 'plan'
--         subscribe-plan/route.ts was crashing with a constraint violation.
DO $$
DECLARE c TEXT;
BEGIN
  SELECT tc.constraint_name INTO c
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
  WHERE tc.table_name = 'subscription_payments'
    AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%type%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE subscription_payments DROP CONSTRAINT %I', c);
  END IF;
END$$;

ALTER TABLE subscription_payments
  ADD CONSTRAINT subscription_payments_type_check
  CHECK (type IN ('setup_fee', 'monthly', 'plan'));

-- Fix 2: stores.status CHECK did not include 'pending_approval'
--         billing/verify was crashing when setting status = 'pending_approval'.
DO $$
DECLARE c TEXT;
BEGIN
  SELECT tc.constraint_name INTO c
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
  WHERE tc.table_name = 'stores'
    AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%pending_payment%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE stores DROP CONSTRAINT %I', c);
  END IF;
END$$;

ALTER TABLE stores
  ADD CONSTRAINT stores_status_check
  CHECK (status IN ('active', 'suspended', 'restricted', 'pending_payment', 'pending_approval'));

-- Fix 3: seed require_plan_subscription setting if not present
INSERT INTO platform_settings (key, value)
VALUES ('require_plan_subscription', 'false')
ON CONFLICT (key) DO NOTHING;

-- Freemium rollout: Free plan (auto-granted, no payment) vs Pro (paid, via existing
-- Paystack plan-subscription flow). "price_monthly > 0" is the Pro signal everywhere
-- in application code — see src/lib/plan.ts.

-- Rename the existing paid plan for clarity now that "Basic" vs "Free" would be confusing
UPDATE plans SET name = 'Pro' WHERE name = 'Basic';

-- Seed the Free plan (idempotent — skip if a free-tier plan already exists)
INSERT INTO plans (name, description, price_monthly, max_products, sort_order)
SELECT 'Free', 'Get started free — up to 10 products, core store tools', 0, 10, -1
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE price_monthly = 0);

-- Remove the all-dashboard setup-fee paywall; new vendors get instant Free access
INSERT INTO platform_settings (key, value) VALUES ('require_setup_fee', 'false'::jsonb)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Activate plan-based product limits (Free = 10, Pro = whatever the plan defines)
INSERT INTO platform_settings (key, value) VALUES ('require_plan_subscription', 'true'::jsonb)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

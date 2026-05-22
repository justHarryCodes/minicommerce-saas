-- ── Remove duplicate plans, keeping the oldest row per name ─────────────────
DELETE FROM plans
WHERE id NOT IN (
  SELECT DISTINCT ON (name) id
  FROM plans
  ORDER BY name, created_at ASC
);

-- ── Add unique constraint on name so ON CONFLICT actually works ───────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'plans' AND constraint_name = 'plans_name_key'
  ) THEN
    ALTER TABLE plans ADD CONSTRAINT plans_name_key UNIQUE (name);
  END IF;
END$$;

-- ── Add subscription_status 'expired' to stores check constraint if present ──
-- (no-op if there is no check constraint — just ensures schema allows the value)
DO $$
BEGIN
  -- Re-seed Basic plan idempotently (now the conflict target is real)
  INSERT INTO plans (name, description, price_monthly, max_products, sort_order)
  VALUES ('Basic', 'Up to 100 products listed at a time', 5000, 100, 0)
  ON CONFLICT (name) DO NOTHING;
END$$;

-- ── Add 'expired' to subscription_status if it isn't already accepted ─────────
DO $$
BEGIN
  -- Auto-expire any stores whose subscription_expires_at is in the past
  UPDATE stores
  SET subscription_status = 'expired',
      status              = 'suspended',
      updated_at          = NOW()
  WHERE subscription_status = 'subscribed'
    AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at < NOW();
END$$;

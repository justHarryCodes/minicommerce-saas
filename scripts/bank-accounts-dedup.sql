-- ── Deduplicate platform_bank_accounts and add unique constraint ─────────────
-- Remove all duplicate rows, keeping the oldest per account_number
DELETE FROM platform_bank_accounts
WHERE id NOT IN (
  SELECT MIN(id::text)::uuid
  FROM platform_bank_accounts
  GROUP BY account_number
);

-- Add unique constraint so ON CONFLICT DO NOTHING actually works going forward
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'platform_bank_accounts'
      AND constraint_name = 'platform_bank_accounts_account_number_key'
  ) THEN
    ALTER TABLE platform_bank_accounts ADD CONSTRAINT platform_bank_accounts_account_number_key UNIQUE (account_number);
  END IF;
END$$;

-- Re-seed idempotently (now the conflict target is real)
INSERT INTO platform_bank_accounts (bank_name, account_number, account_name, sort_order)
VALUES ('UBA', '1028602229', 'Awarizon Ltd', 0)
ON CONFLICT (account_number) DO NOTHING;

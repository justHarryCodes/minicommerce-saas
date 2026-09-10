-- Referral reward idempotency (Phase 1 — stop the revenue leaks)
--
-- Both write sites for `referrals` (store signup, and the reward grant in
-- lib/billing-fulfillment.ts) use bare `ON CONFLICT DO NOTHING`, but the
-- table has never had a unique constraint for that clause to target — so it
-- has silently been a no-op, and a referrer/referred pair could in
-- principle accumulate duplicate rows instead of one row transitioning
-- 'signed_up' -> 'rewarded'. The reward is being re-pointed from the (now
-- largely dead) setup-fee payment to the referred store's first successful
-- plan subscription payment, which recurs monthly on renewal — so an
-- atomic, constraint-backed idempotency guarantee is now required, not
-- just nice-to-have.
--
-- A plain (non-partial) UNIQUE constraint is used deliberately — Postgres
-- treats each NULL as distinct for uniqueness purposes, so rows where
-- referred_store_id is NULL (a referred store later deleted, per its
-- ON DELETE SET NULL) never conflict with each other or with anything else,
-- with no partial-index WHERE clause needed. This also matches the bare
-- `ON CONFLICT DO NOTHING` (no explicit target) already used at both call
-- sites, which only infers a real constraint/index, not a partial one.

-- Step 1: collapse any existing duplicate (referrer_store_id, referred_store_id)
-- rows down to one, preferring a 'rewarded' row over a 'signed_up' row so a
-- past reward is never lost, then the oldest row as a tiebreaker.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY referrer_store_id, referred_store_id
      ORDER BY (status = 'rewarded') DESC, created_at ASC
    ) AS rn
  FROM referrals
  WHERE referred_store_id IS NOT NULL
)
DELETE FROM referrals
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Step 2: add the unique constraint so ON CONFLICT DO NOTHING (existing call
-- sites) and the new atomic reward UPDATE actually have a real target.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'referrals' AND constraint_name = 'referrals_referrer_referred_key'
  ) THEN
    ALTER TABLE referrals
      ADD CONSTRAINT referrals_referrer_referred_key UNIQUE (referrer_store_id, referred_store_id);
  END IF;
END$$;

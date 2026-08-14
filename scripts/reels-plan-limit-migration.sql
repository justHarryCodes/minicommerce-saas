-- Reel upload quotas become plan-defined instead of a flat global setting,
-- and a new "Business" tier is introduced above Pro.

ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_reels INTEGER NOT NULL DEFAULT 0;

-- Lock in the confirmed Pro numbers
UPDATE plans SET price_monthly = 5000, max_products = 100, max_reels = 10 WHERE name = 'Pro';

-- Seed the Business plan (idempotent)
INSERT INTO plans (name, description, price_monthly, max_products, max_reels, sort_order)
SELECT 'Business', 'For growing stores — higher product and reel limits', 17000, 1000, 20, 1
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Business');

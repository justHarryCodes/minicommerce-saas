-- The Free plan gets a taste of Pro (see FREE_FEATURES / FREE_LIMITS in
-- src/lib/features-shared.ts): one reel a month. Only raises a Free plan
-- that has none; an admin-set value is kept.
UPDATE plans SET max_reels = 1 WHERE price_monthly = 0 AND COALESCE(max_reels, 0) = 0;

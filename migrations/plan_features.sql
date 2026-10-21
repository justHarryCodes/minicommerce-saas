-- Per-plan feature lists. NULL keeps the default (paid plan → every paid
-- feature, Free → none); an array restricts a plan to exactly those
-- features, so the admin can create in-between tiers.
ALTER TABLE plans ADD COLUMN IF NOT EXISTS features TEXT[];

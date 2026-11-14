-- Google Search Console / Merchant Center site verification for each store.
-- Vendors paste Google's "HTML tag" in Settings -> Google Search; every page of
-- their store then carries <meta name="google-site-verification" content="...">.
-- (The app also adds this column on first save, so the order doesn't matter.)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS google_site_verification TEXT
  CHECK (google_site_verification IS NULL OR char_length(google_site_verification) <= 100);

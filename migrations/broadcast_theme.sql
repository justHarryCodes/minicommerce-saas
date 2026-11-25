-- Vendor broadcasts get a look (emoji badge + label, see src/lib/email-themes.ts),
-- like Admin campaigns. Also applied on first use by src/lib/growth-schema.ts.
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS theme TEXT;

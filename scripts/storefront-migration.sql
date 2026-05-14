-- Vendor storefront customisation
-- Banner slider images (up to 5 URLs)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS banner_images TEXT[] DEFAULT '{}';

-- Featured product IDs (up to 10, order preserved)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS featured_product_ids TEXT[] DEFAULT '{}';

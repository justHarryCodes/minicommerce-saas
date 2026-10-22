-- Rich product details that premium product pages render: a spec table
-- (gadgets, furniture), scent notes (perfume) and short highlight bullets.
-- Shape (validated in lib/product-details.ts):
--   { "specs": [{ "label": "Storage", "value": "256GB" }],
--     "notes": { "top": ["Bergamot"], "heart": ["Rose"], "base": ["Musk"] },
--     "highlights": ["Waterproof", "2-year warranty"] }
ALTER TABLE products ADD COLUMN IF NOT EXISTS details JSONB;

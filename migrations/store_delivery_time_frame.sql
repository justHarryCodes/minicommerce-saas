-- Merchant-set delivery estimate shown to shoppers (product page, checkout),
-- e.g. "1–3 business days" or "30–45 minutes". Free text, NULL = not shown.

ALTER TABLE stores ADD COLUMN IF NOT EXISTS delivery_time_frame TEXT
  CHECK (delivery_time_frame IS NULL OR char_length(delivery_time_frame) <= 60);

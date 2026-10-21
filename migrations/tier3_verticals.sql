-- Tier 3: food (opening hours, minimum order, prep time, sold-out-today,
-- order-ahead), services (bookings, staff, appointment reminders) and
-- clothing (size guides, back-in-stock alerts). Additive only.

-- ── Opening hours & food operations ─────────────────────────────────────────
-- {"0":null,"1":{"open":"09:00","close":"21:00"},...}  keys = weekday (0 = Sunday),
-- null = closed that day; column NULL = always open. Times are Lagos time.
ALTER TABLE stores ADD COLUMN IF NOT EXISTS opening_hours JSONB;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS allow_preorders BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS minimum_order NUMERIC(12, 2)
  CHECK (minimum_order IS NULL OR minimum_order >= 0);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER
  CHECK (prep_time_minutes IS NULL OR prep_time_minutes BETWEEN 1 AND 1440);
-- "Sold out today": unavailable through the end of this Lagos date
ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_out_until DATE;
-- Orders placed while closed are scheduled for the next opening
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- ── Bookings ────────────────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bookable BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS duration_minutes INTEGER
  CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 5 AND 1440);

ALTER TABLE stores ADD COLUMN IF NOT EXISTS booking_slot_minutes INTEGER NOT NULL DEFAULT 30
  CHECK (booking_slot_minutes IN (15, 30, 60));
ALTER TABLE stores ADD COLUMN IF NOT EXISTS booking_buffer_minutes INTEGER NOT NULL DEFAULT 0
  CHECK (booking_buffer_minutes BETWEEN 0 AND 120);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS booking_window_days INTEGER NOT NULL DEFAULT 30
  CHECK (booking_window_days BETWEEN 1 AND 180);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS booking_min_notice_minutes INTEGER NOT NULL DEFAULT 60
  CHECK (booking_min_notice_minutes BETWEEN 0 AND 10080);

CREATE TABLE IF NOT EXISTS staff_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT,
  -- services this person offers; empty = all bookable services
  product_ids UUID[] NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_members_store ON staff_members(store_id);

CREATE TABLE IF NOT EXISTS bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id         UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name     TEXT NOT NULL,
  staff_id         UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at),
  status           TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no_show')),
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT NOT NULL,
  reminder_sent_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_store_time ON bookings(store_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_bookings_order ON bookings(order_id);
CREATE INDEX IF NOT EXISTS idx_bookings_reminders ON bookings(status, reminder_sent_at, starts_at);

-- Appointment-only orders have nothing to deliver
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_delivery_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_delivery_method_check
  CHECK (delivery_method IN ('delivery', 'pickup', 'appointment'));

-- ── Clothing ────────────────────────────────────────────────────────────────
-- {"columns":["Size","Bust (cm)",…],"rows":[["S","82–86",…],…],"note":"…"}
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_guide JSONB;

CREATE TABLE IF NOT EXISTS stock_alerts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_label  TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at    TIMESTAMPTZ,
  CHECK (customer_phone IS NOT NULL OR customer_email IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_alerts_subscriber ON stock_alerts (
  product_id, COALESCE(variant_label, ''), COALESCE(customer_phone, ''), COALESCE(customer_email, '')
) WHERE notified_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stock_alerts_pending ON stock_alerts(product_id, variant_label) WHERE notified_at IS NULL;

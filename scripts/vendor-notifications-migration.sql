-- Run this once against your production database.
-- Creates the vendor_notifications table used by the mobile app's
-- bell icon and the push notification sender.

CREATE TABLE IF NOT EXISTS vendor_notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL DEFAULT 'order',
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  data        JSONB       NOT NULL DEFAULT '{}',
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_notifs_store
  ON vendor_notifications(store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vendor_notifs_unread
  ON vendor_notifications(store_id, is_read)
  WHERE is_read = FALSE;

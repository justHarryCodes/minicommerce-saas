-- Web Push subscriptions (PWA push for vendors + admins)
--
-- Deliberately separate from vendor_push_tokens (lib/push.ts) — that table
-- stores Expo push tokens for the duka-vendors mobile app (a single opaque
-- string per device). A Web Push subscription is a different shape
-- entirely: an endpoint URL plus a keypair for RFC 8291 payload
-- encryption. One vendor/admin can have many subscriptions (one per
-- browser/device they've enabled notifications on).

CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type TEXT        NOT NULL CHECK (subject_type IN ('vendor', 'admin')),
  -- subject_id is stores.id for a vendor, admin_users.firebase_uid for an
  -- admin — no single FK target, so left as an unconstrained TEXT/UUID-ish
  -- id and validated at the application layer where the subscribe route
  -- already knows which table it resolved the subject from.
  subject_id   TEXT        NOT NULL,
  endpoint     TEXT        NOT NULL UNIQUE,
  p256dh       TEXT        NOT NULL,
  auth         TEXT        NOT NULL,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_web_push_subs_subject
  ON web_push_subscriptions (subject_type, subject_id);

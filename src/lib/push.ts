// Expo push notification sender.
// Tokens are stored as Expo push tokens (ExponentPushToken[...]), so we
// use Expo's push API rather than Firebase Admin SDK messaging.
import { query } from "./db";

let tableReady = false;
async function ensureNotificationsTable() {
  if (tableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS vendor_notifications (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id   UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      type       TEXT        NOT NULL DEFAULT 'order',
      title      TEXT        NOT NULL,
      body       TEXT        NOT NULL,
      data       JSONB       NOT NULL DEFAULT '{}',
      is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_vendor_notifs_store
      ON vendor_notifications(store_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_vendor_notifs_unread
      ON vendor_notifications(store_id, is_read)
      WHERE is_read = FALSE;
  `);
  tableReady = true;
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: string;
  channelId?: string;
  priority?: "high" | "normal" | "default";
  badge?: number;
}

async function sendExpoPush(messages: ExpoMessage[]): Promise<void> {
  if (!messages.length) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
    });
  } catch {
    // Non-blocking — delivery failure must not break the caller
  }
}

export async function notifyStoreNewOrder(
  storeId: string,
  orderId: string,
  orderNumber: string,
  customerName: string,
  totalAmount: number
): Promise<void> {
  const title = "New Order Received";
  const body = `${orderNumber} · ${customerName} · ₦${totalAmount.toLocaleString("en-NG")}`;

  // Ensure table exists before inserting (non-blocking on failure)
  try { await ensureNotificationsTable(); } catch {}
  query(
    `INSERT INTO vendor_notifications (store_id, type, title, body, data)
     VALUES ($1, 'order', $2, $3, $4)`,
    [storeId, title, body, JSON.stringify({ orderId, orderNumber })]
  ).catch(() => {});

  // Fetch registered device tokens for this store
  const tokens = await query<{ token: string }>(
    "SELECT token FROM vendor_push_tokens WHERE store_id = $1",
    [storeId]
  ).catch(() => [] as { token: string }[]);

  if (!tokens.length) return;

  await sendExpoPush(
    tokens.map(({ token }) => ({
      to: token,
      title,
      body,
      data: { type: "order", orderId, orderNumber },
      sound: "default",
      channelId: "orders",
      priority: "high" as const,
    }))
  );
}

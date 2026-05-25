import { NextResponse } from "next/server";
import { verifySession, getUserStore } from "@/lib/auth";
import { query } from "@/lib/db";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  is_read: boolean;
  created_at: string;
}

// GET /api/mobile/notifications
// Returns the 50 most recent notifications for the authenticated vendor.
export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "No store" }, { status: 404 });

  const notifications = await query<NotificationRow>(
    `SELECT id, type, title, body, data, is_read, created_at
       FROM vendor_notifications
      WHERE store_id = $1
      ORDER BY created_at DESC
      LIMIT 50`,
    [store.id]
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return NextResponse.json({ notifications, unreadCount });
}

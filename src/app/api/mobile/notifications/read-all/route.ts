import { NextResponse } from "next/server";
import { verifySession, getUserStore } from "@/lib/auth";
import { query } from "@/lib/db";

// PATCH /api/mobile/notifications/read-all
// Marks every unread notification for the authenticated vendor as read.
export async function PATCH() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "No store" }, { status: 404 });

  // Table may not exist yet on first run — guard against that
  try {
    await query(
      `UPDATE vendor_notifications
          SET is_read = TRUE
        WHERE store_id = $1 AND is_read = FALSE`,
      [store.id]
    );
  } catch {
    // Table doesn't exist yet — nothing to mark read
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getStoreFor } from "@/lib/access";
import { query } from "@/lib/db";
import { addDays, lagosToUtc } from "@/lib/hours";

/** Bookings for a range of Lagos dates: ?from=YYYY-MM-DD&days=N (max 31). */
export async function GET(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "bookings");
  if (!store) return NextResponse.json({ error: "No store" }, { status: 404 });

  const from = req.nextUrl.searchParams.get("from") ?? "";
  const days = Math.min(31, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 7));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const rows = await query(
    `SELECT b.id, b.product_name, b.starts_at, b.ends_at, b.status, b.customer_name, b.customer_phone,
            b.staff_id, sm.name AS staff_name, o.order_number, o.payment_status, o.access_token
     FROM bookings b
     LEFT JOIN staff_members sm ON sm.id = b.staff_id
     LEFT JOIN orders o ON o.id = b.order_id
     WHERE b.store_id = $1 AND b.starts_at >= $2 AND b.starts_at < $3
     ORDER BY b.starts_at`,
    [store.id, lagosToUtc(from, 0).toISOString(), lagosToUtc(addDays(from, days), 0).toISOString()]
  );
  return NextResponse.json({ data: rows });
}

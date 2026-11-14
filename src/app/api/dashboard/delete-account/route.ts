import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { deleteVendorAccount } from "@/lib/data-deletion";

const Schema = z.object({ confirmName: z.string() });

// Merchant-only. Anonymizes the store's own PII and deletes the Firebase
// Auth account — does NOT touch orders/order_items (financial records, and
// they hold the store's *customers'* PII, not the merchant's own) or
// products/categories/coupons/reels (already inert once is_active = false,
// since every public/storefront/discover query filters on that flag).
// Admin -> Data requests runs the same deleteVendorAccount().
export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing confirmation" }, { status: 422 });
  }
  if (parsed.data.confirmName.trim() !== store.name) {
    return NextResponse.json({ error: "Store name doesn't match" }, { status: 422 });
  }

  await deleteVendorAccount(store.id);

  const cookieStore = await cookies();
  cookieStore.delete("session");

  return NextResponse.json({ ok: true });
}

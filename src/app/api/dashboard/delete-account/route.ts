import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifySession, getUserStore } from "@/lib/auth";
import { adminAuth } from "@/lib/firebase-admin";
import { query } from "@/lib/db";
import { cacheDel } from "@/lib/redis";

const Schema = z.object({ confirmName: z.string() });

// Merchant-only. Anonymizes the store's own PII and deletes the Firebase
// Auth account — does NOT touch orders/order_items (financial records, and
// they hold the store's *customers'* PII, not the merchant's own) or
// products/categories/coupons/reels (already inert once is_active = false,
// since every public/storefront/discover query filters on that flag).
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

  await query(
    `UPDATE stores
     SET name = 'Deleted Store', description = NULL, logo_url = NULL,
         phone = NULL, whatsapp = NULL,
         bank_name = NULL, bank_account_number = NULL, bank_account_name = NULL,
         paystack_public_key = NULL, nin_number = NULL,
         is_active = false, deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [store.id]
  );
  await cacheDel(`store:${store.slug}`);

  try {
    await adminAuth.deleteUser(user.firebaseUid);
  } catch {
    // The store row is already anonymized and deactivated either way — a
    // failure here just means the Firebase account itself lingers, which
    // is recoverable manually and shouldn't block the rest of the deletion.
  }

  const cookieStore = await cookies();
  cookieStore.delete("session");

  return NextResponse.json({ ok: true });
}

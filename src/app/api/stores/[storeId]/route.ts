import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { queryOne, query, toCamel } from "@/lib/db";
import { cacheDel } from "@/lib/redis";

export async function PATCH(req: NextRequest) {
  const user = await verifySession();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Single-company mode: there is only one store, so no id / owner lookup
  const store = await queryOne<{ id: string; slug: string }>(
    "SELECT id, slug FROM stores LIMIT 1",
  );
  if (!store)
    return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const body = await req.json();

  const fieldMap: Record<string, string> = {
    name: "name",
    description: "description",
    logoUrl: "logo_url",
    phone: "phone",
    whatsapp: "whatsapp",
    return_policy: "return_policy",
    paymentPreference: "payment_preference",
    bankName: "bank_name",
    bankAccountNumber: "bank_account_number",
    bankAccountName: "bank_account_name",
    paystackPublicKey: "paystack_public_key",
    email: "email",
    address: "address",
    businessHours: "business_hours",
    mapEmbedUrl: "map_embed_url",
    socialLinks: "social_links",
    vision: "vision",
    mission: "mission",
  };

  const JSON_COLUMNS = new Set(["business_hours", "social_links"]);

  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;

  for (const [key, val] of Object.entries(body)) {
    const col = fieldMap[key];
    if (col) {
      sets.push(`${col} = $${i++}`);
      vals.push(
        JSON_COLUMNS.has(col) && val !== null ? JSON.stringify(val) : val,
      );
    }
  }
  if (!sets.length)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  vals.push(store.id);
  const rows = await query(
    `UPDATE stores SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
    vals,
  );

  await cacheDel(`store:${store.slug}`);

  return NextResponse.json({
    data: toCamel(rows[0] as Record<string, unknown>),
  });
}

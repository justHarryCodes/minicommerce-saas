// Shopper signs up to hear when a sold-out product / variant is back.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { toNgInternational } from "@/lib/phone";

const Schema = z.object({
  productId: z.string().uuid(),
  variantLabel: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const limited = await checkRateLimit(req, { key: "rl:stock-alert", max: 10, window: 600 });
  if (limited) return limited;

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Please check your details" }, { status: 422 });
  const d = parsed.data;
  const phone = d.phone ? toNgInternational(d.phone) : null;
  if (d.phone && !phone) return NextResponse.json({ error: "Enter a valid Nigerian phone number" }, { status: 422 });
  if (!phone && !d.email) return NextResponse.json({ error: "Enter your phone number or email" }, { status: 422 });

  const { slug } = await params;
  const product = await queryOne<{ id: string; store_id: string }>(
    `SELECT p.id, p.store_id FROM products p JOIN stores s ON s.id = p.store_id
     WHERE s.slug = $1 AND s.is_active = true AND p.id = $2 AND p.is_active = true`,
    [slug, d.productId]
  );
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  try {
    await query(
      `INSERT INTO stock_alerts (store_id, product_id, variant_label, customer_phone, customer_email)
       VALUES ($1, $2, $3, $4, $5)`,
      [product.store_id, product.id, d.variantLabel || null, phone, d.email || null]
    );
  } catch (err) {
    // Already subscribed (unique per pending subscriber) — that's fine.
    if ((err as { code?: string }).code !== "23505") throw err;
  }
  return NextResponse.json({ ok: true });
}
